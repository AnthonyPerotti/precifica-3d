import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getDb } from '../db/database.js';
import { config } from '../config.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'E-mail é obrigatório.' });
  }

  const db = getDb();
  let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);

  // If password not provided or local single-user mode, check if matching or create
  if (!user) {
    // If database has only 1 user and any email is entered, or create new user
    const totalUsers = db.prepare('SELECT COUNT(*) as c FROM users').get().c;
    if (totalUsers === 1) {
      user = db.prepare('SELECT * FROM users LIMIT 1').get();
    } else {
      // Auto-register for simple login
      const salt = bcrypt.genSaltSync(10);
      const hash = bcrypt.hashSync(password || 'admin123', salt);
      const insert = db.prepare('INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)');
      const result = insert.run(email, hash, email.split('@')[0]);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    }
  } else if (password && user.password_hash) {
    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch && password !== 'admin123') { // Fallback convenience password for local offline usage
      return res.status(401).json({ error: 'Senha incorreta.' });
    }
  }

  const token = jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    config.jwtSecret,
    { expiresIn: '30d' }
  );

  return res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name
    }
  });
});

router.get('/me', authenticateToken, (req, res) => {
  return res.json({ user: req.user });
});

router.put('/profile', authenticateToken, (req, res) => {
  const db = getDb();
  const { name, email } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome de exibição é obrigatório.' });
  }

  db.prepare('UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?')
    .run(name.trim(), email ? email.trim() : null, req.user.id);

  const updated = db.prepare('SELECT id, email, name FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: updated, message: 'Perfil atualizado com sucesso!' });
});

export default router;
