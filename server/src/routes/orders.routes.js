import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

// List all orders (supports period and search filtering)
router.get('/', (req, res) => {
  const db = getDb();
  const { period, search, status } = req.query;

  let query = `
    SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE 1=1
  `;
  const params = [];

  if (search) {
    query += ` AND (o.code LIKE ? OR c.name LIKE ? OR o.notes LIKE ?)`;
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }

  if (status) {
    query += ` AND o.status = ?`;
    params.push(status);
  }

  if (period === '30') {
    query += ` AND o.created_at >= datetime('now', '-30 days')`;
  } else if (period === '7') {
    query += ` AND o.created_at >= datetime('now', '-7 days')`;
  } else if (period === 'today') {
    query += ` AND date(o.created_at) = date('now')`;
  }

  query += ` ORDER BY o.id DESC`;

  const orders = db.prepare(query).all(...params);

  const formatted = orders.map(o => ({
    ...o,
    items: safeJsonParse(o.items_json, [])
  }));

  // Organize by Kanban columns for easy frontend consumption
  const kanban = {
    proposta: formatted.filter(o => o.status === 'proposta'),
    fila: formatted.filter(o => o.status === 'fila'),
    em_producao: formatted.filter(o => o.status === 'em_producao'),
    finalizado: formatted.filter(o => o.status === 'finalizado')
  };

  res.json({
    orders: formatted,
    kanban
  });
});

// Get single order
router.get('/:id', (req, res) => {
  const db = getDb();
  const order = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.address as customer_address, c.document as customer_document
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `).get(req.params.id);

  if (!order) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  res.json({
    ...order,
    items: safeJsonParse(order.items_json, [])
  });
});

// Create new order
router.post('/', (req, res) => {
  const db = getDb();
  const {
    customer_name,
    customer_phone,
    customer_email,
    customer_id,
    status,
    payment_status,
    payment_method,
    validity_days,
    delivery_method,
    notes,
    discount_pct,
    discount_value,
    subtotal,
    total,
    estimated_cost,
    estimated_net_profit,
    due_date,
    items
  } = req.body;

  // 1. Resolve or create customer
  let effectiveCustomerId = customer_id;
  if (!effectiveCustomerId && customer_name) {
    let existing = db.prepare('SELECT id FROM customers WHERE name = ? LIMIT 1').get(customer_name);
    if (!existing && customer_email) {
      existing = db.prepare('SELECT id FROM customers WHERE email = ? LIMIT 1').get(customer_email);
    }

    if (existing) {
      effectiveCustomerId = existing.id;
    } else {
      const ins = db.prepare('INSERT INTO customers (name, phone, email) VALUES (?, ?, ?)');
      const res = ins.run(customer_name, customer_phone || '', customer_email || '');
      effectiveCustomerId = res.lastInsertRowid;
    }
  }

  // 2. Generate unique order code: PED-YYMMDDHHMMSS
  const now = new Date();
  const pad = n => String(n).padStart(2, '0');
  const code = `PED-${now.getFullYear().toString().slice(-2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;

  const stmt = db.prepare(`
    INSERT INTO orders (
      code, customer_id, status, payment_status, payment_method,
      validity_days, delivery_method, notes, discount_pct, discount_value,
      subtotal, total, estimated_cost, estimated_net_profit, due_date, items_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    code,
    effectiveCustomerId || null,
    status || 'proposta',
    payment_status || 'pendente',
    payment_method || 'PIX',
    validity_days || 30,
    delivery_method || 'A combinar',
    notes || '',
    discount_pct || 0,
    discount_value || 0,
    subtotal || 0,
    total || 0,
    estimated_cost || 0,
    estimated_net_profit || 0,
    due_date || null,
    JSON.stringify(items || [])
  );

  const created = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `).get(result.lastInsertRowid);

  res.status(201).json({
    ...created,
    items: safeJsonParse(created.items_json, [])
  });
});

// Update order status directly (Kanban drag-and-drop)
router.patch('/:id/status', (req, res) => {
  const db = getDb();
  const { status } = req.body;

  if (!['proposta', 'fila', 'em_producao', 'finalizado'].includes(status)) {
    return res.status(400).json({ error: 'Status de pedido inválido.' });
  }

  const stmt = db.prepare(`
    UPDATE orders SET
      status = ?,
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `);
  stmt.run(status, req.params.id);

  res.json({ success: true, status, message: 'Status atualizado com sucesso.' });
});

// Update order
router.put('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const current = db.prepare('SELECT * FROM orders WHERE id = ?').get(id);

  if (!current) {
    return res.status(404).json({ error: 'Pedido não encontrado.' });
  }

  const {
    status,
    payment_status,
    payment_method,
    validity_days,
    delivery_method,
    notes,
    discount_pct,
    discount_value,
    subtotal,
    total,
    estimated_cost,
    estimated_net_profit,
    due_date,
    items
  } = req.body;

  const stmt = db.prepare(`
    UPDATE orders SET
      status = COALESCE(?, status),
      payment_status = COALESCE(?, payment_status),
      payment_method = COALESCE(?, payment_method),
      validity_days = COALESCE(?, validity_days),
      delivery_method = COALESCE(?, delivery_method),
      notes = COALESCE(?, notes),
      discount_pct = COALESCE(?, discount_pct),
      discount_value = COALESCE(?, discount_value),
      subtotal = COALESCE(?, subtotal),
      total = COALESCE(?, total),
      estimated_cost = COALESCE(?, estimated_cost),
      estimated_net_profit = COALESCE(?, estimated_net_profit),
      due_date = COALESCE(?, due_date),
      items_json = COALESCE(?, items_json),
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `);

  stmt.run(
    status,
    payment_status,
    payment_method,
    validity_days,
    delivery_method,
    notes,
    discount_pct,
    discount_value,
    subtotal,
    total,
    estimated_cost,
    estimated_net_profit,
    due_date,
    items !== undefined ? JSON.stringify(items) : null,
    id
  );

  const updated = db.prepare(`
    SELECT o.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE o.id = ?
  `).get(id);

  res.json({
    ...updated,
    items: safeJsonParse(updated.items_json, [])
  });
});

// Delete order
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM orders WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Pedido excluído com sucesso.' });
});

// Customers CRUD
router.get('/customers/list', (req, res) => {
  const db = getDb();
  const customers = db.prepare('SELECT * FROM customers ORDER BY name ASC').all();
  res.json(customers);
});

router.post('/customers', (req, res) => {
  const db = getDb();
  const { name, phone, email, document, address, notes } = req.body;

  if (!name) return res.status(400).json({ error: 'Nome do cliente é obrigatório.' });

  const stmt = db.prepare(`
    INSERT INTO customers (name, phone, email, document, address, notes)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(name, phone || '', email || '', document || '', address || '', notes || '');
  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(created);
});

function safeJsonParse(val, fallback) {
  if (!val) return fallback;
  try {
    return JSON.parse(val);
  } catch {
    return fallback;
  }
}

export default router;
