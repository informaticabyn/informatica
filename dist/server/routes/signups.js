import { Router } from 'express';
import { db } from '../db.js';
import { sendEventSignupConfirmationEmail } from '../email.js';
const router = Router();
// Obtener todas las inscripciones de un usuario
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const signups = await db
            .selectFrom('signups')
            .innerJoin('eventos', 'eventos.id', 'signups.event_id')
            .select([
            'signups.id',
            'signups.status',
            'signups.created_at',
            'eventos.id as event_id',
            'eventos.titulo as title',
            'eventos.fecha as date',
            'eventos.hora as time',
            'eventos.precio as price'
        ])
            .where('signups.user_id', '=', parseInt(userId))
            .orderBy('eventos.fecha', 'desc')
            .execute();
        res.json(signups);
    }
    catch (error) {
        console.error('Get signups error:', error);
        res.status(500).json({ error: 'Failed to fetch signups' });
    }
});
// Obtener inscripciones de un evento (solo administrador)
router.get('/event/:eventId', async (req, res) => {
    try {
        const { eventId } = req.params;
        const { is_admin } = req.query;
        if (!is_admin) {
            res.status(403).json({ error: 'Only admins can view signups' });
            return;
        }
        const signups = await db
            .selectFrom('signups')
            .innerJoin('users', 'users.id', 'signups.user_id')
            .select([
            'signups.id',
            'signups.status',
            'signups.companions_count',
            'signups.created_at',
            'users.id as user_id',
            'users.name',
            'users.email'
        ])
            .where('signups.event_id', '=', parseInt(eventId))
            .orderBy('signups.created_at', 'asc')
            .execute();
        res.json(signups);
    }
    catch (error) {
        console.error('Get event signups error:', error);
        res.status(500).json({ error: 'Failed to fetch signups' });
    }
});
// Crear inscripcion a un evento (solicitada por usuario)
router.post('/', async (req, res) => {
    try {
        const { user_id, event_id, companions_count = 0 } = req.body;
        if (!user_id || !event_id) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        const event = await db
            .selectFrom('eventos')
            .selectAll()
            .where('id', '=', event_id)
            .executeTakeFirst();
        if (!event) {
            res.status(404).json({ error: 'Event not found' });
            return;
        }
        // Obtener datos del usuario
        const user = await db
            .selectFrom('users')
            .select(['id', 'name', 'email'])
            .where('id', '=', user_id)
            .executeTakeFirst();
        if (!user) {
            res.status(404).json({ error: 'User not found' });
            return;
        }
        // Contar inscripciones aprobadas incluyendo acompanantes
        const approvedCount = await db
            .selectFrom('signups')
            .select(db.fn.sum('companions_count').as('companions_total'))
            .where('event_id', '=', event_id)
            .where('status', '=', 'approved')
            .executeTakeFirst();
        const companionsTotal = approvedCount?.companions_total || 0;
        const currentApprovedUsers = await db
            .selectFrom('signups')
            .select(db.fn.count('id').as('count'))
            .where('event_id', '=', event_id)
            .where('status', '=', 'approved')
            .executeTakeFirst();
        const currentApprovedCount = (currentApprovedUsers?.count || 0) + companionsTotal;
        // Los usuarios se aprueban automaticamente (no en espera)
        let status = 'approved';
        if (currentApprovedCount + (companions_count + 1) > event.participantes_maximos) {
            status = 'waitlist';
        }
        const signup = await db
            .insertInto('signups')
            .values({
            user_id,
            event_id,
            status,
            companions_count
        })
            .returning(['id', 'status', 'companions_count', 'created_at'])
            .executeTakeFirst();
        // Generar numero de confirmacion
        const confirmationNumber = `EV${event_id}-SU${signup?.id}-${Date.now().toString().slice(-6)}`;
        // Enviar email de confirmacion solo si fue aprobado
        if (status === 'approved' && signup) {
            try {
                await sendEventSignupConfirmationEmail(user.email, user.name, event.titulo, event.fecha, event.hora, event.ubicacion, confirmationNumber, companions_count);
                console.log(`Confirmation email sent for signup ${signup.id}`);
            }
            catch (emailError) {
                console.error('Failed to send confirmation email:', emailError);
            }
        }
        res.status(201).json({ ...signup, confirmation_number: confirmationNumber });
    }
    catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(409).json({ error: 'Already signed up for this event' });
        }
        else {
            console.error('Create signup error:', error);
            res.status(500).json({ error: 'Failed to create signup' });
        }
    }
});
// Aprobar inscripcion (solo administrador)
router.patch('/:id/approve', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_admin } = req.body;
        if (!is_admin) {
            res.status(403).json({ error: 'Only admins can approve signups' });
            return;
        }
        const signup = await db
            .updateTable('signups')
            .set({
            status: 'approved',
            updated_at: new Date().toISOString()
        })
            .where('id', '=', parseInt(id))
            .returning(['id', 'status'])
            .executeTakeFirst();
        if (!signup) {
            res.status(404).json({ error: 'Signup not found' });
            return;
        }
        res.json(signup);
    }
    catch (error) {
        console.error('Approve signup error:', error);
        res.status(500).json({ error: 'Failed to approve signup' });
    }
});
// Rechazar inscripcion (solo administrador)
router.patch('/:id/reject', async (req, res) => {
    try {
        const { id } = req.params;
        const { is_admin } = req.body;
        if (!is_admin) {
            res.status(403).json({ error: 'Only admins can reject signups' });
            return;
        }
        const signup = await db
            .updateTable('signups')
            .set({
            status: 'rejected',
            updated_at: new Date().toISOString()
        })
            .where('id', '=', parseInt(id))
            .returning(['id', 'status'])
            .executeTakeFirst();
        if (!signup) {
            res.status(404).json({ error: 'Signup not found' });
            return;
        }
        res.json(signup);
    }
    catch (error) {
        console.error('Reject signup error:', error);
        res.status(500).json({ error: 'Failed to reject signup' });
    }
});
// Cancelar inscripcion (usuario puede cancelar la suya o admin puede eliminar cualquiera)
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id, is_admin } = req.body;
        const signup = await db
            .selectFrom('signups')
            .select('user_id')
            .where('id', '=', parseInt(id))
            .executeTakeFirst();
        if (!signup) {
            res.status(404).json({ error: 'Signup not found' });
            return;
        }
        // Permitir eliminacion si el usuario elimina su inscripcion o si es administrador
        if (signup.user_id !== user_id && !is_admin) {
            res.status(403).json({ error: 'Can only delete your own signups' });
            return;
        }
        await db.deleteFrom('signups').where('id', '=', parseInt(id)).execute();
        res.json({ success: true });
    }
    catch (error) {
        console.error('Cancel signup error:', error);
        res.status(500).json({ error: 'Failed to cancel signup' });
    }
});
export default router;
