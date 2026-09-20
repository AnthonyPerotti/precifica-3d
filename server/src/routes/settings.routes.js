import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

// GET all settings bundle
router.get('/', (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  const printers = db.prepare('SELECT * FROM printers ORDER BY is_default DESC, name ASC').all();
  const filaments = db.prepare('SELECT * FROM filaments WHERE is_active = 1 ORDER BY brand ASC, name ASC').all();
  const additionalCosts = db.prepare('SELECT * FROM additional_costs ORDER BY category ASC, name ASC').all();
  const slicerProfiles = db.prepare('SELECT * FROM slicer_profiles ORDER BY name ASC').all();

  res.json({
    settings,
    printers,
    filaments,
    additionalCosts,
    slicerProfiles
  });
});

// Update general settings
router.put('/', (req, res) => {
  const db = getDb();
  const {
    business_name,
    currency_symbol,
    energy_kwh_cost,
    labor_hour_cost,
    failure_margin_pct,
    default_markup,
    default_tax_pct,
    default_marketplace_fee_pct,
    contact_whatsapp,
    client_mode_pin,
    company_name,
    company_cnpj,
    company_ie,
    company_cep,
    company_address,
    company_city,
    company_state,
    company_phone,
    company_email,
    company_logo,
    default_printer_power_w,
    machine_hour_cost,
    selected_state_uf,
    catalog_settings_json
  } = req.body;

  const stmt = db.prepare(`
    UPDATE settings SET
      business_name = COALESCE(?, business_name),
      currency_symbol = COALESCE(?, currency_symbol),
      energy_kwh_cost = COALESCE(?, energy_kwh_cost),
      labor_hour_cost = COALESCE(?, labor_hour_cost),
      failure_margin_pct = COALESCE(?, failure_margin_pct),
      default_markup = COALESCE(?, default_markup),
      default_tax_pct = COALESCE(?, default_tax_pct),
      default_marketplace_fee_pct = COALESCE(?, default_marketplace_fee_pct),
      contact_whatsapp = COALESCE(?, contact_whatsapp),
      client_mode_pin = COALESCE(?, client_mode_pin),
      company_name = COALESCE(?, company_name),
      company_cnpj = COALESCE(?, company_cnpj),
      company_ie = COALESCE(?, company_ie),
      company_cep = COALESCE(?, company_cep),
      company_address = COALESCE(?, company_address),
      company_city = COALESCE(?, company_city),
      company_state = COALESCE(?, company_state),
      company_phone = COALESCE(?, company_phone),
      company_email = COALESCE(?, company_email),
      company_logo = COALESCE(?, company_logo),
      default_printer_power_w = COALESCE(?, default_printer_power_w),
      machine_hour_cost = COALESCE(?, machine_hour_cost),
      selected_state_uf = COALESCE(?, selected_state_uf),
      catalog_settings_json = COALESCE(?, catalog_settings_json)
    WHERE id = 1
  `);

  stmt.run(
    business_name,
    currency_symbol,
    energy_kwh_cost,
    labor_hour_cost,
    failure_margin_pct,
    default_markup,
    default_tax_pct,
    default_marketplace_fee_pct,
    contact_whatsapp,
    client_mode_pin,
    company_name,
    company_cnpj,
    company_ie,
    company_cep,
    company_address,
    company_city,
    company_state,
    company_phone,
    company_email,
    company_logo,
    default_printer_power_w,
    machine_hour_cost,
    selected_state_uf,
    catalog_settings_json !== undefined ? (typeof catalog_settings_json === 'string' ? catalog_settings_json : JSON.stringify(catalog_settings_json)) : null
  );

  const updated = db.prepare('SELECT * FROM settings WHERE id = 1').get();
  res.json({ settings: updated, message: 'Configurações atualizadas com sucesso.' });
});

// PRINTERS CRUD
router.post('/printers', (req, res) => {
  const db = getDb();
  const { name, model, power_watts, purchase_price, lifespan_hours, maintenance_hour_cost, bed_width, bed_depth, bed_height, is_default } = req.body;

  if (is_default) {
    db.prepare('UPDATE printers SET is_default = 0').run();
  }

  const stmt = db.prepare(`
    INSERT INTO printers (name, model, power_watts, purchase_price, lifespan_hours, maintenance_hour_cost, bed_width, bed_depth, bed_height, is_default)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name || 'Nova Impressora',
    model || '',
    power_watts || 150,
    purchase_price || 3000,
    lifespan_hours || 5000,
    maintenance_hour_cost || 0.50,
    bed_width || 220,
    bed_depth || 220,
    bed_height || 250,
    is_default ? 1 : 0
  );

  const created = db.prepare('SELECT * FROM printers WHERE id = ?').get(result.lastInsertRowid);
  res.json(created);
});

router.put('/printers/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, model, power_watts, purchase_price, lifespan_hours, maintenance_hour_cost, bed_width, bed_depth, bed_height, is_default } = req.body;

  if (is_default) {
    db.prepare('UPDATE printers SET is_default = 0').run();
  }

  const stmt = db.prepare(`
    UPDATE printers SET
      name = COALESCE(?, name),
      model = COALESCE(?, model),
      power_watts = COALESCE(?, power_watts),
      purchase_price = COALESCE(?, purchase_price),
      lifespan_hours = COALESCE(?, lifespan_hours),
      maintenance_hour_cost = COALESCE(?, maintenance_hour_cost),
      bed_width = COALESCE(?, bed_width),
      bed_depth = COALESCE(?, bed_depth),
      bed_height = COALESCE(?, bed_height),
      is_default = COALESCE(?, is_default)
    WHERE id = ?
  `);

  stmt.run(name, model, power_watts, purchase_price, lifespan_hours, maintenance_hour_cost, bed_width, bed_depth, bed_height, is_default !== undefined ? (is_default ? 1 : 0) : null, id);

  const updated = db.prepare('SELECT * FROM printers WHERE id = ?').get(id);
  res.json(updated);
});

router.delete('/printers/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM printers WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Impressora excluída com sucesso.' });
});

// FILAMENTS CRUD
router.post('/filaments', (req, res) => {
  const db = getDb();
  const { name, type, brand, color_name, color_hex, density_g_cm3, spool_weight_g, price, in_stock_spools } = req.body;

  const spoolWeight = spool_weight_g || 1000;
  const filamentPrice = price || 95.0;
  const costPerGram = spoolWeight > 0 ? filamentPrice / spoolWeight : 0.095;

  const stmt = db.prepare(`
    INSERT INTO filaments (name, type, brand, color_name, color_hex, density_g_cm3, spool_weight_g, price, cost_per_gram, in_stock_spools)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name || `${brand || ''} ${type || 'PLA'} ${color_name || ''}`.trim(),
    type || 'PLA',
    brand || 'Genérico',
    color_name || 'Preto',
    color_hex || '#10b981',
    density_g_cm3 || 1.24,
    spoolWeight,
    filamentPrice,
    costPerGram,
    in_stock_spools !== undefined ? in_stock_spools : 1
  );

  const created = db.prepare('SELECT * FROM filaments WHERE id = ?').get(result.lastInsertRowid);
  res.json(created);
});

router.put('/filaments/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, type, brand, color_name, color_hex, density_g_cm3, spool_weight_g, price, in_stock_spools, is_active } = req.body;

  const current = db.prepare('SELECT * FROM filaments WHERE id = ?').get(id);
  if (!current) return res.status(404).json({ error: 'Filamento não encontrado.' });

  const effectiveSpool = spool_weight_g !== undefined ? spool_weight_g : current.spool_weight_g;
  const effectivePrice = price !== undefined ? price : current.price;
  const costPerGram = effectiveSpool > 0 ? effectivePrice / effectiveSpool : current.cost_per_gram;

  const stmt = db.prepare(`
    UPDATE filaments SET
      name = COALESCE(?, name),
      type = COALESCE(?, type),
      brand = COALESCE(?, brand),
      color_name = COALESCE(?, color_name),
      color_hex = COALESCE(?, color_hex),
      density_g_cm3 = COALESCE(?, density_g_cm3),
      spool_weight_g = COALESCE(?, spool_weight_g),
      price = COALESCE(?, price),
      cost_per_gram = ?,
      in_stock_spools = COALESCE(?, in_stock_spools),
      is_active = COALESCE(?, is_active)
    WHERE id = ?
  `);

  stmt.run(name, type, brand, color_name, color_hex, density_g_cm3, spool_weight_g, price, costPerGram, in_stock_spools, is_active, id);

  const updated = db.prepare('SELECT * FROM filaments WHERE id = ?').get(id);
  res.json(updated);
});

router.delete('/filaments/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM filaments WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Filamento excluído com sucesso.' });
});

// ADDITIONAL COSTS CRUD
router.post('/additional-costs', (req, res) => {
  const db = getDb();
  const { name, category, unit_cost, default_qty } = req.body;

  const stmt = db.prepare(`
    INSERT INTO additional_costs (name, category, unit_cost, default_qty)
    VALUES (?, ?, ?, ?)
  `);

  const result = stmt.run(name || 'Novo Insumo', category || 'Geral', unit_cost || 0, default_qty || 1);
  const created = db.prepare('SELECT * FROM additional_costs WHERE id = ?').get(result.lastInsertRowid);
  res.json(created);
});

router.put('/additional-costs/:id', (req, res) => {
  const db = getDb();
  const { id } = req.params;
  const { name, category, unit_cost, default_qty } = req.body;

  const stmt = db.prepare(`
    UPDATE additional_costs SET
      name = COALESCE(?, name),
      category = COALESCE(?, category),
      unit_cost = COALESCE(?, unit_cost),
      default_qty = COALESCE(?, default_qty)
    WHERE id = ?
  `);

  stmt.run(name, category, unit_cost, default_qty, id);
  const updated = db.prepare('SELECT * FROM additional_costs WHERE id = ?').get(id);
  res.json(updated);
});

router.delete('/additional-costs/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM additional_costs WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Custo adicional excluído com sucesso.' });
});

// SLICER PROFILES CRUD
router.post('/slicer-profiles', (req, res) => {
  const db = getDb();
  const { name, printer_id, material_type, layer_height, infill_pct, speed_mm_s, wall_count, top_bottom_layers, support_type, brim_type } = req.body;

  const stmt = db.prepare(`
    INSERT INTO slicer_profiles (name, printer_id, material_type, layer_height, infill_pct, speed_mm_s, wall_count, top_bottom_layers, support_type, brim_type)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const result = stmt.run(
    name,
    printer_id || null,
    material_type || 'PLA',
    layer_height || 0.20,
    infill_pct || 15,
    speed_mm_s || 250,
    wall_count || 3,
    top_bottom_layers || 4,
    support_type || 'none',
    brim_type || 'auto'
  );

  const created = db.prepare('SELECT * FROM slicer_profiles WHERE id = ?').get(result.lastInsertRowid);
  res.json(created);
});

router.delete('/slicer-profiles/:id', (req, res) => {
  const db = getDb();
  db.prepare('DELETE FROM slicer_profiles WHERE id = ?').run(req.params.id);
  res.json({ success: true, message: 'Perfil de fatiamento excluído com sucesso.' });
});

export default router;
