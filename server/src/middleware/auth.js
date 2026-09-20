import jwt from 'jsonwebtoken';
import { config } from '../config.js';
import { getDb } from '../db/database.js';

export function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    const db = getDb();
    const user = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(403).json({ error: 'Usuário não encontrado.' });
    }

    req.user = user;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Token inválido ou expirado.' });
  }
}
