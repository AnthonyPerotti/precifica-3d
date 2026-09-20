import multer from 'multer';
import path from 'node:path';
import crypto from 'node:crypto';
import { config } from '../config.js';

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, config.uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const cleanBase = path.basename(file.originalname, ext).replace(/[^a-zA-Z0-9_-]/g, '_');
    const uniqueSuffix = crypto.randomBytes(4).toString('hex');
    cb(null, `${cleanBase}_${Date.now()}_${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const allowed = ['.stl', '.obj', '.gcode', '.3mf', '.step', '.stp', '.png', '.jpg', '.jpeg', '.webp'];
  if (allowed.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Formato de arquivo não suportado: ${ext}. Use .stl, .obj, .3mf, .gcode, .step ou imagens.`));
  }
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 150 * 1024 * 1024 // 150 MB max
  }
});
