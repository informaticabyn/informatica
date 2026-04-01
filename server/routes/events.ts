import { Router, Request, Response } from 'express';
import { db } from '../db.js';

const router = Router();

// Obtener todos los eventos - ordenados por fecha
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const events = await db
      .selectFrom('eventos')
      .select([
        'id',
        'titulo as title',
        'descripcion as description',
        'fecha as date',
        'hora as time',
        'ubicacion as location',
        'precio as price',
        'participantes_maximos as max_participants',
        'creado_por as created_by',
        'url_imagen as image_url',
        'creado_en as created_at',
        'actualizado_en as updated_at'
      ])
      .orderBy('fecha', 'asc')
      .execute();

    res.json(events);
  } catch (error) {
    console.error('Get events error:', error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});

// Get event with signup count and registered users
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const event = await db
      .selectFrom('eventos')
      .select([
        'id',
        'titulo as title',
        'descripcion as description',
        'fecha as date',
        'hora as time',
        'ubicacion as location',
        'precio as price',
        'participantes_maximos as max_participants',
        'creado_por as created_by',
        'url_imagen as image_url',
        'creado_en as created_at',
        'actualizado_en as updated_at'
      ])
      .where('id', '=', parseInt(id))
      .executeTakeFirst();

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    const signups = await db
      .selectFrom('signups')
      .innerJoin('users', 'users.id', 'signups.user_id')
      .select([
        'signups.id as signup_id',
        'signups.status',
        'signups.companions_count',
        'users.id as user_id',
        'users.name',
        'users.email'
      ])
      .where('signups.event_id', '=', parseInt(id))
      .where('signups.status', '=', 'approved')
      .orderBy('signups.created_at', 'asc')
      .execute();

    const approvedCount = signups.reduce((total, signup) => {
      return total + (1 + (signup.companions_count || 0));
    }, 0);

    res.json({
      ...event,
      approved_count: approvedCount,
      registered_users: signups
    });
  } catch (error) {
    console.error('Get event error:', error);
    res.status(500).json({ error: 'Failed to fetch event' });
  }
});

// Create event (admin only)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { title, description, date, time, location, price, max_participants, created_by, image_url, is_admin } = req.body;

    if (!is_admin) {
      res.status(403).json({ error: 'Only admins can create events' });
      return;
    }

    if (!title || !date || !time) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

     const event = await db
      .insertInto('eventos')
      .values({
        titulo: title,
        descripcion: description,
        fecha: date,
        hora: time,
        ubicacion: location,
        precio: price || 0,
        participantes_maximos: max_participants || 1,
        creado_por: created_by,
        url_imagen: image_url || null
      })
      .returning(['id', 'titulo', 'fecha', 'hora', 'ubicacion', 'precio', 'participantes_maximos', 'url_imagen'])
      .executeTakeFirst();

    res.status(201).json(event);
  } catch (error) {
    console.error('Create event error:', error);
    res.status(500).json({ error: 'Failed to create event' });
  }
});

// Update event (admin only)
router.put('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { title, description, date, time, location, price, max_participants, image_url, is_admin } = req.body;

    if (!is_admin) {
      res.status(403).json({ error: 'Only admins can update events' });
      return;
    }

     const event = await db
       .updateTable('eventos')
       .set({
         titulo: title,
         descripcion: description,
         fecha: date,
         hora: time,
         ubicacion: location,
         precio: price,
         participantes_maximos: max_participants,
         url_imagen: image_url || null,
         actualizado_en: new Date().toISOString()
       })
       .where('id', '=', parseInt(id))
       .returning('id')
       .executeTakeFirst();

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json(event);
  } catch (error) {
    console.error('Update event error:', error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Delete event (admin only)
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_admin } = req.body;

    if (!is_admin) {
      res.status(403).json({ error: 'Only admins can delete events' });
      return;
    }

     await db.deleteFrom('signups').where('event_id', '=', parseInt(id)).execute();

     const event = await db
       .deleteFrom('eventos')
       .where('id', '=', parseInt(id))
       .returning('id')
       .executeTakeFirst();

    if (!event) {
      res.status(404).json({ error: 'Event not found' });
      return;
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Delete event error:', error);
    res.status(500).json({ error: 'Failed to delete event' });
  }
});

export default router;
