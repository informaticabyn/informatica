import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../../data/database.sqlite');
const sqliteDb = new Database(dbPath);
// Instancia de la base de datos con logging de queries y errores
export const db = new Kysely({
    dialect: new SqliteDialect({ database: sqliteDb }),
    log: ['query', 'error']
});
console.log(`Database connected at ${dbPath}`);
