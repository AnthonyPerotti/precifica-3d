import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

// Export entire database as JSON
router.get('/export', (req, res) => {
  try {
    const db = getDb();
    const tables = ['settings', 'printers', 'filaments', 'additional_costs', 'slicer_profiles', 'products', 'customers', 'orders'];
    const backup = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      data: {}
    };

    tables.forEach(tableName => {
      backup.data[tableName] = db.prepare(`SELECT * FROM ${tableName}`).all();
    });

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename=precifica3d_backup_${Date.now()}.json`);
    res.json(backup);
  } catch (err) {
    res.status(500).json({ error: `Erro ao exportar backup: ${err.message}` });
  }
});

// Import database from JSON
router.post('/import', (req, res) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: 'Dados de backup inválidos.' });
    }

    const db = getDb();

    // Import within a transaction
    db.exec('BEGIN TRANSACTION;');

    try {
      if (Array.isArray(data.settings) && data.settings[0]) {
        const s = data.settings[0];
        db.prepare(`
          UPDATE settings SET
            business_name = ?, currency_symbol = ?, energy_kwh_cost = ?,
            labor_hour_cost = ?, failure_margin_pct = ?, default_markup = ?,
            default_tax_pct = ?, default_marketplace_fee_pct = ?, contact_whatsapp = ?,
            client_mode_pin = ?
          WHERE id = 1
        `).run(
          s.business_name, s.currency_symbol, s.energy_kwh_cost,
          s.labor_hour_cost, s.failure_margin_pct, s.default_markup,
          s.default_tax_pct, s.default_marketplace_fee_pct, s.contact_whatsapp,
          s.client_mode_pin
        );
      }

      if (Array.isArray(data.printers) && data.printers.length > 0) {
        db.exec('DELETE FROM printers;');
        const ins = db.prepare(`
          INSERT INTO printers (id, name, model, power_watts, purchase_price, lifespan_hours, maintenance_hour_cost, bed_width, bed_depth, bed_height, is_default)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        data.printers.forEach(p => ins.run(p.id, p.name, p.model, p.power_watts, p.purchase_price, p.lifespan_hours, p.maintenance_hour_cost, p.bed_width, p.bed_depth, p.bed_height, p.is_default));
      }

      if (Array.isArray(data.filaments) && data.filaments.length > 0) {
        db.exec('DELETE FROM filaments;');
        const ins = db.prepare(`
          INSERT INTO filaments (id, name, type, brand, color_name, color_hex, density_g_cm3, spool_weight_g, price, cost_per_gram, in_stock_spools, is_active)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        data.filaments.forEach(f => ins.run(f.id, f.name, f.type, f.brand, f.color_name, f.color_hex, f.density_g_cm3, f.spool_weight_g, f.price, f.cost_per_gram, f.in_stock_spools, f.is_active));
      }

      if (Array.isArray(data.products) && data.products.length > 0) {
        db.exec('DELETE FROM products;');
        const ins = db.prepare(`
          INSERT INTO products (
            id, name, description, category, image_url, model_file_url, model_filename,
            total_weight_g, total_print_time_min, material_cost, material_margin_cost,
            energy_cost, machine_depreciation_cost, labor_assembly_cost, additional_costs_total,
            unit_cost, sale_price, markup, profit_gross, tax_cost, marketplace_fee_cost,
            profit_net, profit_margin_pct, placas_json, filaments_json, additional_costs_json
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `);
        data.products.forEach(p => ins.run(
          p.id, p.name, p.description, p.category, p.image_url, p.model_file_url, p.model_filename,
          p.total_weight_g, p.total_print_time_min, p.material_cost, p.material_margin_cost,
          p.energy_cost, p.machine_depreciation_cost, p.labor_assembly_cost, p.additional_costs_total,
          p.unit_cost, p.sale_price, p.markup, p.profit_gross, p.tax_cost, p.marketplace_fee_cost,
          p.profit_net, p.profit_margin_pct, p.placas_json, p.filaments_json, p.additional_costs_json
        ));
      }

      db.exec('COMMIT;');
      res.json({ success: true, message: 'Dados restaurados com sucesso!' });
    } catch (txErr) {
      db.exec('ROLLBACK;');
      throw txErr;
    }
  } catch (err) {
    res.status(500).json({ error: `Falha ao importar backup: ${err.message}` });
  }
});

export default router;
