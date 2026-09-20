import path from 'node:path';
import fs from 'node:fs';
import dotenv from 'dotenv';

dotenv.config();

// Port specified by user requirement: 5172
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 5172;

// Host to listen on
const HOST = process.env.HOST || '0.0.0.0';

// Data directory resolution:
// In Docker container or when specified by env: e.g. /app/data or /DATA/AppData/precifica-3d
// In local dev from server directory: ../data or ./data
let DATA_DIR = process.env.DATA_DIR;
if (!DATA_DIR) {
  const localData = path.resolve(process.cwd(), 'data');
  const parentData = path.resolve(process.cwd(), '../data');
  DATA_DIR = fs.existsSync(localData) ? localData : parentData;
}

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const DB_PATH = path.join(DATA_DIR, 'precifica3d.sqlite');

const JWT_SECRET = process.env.JWT_SECRET || 'precifica-3d-local-secret-key-2026';

export const config = {
  port: PORT,
  host: HOST,
  dataDir: DATA_DIR,
  uploadsDir: UPLOADS_DIR,
  dbPath: DB_PATH,
  jwtSecret: JWT_SECRET
};
