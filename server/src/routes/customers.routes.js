import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

// List all customers
router.get('/', (req, res) => {
  const db = getDb();
  const { search } = req.query;

  let query = 'SELECT * FROM customers WHERE 1=1';
  const params = [];

  if (search) {
    query += ' AND (name LIKE ? OR document LIKE ? OR email LIKE ? OR phone LIKE ?)';
    params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
  }

  query += ' ORDER BY name ASC';
  const customers = db.prepare(query).all(...params);
  res.json(customers);
});

// Get single customer
router.get('/:id', (req, res) => {
  const db = getDb();
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id);
  if (!customer) return res.status(404).json({ error: 'Cliente não encontrado.' });
  res.json(customer);
});

// Create customer
router.post('/', (req, res) => {
  const db = getDb();
  const { name, phone, email, document, address, notes } = req.body;

  if (!name || !name.trim()) {
    return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });
  }

  const stmt = db.prepare(`
    INSERT INTO customers (name, phone, email, document, address, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name.trim(),
    phone || '',
    email || '',
    document || '',
    address || '',
    notes || ''
  );

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

// Update customer
router.put('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, phone, email, document, address, notes } = req.body;

  const current = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Cliente não encontrado.' });

  const stmt = db.prepare(`
    UPDATE customers SET
      name = COALESCE(?, name),
      phone = COALESCE(?, phone),
      email = COALESCE(?, email),
      document = COALESCE(?, document),
      address = COALESCE(?, address),
      notes = COALESCE(?, notes)
    WHERE id = ?
  `);

  stmt.run(name, phone, email, document, address, notes, id);
  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  res.json(updated);
});

// Delete customer
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM customers WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Cliente excluído com sucesso.' });
});

export default router;
