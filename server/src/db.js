import sqlite3 from 'sqlite3';
import pg from 'pg';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '..', 'marinmc.db');

export const isPostgres = !!process.env.DATABASE_URL;
let sqliteDb = null;
let pgPool = null;

const isVercel = !!process.env.VERCEL;

if (isPostgres) {
  console.log('[DB] Connecting to PostgreSQL database (Vercel/Cloud)...');
  pgPool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false // Required for Neon/Supabase in serverless
    }
  });
} else {
  const connectionPath = (isVercel && !process.env.DATABASE_URL) ? ':memory:' : dbPath;
  console.log('[DB] Connecting to SQLite database:', connectionPath);
  sqliteDb = new sqlite3.Database(connectionPath);
}

// Convert "?" placeholders to "$1", "$2" for PostgreSQL
function translateQuery(sql) {
  if (!isPostgres) return sql;
  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Helper to run SQL with Promises
export const dbRun = (sql, params = []) => {
  const translatedSql = translateQuery(sql);
  if (isPostgres) {
    return pgPool.query(translatedSql, params);
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.run(translatedSql, params, function (err) {
        if (err) reject(err);
        else resolve(this);
      });
    });
  }
};

// Helper to get single row
export const dbGet = (sql, params = []) => {
  const translatedSql = translateQuery(sql);
  if (isPostgres) {
    return pgPool.query(translatedSql, params).then(res => res.rows[0] || null);
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.get(translatedSql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }
};

// Helper to get all rows
export const dbAll = (sql, params = []) => {
  const translatedSql = translateQuery(sql);
  if (isPostgres) {
    return pgPool.query(translatedSql, params).then(res => res.rows);
  } else {
    return new Promise((resolve, reject) => {
      sqliteDb.all(translatedSql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
};

// Initialize Tables
export const initDb = async () => {
  console.log('[DB] Initializing database tables...');
  
  // 1. Users table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS users (
      username VARCHAR(100) PRIMARY KEY,
      total_play_time INTEGER DEFAULT 0,
      last_login TEXT
    )
  `);

  // 2. Cosmetics table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS cosmetics (
      username VARCHAR(100) PRIMARY KEY,
      skin_type VARCHAR(50) DEFAULT 'username',
      skin_val TEXT,
      cape_url TEXT DEFAULT '',
      FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
    )
  `);

  // 3. Play Sessions table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS sessions (
      id VARCHAR(50) PRIMARY KEY,
      username VARCHAR(100),
      date TEXT,
      duration TEXT,
      server VARCHAR(100),
      FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
    )
  `);

  // 4. Contacts (Friends list) table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS contacts (
      username VARCHAR(100),
      contact_id VARCHAR(100),
      name VARCHAR(100),
      avatar TEXT,
      status VARCHAR(50) DEFAULT 'offline',
      last_message TEXT,
      time TEXT,
      type VARCHAR(50) DEFAULT 'dm',
      unread INTEGER DEFAULT 0,
      favorite INTEGER DEFAULT 0,
      PRIMARY KEY (username, contact_id),
      FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
    )
  `);

  // 5. Messages table
  await dbRun(`
    CREATE TABLE IF NOT EXISTS messages (
      id VARCHAR(50) PRIMARY KEY,
      username VARCHAR(100),
      contact_id VARCHAR(100),
      sender VARCHAR(100),
      content TEXT,
      time TEXT,
      is_self INTEGER DEFAULT 0,
      file_name VARCHAR(255),
      file_size VARCHAR(50),
      is_image INTEGER DEFAULT 0,
      voice_duration VARCHAR(50),
      FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
    )
  `);

  console.log('[DB] Database tables successfully initialized.');
};

let dbInitialized = false;
export const ensureDbInitialized = async () => {
  if (!dbInitialized) {
    await initDb();
    dbInitialized = true;
  }
};
