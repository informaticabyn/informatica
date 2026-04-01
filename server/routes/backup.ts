import express from 'express';
import fs from 'fs';
import path from 'path';
import archiver from 'archiver';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

/**
 * GET /api/backup/download
 * Downloads a complete backup of the project including all files and the database
 * Returns a ZIP file with all source code, configuration, and database.sqlite
 */
router.get('/download', (req, res): void => {
  try {
    const projectRoot = path.join(__dirname, '../../');
    
    // Create archive
    const archive = archiver('zip', { zlib: { level: 9 } });
    
    // Set response headers for download
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', 'attachment; filename="project-backup.zip"');
    
    // Pipe archive to response
    archive.pipe(res);
    
    // Files and directories to include in backup
    const itemsToBackup = [
      { path: 'client', type: 'directory' },
      { path: 'server', type: 'directory' },
      { path: 'scripts', type: 'directory' },
      { path: 'data/database.sqlite', type: 'file' },
      { path: 'data/uploads', type: 'directory' },
      { path: 'package.json', type: 'file' },
      { path: 'package-lock.json', type: 'file' },
      { path: 'tsconfig.json', type: 'file' },
      { path: 'tsconfig.server.json', type: 'file' },
      { path: 'vite.config.js', type: 'file' },
      { path: 'tailwind.config.js', type: 'file' },
      { path: 'postcss.config.js', type: 'file' },
      { path: 'components.json', type: 'file' },
      { path: '.env.example', type: 'file' },
    ];
    
    // Add each item to archive
    itemsToBackup.forEach((item) => {
      const fullPath = path.join(projectRoot, item.path);
      
      if (!fs.existsSync(fullPath)) {
        console.log(`Warning: ${item.path} not found, skipping`);
        return;
      }
      
      if (item.type === 'directory') {
        archive.directory(fullPath, item.path);
      } else if (item.type === 'file') {
        archive.file(fullPath, { name: item.path });
      }
    });
    
    // Create a README for the backup
    const readmeContent = `# Project Backup

This backup contains all your project files and database created on ${new Date().toISOString()}.

## Contents
- client/ - React frontend source code
- server/ - Express backend source code
- scripts/ - Development scripts
- data/database.sqlite - Your SQLite database
- data/uploads/ - User uploaded files
- Configuration files (package.json, tsconfig.json, vite.config.js, etc.)

## How to Restore
1. Extract this ZIP file
2. Run: npm install
3. Create a .env file with your configuration (see .env.example)
4. Run: npm start (for development) or npm run build && node dist/server/index.js (for production)

## Database
The database.sqlite file contains all your data (users, events, signups, etc.)

## Support
For more information, see the project documentation.
`;
    
    archive.append(readmeContent, { name: 'BACKUP_README.md' });
    
    archive.finalize();
    
    console.log('Backup download initiated');
  } catch (error) {
    console.error('Backup download error:', error);
    res.status(500).json({ error: 'Failed to create backup' });
  }
});

export default router;
