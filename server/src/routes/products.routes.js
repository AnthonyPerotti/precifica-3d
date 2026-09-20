import express from 'express';
import { getDb } from '../db/database.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Upload single product image
router.post('/upload-image', upload.single('image'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhuma imagem enviada.' });
  }
  const imageUrl = `/uploads/${req.file.filename}`;
  res.json({ success: true, imageUrl, filename: req.file.filename });
});

// List products
router.get('/', (req, res) => {
  const db = getDb();
  const { search, category, sort, catalog_only } = req.query;

  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (catalog_only === 'true' || catalog_only === '1') {
    query += ' AND is_active_in_catalog = 1';
  } else if (catalog_only === 'false' || catalog_only === '0') {
    query += ' AND is_active_in_catalog = 0';
  }

  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }

  if (category && category !== 'Todos') {
    query += ' AND category = ?';
    params.push(category);
  }

  if (sort === 'price_asc') {
    query += ' ORDER BY sale_price ASC';
  } else if (sort === 'price_desc') {
    query += ' ORDER BY sale_price DESC';
  } else if (sort === 'name') {
    query += ' ORDER BY name ASC';
  } else {
    query += ' ORDER BY id DESC';
  }

  const products = db.prepare(query).all(...params);

  // Parse JSON fields
  const formatted = products.map(p => ({
    ...p,
    placas: safeJsonParse(p.placas_json, []),
    filaments: safeJsonParse(p.filaments_json, []),
    additionalCosts: safeJsonParse(p.additional_costs_json, [])
  }));

  // Categories list
  const categories = db.prepare("SELECT DISTINCT category FROM products WHERE category IS NOT NULL AND LENGTH(category) > 0").all().map(c => c.category);

  res.json({
    products: formatted,
    categories: ['Todos', ...categories]
  });
});

// Get single product
router.get('/:id', (req, res) => {
  const db = getDb();
  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);

  if (!product) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  res.json({
    ...product,
    placas: safeJsonParse(product.placas_json, []),
    filaments: safeJsonParse(product.filaments_json, []),
    additionalCosts: safeJsonParse(product.additional_costs_json, [])
  });
});

// Create product
router.post('/', (req, res) => {
  const db = getDb();
  const {
    name,
    description,
    category,
    image_url,
    model_file_url,
    model_filename,
    total_weight_g,
    total_print_time_min,
    material_cost,
    material_margin_cost,
    energy_cost,
    machine_depreciation_cost,
    labor_assembly_cost,
    additional_costs_total,
    unit_cost,
    sale_price,
    markup,
    profit_gross,
    tax_cost,
    marketplace_fee_cost,
    profit_net,
    profit_margin_pct,
    placas,
    filaments,
    additionalCosts,
    is_active_in_catalog
  } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Nome do produto é obrigatório.' });
  }

  const stmt = db.prepare(`
    INSERT INTO products (
      name, description, category, is_active_in_catalog, image_url, model_file_url, model_filename,
      total_weight_g, total_print_time_min, material_cost, material_margin_cost,
      energy_cost, machine_depreciation_cost, labor_assembly_cost, additional_costs_total,
      unit_cost, sale_price, markup, profit_gross, tax_cost, marketplace_fee_cost,
      profit_net, profit_margin_pct, placas_json, filaments_json, additional_costs_json
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?
    )
  `);

  const result = stmt.run(
    name,
    description || '',
    category || 'Geral',
    is_active_in_catalog !== undefined ? (is_active_in_catalog ? 1 : 0) : 1,
    image_url || '',
    model_file_url || '',
    model_filename || '',
    total_weight_g || 0,
    total_print_time_min || 0,
    material_cost || 0,
    material_margin_cost || 0,
    energy_cost || 0,
    machine_depreciation_cost || 0,
    labor_assembly_cost || 0,
    additional_costs_total || 0,
    unit_cost || 0,
    sale_price || 0,
    markup || 2.0,
    profit_gross || 0,
    tax_cost || 0,
    marketplace_fee_cost || 0,
    profit_net || 0,
    profit_margin_pct || 0,
    JSON.stringify(placas || []),
    JSON.stringify(filaments || []),
    JSON.stringify(additionalCosts || [])
  );

  const created = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json({
    ...created,
    placas: safeJsonParse(created.placas_json, []),
    filaments: safeJsonParse(created.filaments_json, []),
    additionalCosts: safeJsonParse(created.additional_costs_json, [])
  });
});

// Update product
router.put('/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const current = db.prepare('SELECT * FROM products WHERE id = ?').get(id);

  if (!current) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const {
    name, description, category, is_active_in_catalog, image_url, model_file_url, model_filename,
    total_weight_g, total_print_time_min, material_cost, material_margin_cost,
    energy_cost, machine_depreciation_cost, labor_assembly_cost, additional_costs_total,
    unit_cost, sale_price, markup, profit_gross, tax_cost, marketplace_fee_cost,
    profit_net, profit_margin_pct, placas, filaments, additionalCosts
  } = req.body;

  const stmt = db.prepare(`
    UPDATE products SET
      name = COALESCE(?, name),
      description = COALESCE(?, description),
      category = COALESCE(?, category),
      is_active_in_catalog = COALESCE(?, is_active_in_catalog),
      image_url = COALESCE(?, image_url),
      model_file_url = COALESCE(?, model_file_url),
      model_filename = COALESCE(?, model_filename),
      total_weight_g = COALESCE(?, total_weight_g),
      total_print_time_min = COALESCE(?, total_print_time_min),
      material_cost = COALESCE(?, material_cost),
      material_margin_cost = COALESCE(?, material_margin_cost),
      energy_cost = COALESCE(?, energy_cost),
      machine_depreciation_cost = COALESCE(?, machine_depreciation_cost),
      labor_assembly_cost = COALESCE(?, labor_assembly_cost),
      additional_costs_total = COALESCE(?, additional_costs_total),
      unit_cost = COALESCE(?, unit_cost),
      sale_price = COALESCE(?, sale_price),
      markup = COALESCE(?, markup),
      profit_gross = COALESCE(?, profit_gross),
      tax_cost = COALESCE(?, tax_cost),
      marketplace_fee_cost = COALESCE(?, marketplace_fee_cost),
      profit_net = COALESCE(?, profit_net),
      profit_margin_pct = COALESCE(?, profit_margin_pct),
      placas_json = COALESCE(?, placas_json),
      filaments_json = COALESCE(?, filaments_json),
      additional_costs_json = COALESCE(?, additional_costs_json),
      updated_at = datetime('now', 'localtime')
    WHERE id = ?
  `);

  stmt.run(
    name, description, category,
    is_active_in_catalog !== undefined ? (is_active_in_catalog ? 1 : 0) : null,
    image_url, model_file_url, model_filename,
    total_weight_g, total_print_time_min, material_cost, material_margin_cost,
    energy_cost, machine_depreciation_cost, labor_assembly_cost, additional_costs_total,
    unit_cost, sale_price, markup, profit_gross, tax_cost, marketplace_fee_cost,
    profit_net, profit_margin_pct,
    placas !== undefined ? JSON.stringify(placas) : null,
    filaments !== undefined ? JSON.stringify(filaments) : null,
    additionalCosts !== undefined ? JSON.stringify(additionalCosts) : null,
    id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  res.json({
    ...updated,
    placas: safeJsonParse(updated.placas_json, []),
    filaments: safeJsonParse(updated.filaments_json, []),
    additionalCosts: safeJsonParse(updated.additional_costs_json, [])
  });
});

// Toggle catalog status
router.patch('/:id/toggle-catalog', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const current = db.prepare('SELECT id, is_active_in_catalog FROM products WHERE id = ?').get(id);

  if (!current) {
    return res.status(404).json({ error: 'Produto não encontrado.' });
  }

  const newValue = current.is_active_in_catalog === 1 ? 0 : 1;
  db.prepare('UPDATE products SET is_active_in_catalog = ?, updated_at = datetime(\'now\', \'localtime\') WHERE id = ?').run(newValue, id);

  res.json({ success: true, is_active_in_catalog: newValue });
});

// Delete product
router.delete('/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM products WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Produto excluído com sucesso.' });
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
