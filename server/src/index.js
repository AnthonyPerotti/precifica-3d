import express from 'express';
import cors from 'cors';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { config } from './config.js';
import { getDb } from './db/database.js';

import authRoutes from './routes/auth.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import calculatorRoutes from './routes/calculator.routes.js';
import productsRoutes from './routes/products.routes.js';
import ordersRoutes from './routes/orders.routes.js';
import financialRoutes from './routes/financial.routes.js';
import customersRoutes from './routes/customers.routes.js';
import backupRoutes from './routes/backup.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize database immediately on server startup
getDb();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '60mb' }));
app.use(express.urlencoded({ extended: true, limit: '60mb' }));

// Serve uploaded models and images statically
app.use('/uploads', express.static(config.uploadsDir));
const localUploads = path.resolve(process.cwd(), 'uploads');
if (fs.existsSync(localUploads) && localUploads !== config.uploadsDir) {
  app.use('/uploads', express.static(localUploads));
}
const serverUploads = path.resolve(__dirname, '../uploads');
if (fs.existsSync(serverUploads) && serverUploads !== config.uploadsDir) {
  app.use('/uploads', express.static(serverUploads));
}

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/calculator', calculatorRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/customers', customersRoutes);
app.use('/api/financial', financialRoutes);
app.use('/api/backup', backupRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    app: 'Precifica 3D',
    version: '1.0.0',
    port: config.port,
    dataDir: config.dataDir
  });
});

// Serve frontend static build if present (e.g. in production or container)
const clientDistPaths = [
  path.resolve(__dirname, '../../client/dist'),
  path.resolve(__dirname, '../public'),
  path.resolve(process.cwd(), 'client/dist'),
  path.resolve(process.cwd(), 'public')
];

let clientDistPath = clientDistPaths.find(p => fs.existsSync(p));

if (clientDistPath) {
  app.use(express.static(clientDistPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/uploads')) {
      return next();
    }
    res.sendFile(path.join(clientDistPath, 'index.html'));
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('[Precifica 3D Error]', err);
  res.status(err.status || 500).json({
    error: err.message || 'Ocorreu um erro interno no servidor.'
  });
});

app.listen(config.port, config.host, () => {
  console.log(`=======================================================`);
  console.log(`  Precifica 3D - Servidor iniciado com sucesso!`);
  console.log(`  URL Local:   http://localhost:${config.port}`);
  console.log(`  Porta:       ${config.port}`);
  console.log(`  Dados:       ${config.dataDir}`);
  console.log(`=======================================================`);
});
