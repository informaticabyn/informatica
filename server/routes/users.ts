import { Router, Request, Response } from 'express';
import { db } from '../db.js';
import fs from 'fs';
import path from 'path';
import multer from 'multer';

const router = Router();

// Configurar multer para carga de imágenes de perfil
const uploadDir = path.join(process.cwd(), 'data', 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now();
    const ext = path.extname(file.originalname);
    cb(null, `profile-${timestamp}${ext}`);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Obtener todos los usuarios (solo administrador)
router.get('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { is_admin } = req.query;

    if (!is_admin) {
      res.status(403).json({ error: 'Only admins can view users' });
      return;
    }

    const users = await db
      .selectFrom('users')
      .select(['id', 'name', 'email', 'is_admin', 'is_active', 'created_at', 'profile_image_url'])
      .orderBy('created_at', 'asc')
      .execute();

    res.json(users);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Create new user (admin only)
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { is_admin } = req.query;
    const { email, password, name } = req.body;

    if (!is_admin) {
      res.status(403).json({ error: 'Only admins can create users' });
      return;
    }

    if (!email || !password || !name) {
      res.status(400).json({ error: 'Missing required fields' });
      return;
    }

    const user = await db
      .insertInto('users')
      .values({
        email,
        password,
        name,
        is_admin: 0,
        is_active: 1,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .returning(['id', 'name', 'email', 'is_admin', 'is_active'])
      .executeTakeFirst();

    if (!user) {
      res.status(500).json({ error: 'Failed to create user' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// Update user role (admin only)
router.patch('/:id/role', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_admin, current_admin } = req.body;

    if (!current_admin) {
      res.status(403).json({ error: 'Only admins can update user role' });
      return;
    }

    const user = await db
      .updateTable('users')
      .set({
        is_admin: is_admin ? 1 : 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'email', 'is_admin', 'is_active'])
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Update role error:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// Update user status (admin only)
router.patch('/:id/status', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_active, current_admin } = req.body;

    if (!current_admin) {
      res.status(403).json({ error: 'Only admins can update user status' });
      return;
    }

    const user = await db
      .updateTable('users')
      .set({
        is_active: is_active ? 1 : 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'email', 'is_admin', 'is_active'])
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Update status error:', error);
    res.status(500).json({ error: 'Failed to update user status' });
  }
});

// Promote user to admin (admin only) - DEPRECATED
router.patch('/:id/promote', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_admin } = req.body;

    if (!is_admin) {
      res.status(403).json({ error: 'Only admins can promote users' });
      return;
    }

    const user = await db
      .updateTable('users')
      .set({
        is_admin: 1,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'email', 'is_admin', 'is_active'])
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Promote user error:', error);
    res.status(500).json({ error: 'Failed to promote user' });
  }
});

// Demote user from admin (admin only) - DEPRECATED
router.patch('/:id/demote', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { is_admin } = req.body;

    if (!is_admin) {
      res.status(403).json({ error: 'Only admins can demote users' });
      return;
    }

    const user = await db
      .updateTable('users')
      .set({
        is_admin: 0,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'email', 'is_admin', 'is_active'])
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Demote user error:', error);
    res.status(500).json({ error: 'Failed to demote user' });
  }
});

// Delete user (admin only)
router.delete('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { current_admin } = req.body;

    if (!current_admin) {
      res.status(403).json({ error: 'Only admins can delete users' });
      return;
    }

    const result = await db
      .deleteFrom('users')
      .where('id', '=', parseInt(id))
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Update user profile image (admin only)
router.patch('/:id/profile-image', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { profile_image_url, current_admin } = req.body;

    if (!current_admin) {
      res.status(403).json({ error: 'Only admins can update user profile image' });
      return;
    }

    const user = await db
      .updateTable('users')
      .set({
        profile_image_url,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'email', 'profile_image_url'])
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    res.json(user);
  } catch (error) {
    console.error('Update profile image error:', error);
    res.status(500).json({ error: 'Failed to update profile image' });
  }
});

// Update user profile (name) - user can update their own profile
router.patch('/:id/profile', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const user = await db
      .updateTable('users')
      .set({
        name: name.trim(),
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'email', 'is_admin', 'is_active'])
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('User profile updated:', user.id);
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Upload profile image - user can upload their own profile image
router.post('/:id/profile-image', upload.single('file'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    if (!req.file) {
      res.status(400).json({ error: 'No file provided' });
      return;
    }

    const imageUrl = `/uploads/${req.file.filename}`;

    const user = await db
      .updateTable('users')
      .set({
        profile_image_url: imageUrl,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'email', 'profile_image_url'])
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('Profile image uploaded for user:', user.id);
    res.json(user);
  } catch (error) {
    console.error('Upload profile image error:', error);
    res.status(500).json({ error: 'Failed to upload profile image' });
  }
});

// Change user password
router.patch('/:id/password', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { current_password, new_password } = req.body;

    if (!current_password || !new_password) {
      res.status(400).json({ error: 'Current and new password are required' });
      return;
    }

    if (new_password.length < 6) {
      res.status(400).json({ error: 'Password must be at least 6 characters' });
      return;
    }

    // Get the user to verify current password
    const user = await db
      .selectFrom('users')
      .select(['id', 'password'])
      .where('id', '=', parseInt(id))
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify current password (simple string comparison, in production use bcrypt)
    if (user.password !== current_password) {
      res.status(401).json({ error: 'Current password is incorrect' });
      return;
    }

    // Update password
    const updatedUser = await db
      .updateTable('users')
      .set({
        password: new_password,
        updated_at: new Date().toISOString()
      })
      .where('id', '=', parseInt(id))
      .returning(['id', 'name', 'email'])
      .executeTakeFirst();

    if (!updatedUser) {
      res.status(500).json({ error: 'Failed to update password' });
      return;
    }

    console.log('User password changed:', updatedUser.id);
    res.json({ message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// Update profile (name and photo) - user can update their own profile
router.put('/profile', upload.single('photo'), async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, name } = req.body;

    if (!user_id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }

    const updateData: any = {
      name: name.trim(),
      updated_at: new Date().toISOString()
    };

    if (req.file) {
      updateData.profile_image_url = `/uploads/${req.file.filename}`;
    }

    const user = await db
      .updateTable('users')
      .set(updateData)
      .where('id', '=', user_id)
      .returning(['id', 'name', 'email', 'is_admin', 'profile_image_url'])
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('User profile updated:', user.id);
    res.json(user);
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// Delete account - user can delete their own account
router.delete('/delete-account', async (req: Request, res: Response): Promise<void> => {
  try {
    const { user_id, password } = req.body;

    if (!user_id) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    if (!password) {
      res.status(400).json({ error: 'Password is required' });
      return;
    }

    // Get the user to verify password
    const user = await db
      .selectFrom('users')
      .select(['id', 'password'])
      .where('id', '=', user_id)
      .executeTakeFirst();

    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    // Verify password
    if (user.password !== password) {
      res.status(401).json({ error: 'Password is incorrect' });
      return;
    }

    // Delete the user
    const result = await db
      .deleteFrom('users')
      .where('id', '=', user_id)
      .executeTakeFirst();

    if (result.numDeletedRows === 0n) {
      res.status(404).json({ error: 'User not found' });
      return;
    }

    console.log('User account deleted:', user_id);
    res.json({ message: 'Account deleted successfully' });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ error: 'Failed to delete account' });
  }
});

export default router;
