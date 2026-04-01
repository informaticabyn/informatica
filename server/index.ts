import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { setupStaticServing } from './static-serve.js';
import authRoutes from './routes/auth.js';
import eventsRoutes from './routes/events.js';
import signupsRoutes from './routes/signups.js';
import usersRoutes from './routes/users.js';
import backupRoutes from './routes/backup.js';

dotenv.config();

const app = express();

// Middleware para parsear JSON y formularios - con límite aumentado para carga de imágenes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Sirvir archivos cargados por usuarios (imágenes de eventos, perfiles, etc.)
app.use('/uploads', express.static(path.join(process.cwd(), 'data', 'uploads')));

// Rutas de la API
app.use('/api/auth', authRoutes);           // Autenticación: login, registro, reseteo de contraseña
app.use('/api/events', eventsRoutes);       // Gestión de eventos: crear, editar, eliminar, listar
app.use('/api/signups', signupsRoutes);     // Inscripciones a eventos: apuntar, cancelar, listar
app.use('/api/users', usersRoutes);         // Gestión de usuarios: permisos, perfiles, eliminar
app.use('/api/backup', backupRoutes);       // Backup: descargar copia completa del proyecto

// Función para iniciar el servidor
export async function startServer(port) {
  try {
    // En producción, servir archivos estáticos del frontend
    if (process.env.NODE_ENV === 'production') {
      setupStaticServing(app);
    }

    app.listen(port, () => {
      console.log(`API Server running on port ${port}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Iniciar servidor si este archivo se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting server...');
  startServer(process.env.PORT || 3001);
}
