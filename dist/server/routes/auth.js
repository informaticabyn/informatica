import { Router } from 'express';
import { db } from '../db.js';
import bcrypt from 'bcryptjs';
import { sendPasswordResetEmail } from '../email.js';
import crypto from 'crypto';
const router = Router();
// Registro de nuevos usuarios
// El primer usuario registrado automáticamente se convierte en administrador
router.post('/register', async (req, res) => {
    try {
        const { email, name, password } = req.body;
        if (!email || !name || !password) {
            res.status(400).json({ error: 'Missing required fields' });
            return;
        }
        // Comprobar si este es el primer usuario para hacerlo administrador
        const userCount = await db
            .selectFrom('users')
            .select(db.fn.count('id').as('count'))
            .executeTakeFirst();
        const isFirstUser = (userCount?.count || 0) === 0;
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await db
            .insertInto('users')
            .values({
            email,
            name,
            password: hashedPassword,
            is_admin: isFirstUser ? 1 : 0
        })
            .returning(['id', 'email', 'name', 'is_admin'])
            .executeTakeFirst();
        res.status(201).json({
            id: user?.id,
            email: user?.email,
            name: user?.name,
            is_admin: user?.is_admin === 1
        });
    }
    catch (error) {
        if (error.message.includes('UNIQUE constraint failed')) {
            res.status(409).json({ error: 'Email already registered' });
        }
        else {
            console.error('Register error:', error);
            res.status(500).json({ error: 'Registration failed' });
        }
    }
});
// Login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            res.status(400).json({ error: 'Missing email or password' });
            return;
        }
        const user = await db
            .selectFrom('users')
            .select(['id', 'name', 'email', 'is_admin', 'password'])
            .where('email', '=', email)
            .executeTakeFirst();
        if (!user) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            res.status(401).json({ error: 'Invalid credentials' });
            return;
        }
        res.json({
            id: user.id,
            name: user.name,
            email: user.email,
            is_admin: user.is_admin === 1
        });
    }
    catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Login failed' });
    }
});
// Forgot Password - Request reset token
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            res.status(400).json({ error: 'Email is required' });
            return;
        }
        const user = await db
            .selectFrom('users')
            .select(['id', 'email', 'name'])
            .where('email', '=', email)
            .executeTakeFirst();
        if (!user) {
            // For security, don't reveal if email exists
            res.json({ message: 'If email exists, instructions have been sent' });
            return;
        }
        // Generate a secure token
        const resetToken = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour
        // Store token in database
        await db
            .insertInto('password_reset_tokens')
            .values({
            user_id: user.id,
            token: resetToken,
            expires_at: expiresAt
        })
            .execute();
        // Send email
        try {
            await sendPasswordResetEmail(user.email, user.name, resetToken);
            console.log(`Password reset email sent to ${user.email}`);
        }
        catch (emailError) {
            console.error('Email sending failed:', emailError);
            // Still return success to user for security, but log the error
        }
        res.json({ message: 'If email exists, instructions have been sent' });
    }
    catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ error: 'Failed to process request' });
    }
});
// Verify reset token
router.post('/verify-reset-token', async (req, res) => {
    try {
        const { token } = req.body;
        if (!token) {
            res.status(400).json({ error: 'Token is required' });
            return;
        }
        const resetToken = await db
            .selectFrom('password_reset_tokens')
            .select(['id', 'user_id', 'expires_at'])
            .where('token', '=', token)
            .executeTakeFirst();
        if (!resetToken) {
            res.status(400).json({ error: 'Invalid or expired token' });
            return;
        }
        const expiresAt = new Date(resetToken.expires_at);
        if (expiresAt < new Date()) {
            res.status(400).json({ error: 'Token has expired' });
            return;
        }
        res.json({ valid: true, userId: resetToken.user_id });
    }
    catch (error) {
        console.error('Verify token error:', error);
        res.status(500).json({ error: 'Failed to verify token' });
    }
});
// Reset password
router.post('/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        if (!token || !newPassword) {
            res.status(400).json({ error: 'Token and password are required' });
            return;
        }
        const resetToken = await db
            .selectFrom('password_reset_tokens')
            .select(['id', 'user_id', 'expires_at'])
            .where('token', '=', token)
            .executeTakeFirst();
        if (!resetToken) {
            res.status(400).json({ error: 'Invalid or expired token' });
            return;
        }
        const expiresAt = new Date(resetToken.expires_at);
        if (expiresAt < new Date()) {
            res.status(400).json({ error: 'Token has expired' });
            return;
        }
        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        // Update user password
        await db
            .updateTable('users')
            .set({ password: hashedPassword, updated_at: new Date().toISOString() })
            .where('id', '=', resetToken.user_id)
            .execute();
        // Delete the used token
        await db
            .deleteFrom('password_reset_tokens')
            .where('id', '=', resetToken.id)
            .execute();
        res.json({ message: 'Password has been reset successfully' });
    }
    catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ error: 'Failed to reset password' });
    }
});
export default router;
