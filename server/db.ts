import { Kysely, SqliteDialect } from 'kysely';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../data/database.sqlite');

// Tabla de usuarios: almacena información de los usuarios del sistema
interface UserTable {
  id: number;
  email: string;
  password: string;
  name: string;
  is_admin: number;
  is_active: number;
  created_at: string;
  updated_at: string;
  profile_image_url: string | null;
}

// Tabla de eventos: almacena información sobre los eventos
interface EventTable {
  id: number;
  titulo: string;
  descripcion: string | null;
  fecha: string;
  hora: string;
  ubicacion: string | null;
  precio: number;
  participantes_maximos: number;
  creado_por: number;
  url_imagen: string | null;
  creado_en: string;
  actualizado_en: string;
}

// Tabla de inscripciones: almacena las inscripciones de usuarios a eventos
interface SignupTable {
  id: number;
  user_id: number;
  event_id: number;
  status: string;
  companions_count: number;
  created_at: string;
  updated_at: string;
}

// Tabla de tokens de reseteo: almacena tokens para resetear contraseñas
interface PasswordResetTokenTable {
  id: number;
  user_id: number;
  token: string;
  expires_at: string;
  created_at: string;
}

// Esquema de la base de datos: define todas las tablas
interface DatabaseSchema {
  users: UserTable;
  eventos: EventTable;
  signups: SignupTable;
  password_reset_tokens: PasswordResetTokenTable;
}

const sqliteDb = new Database(dbPath);

// Instancia de la base de datos con logging de queries y errores
export const db = new Kysely<DatabaseSchema>({
  dialect: new SqliteDialect({ database: sqliteDb }),
  log: ['query', 'error']
});

console.log(`Database connected at ${dbPath}`);
