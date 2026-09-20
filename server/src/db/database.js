import { DatabaseSync } from 'node:sqlite';
import bcrypt from 'bcryptjs';
import { config } from '../config.js';

let db = null;

export function getDb() {
  if (!db) {
    db = new DatabaseSync(config.dbPath);
    initDatabase(db);
  }
  return db;
}

function initDatabase(database) {
  // Enable Write-Ahead Logging and foreign keys for high performance and reliability
  database.exec('PRAGMA journal_mode = WAL;');
  database.exec('PRAGMA foreign_keys = ON;');

  // Schema creation
  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      business_name TEXT DEFAULT 'Precifica 3D Studio',
      currency_symbol TEXT DEFAULT 'R$',
      energy_kwh_cost REAL DEFAULT 0.85,
      labor_hour_cost REAL DEFAULT 25.00,
      failure_margin_pct REAL DEFAULT 5.0,
      default_markup REAL DEFAULT 2.0,
      default_tax_pct REAL DEFAULT 6.0,
      default_marketplace_fee_pct REAL DEFAULT 16.0,
      contact_whatsapp TEXT DEFAULT '',
      client_mode_pin TEXT DEFAULT '1234',
      company_name TEXT DEFAULT 'Minha Companhia 3D',
      company_cnpj TEXT DEFAULT '',
      company_ie TEXT DEFAULT '',
      company_cep TEXT DEFAULT '',
      company_address TEXT DEFAULT '',
      company_city TEXT DEFAULT 'São Paulo',
      company_state TEXT DEFAULT 'SP',
      company_phone TEXT DEFAULT '',
      company_email TEXT DEFAULT '',
      company_logo TEXT DEFAULT '',
      default_printer_power_w REAL DEFAULT 200,
      machine_hour_cost REAL DEFAULT 0.40,
      selected_state_uf TEXT DEFAULT 'SP',
      catalog_settings_json TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS printers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      model TEXT,
      power_watts REAL DEFAULT 150,
      purchase_price REAL DEFAULT 5500.0,
      lifespan_hours REAL DEFAULT 5000.0,
      maintenance_hour_cost REAL DEFAULT 0.50,
      bed_width REAL DEFAULT 256,
      bed_depth REAL DEFAULT 256,
      bed_height REAL DEFAULT 256,
      is_default INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS filaments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      brand TEXT,
      color_name TEXT,
      color_hex TEXT DEFAULT '#10b981',
      density_g_cm3 REAL DEFAULT 1.24,
      spool_weight_g REAL DEFAULT 1000,
      price REAL DEFAULT 95.0,
      cost_per_gram REAL DEFAULT 0.095,
      in_stock_spools REAL DEFAULT 1,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS additional_costs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT DEFAULT 'Geral',
      unit_cost REAL NOT NULL,
      default_qty INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS slicer_profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      printer_id INTEGER,
      material_type TEXT DEFAULT 'PLA',
      layer_height REAL DEFAULT 0.20,
      infill_pct INTEGER DEFAULT 15,
      speed_mm_s REAL DEFAULT 250,
      wall_count INTEGER DEFAULT 3,
      top_bottom_layers INTEGER DEFAULT 4,
      support_type TEXT DEFAULT 'none',
      brim_type TEXT DEFAULT 'auto',
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (printer_id) REFERENCES printers(id) ON DELETE SET NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT DEFAULT 'Geral',
      image_url TEXT,
      model_file_url TEXT,
      model_filename TEXT,
      total_weight_g REAL DEFAULT 0,
      total_print_time_min INTEGER DEFAULT 0,
      material_cost REAL DEFAULT 0,
      material_margin_cost REAL DEFAULT 0,
      energy_cost REAL DEFAULT 0,
      machine_depreciation_cost REAL DEFAULT 0,
      labor_assembly_cost REAL DEFAULT 0,
      additional_costs_total REAL DEFAULT 0,
      unit_cost REAL DEFAULT 0,
      sale_price REAL DEFAULT 0,
      markup REAL DEFAULT 2.0,
      profit_gross REAL DEFAULT 0,
      tax_cost REAL DEFAULT 0,
      marketplace_fee_cost REAL DEFAULT 0,
      profit_net REAL DEFAULT 0,
      profit_margin_pct REAL DEFAULT 0,
      placas_json TEXT,
      filaments_json TEXT,
      additional_costs_json TEXT,
      is_active_in_catalog INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT,
      email TEXT,
      document TEXT,
      address TEXT,
      notes TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      status TEXT DEFAULT 'proposta',
      payment_status TEXT DEFAULT 'pendente',
      payment_method TEXT DEFAULT 'PIX',
      validity_days INTEGER DEFAULT 30,
      delivery_method TEXT DEFAULT 'A combinar',
      notes TEXT,
      discount_pct REAL DEFAULT 0,
      discount_value REAL DEFAULT 0,
      subtotal REAL DEFAULT 0,
      total REAL DEFAULT 0,
      estimated_cost REAL DEFAULT 0,
      estimated_net_profit REAL DEFAULT 0,
      paid_at TEXT,
      due_date TEXT,
      items_json TEXT,
      created_at TEXT DEFAULT (datetime('now', 'localtime')),
      updated_at TEXT DEFAULT (datetime('now', 'localtime')),
      FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE SET NULL
    );
  `);

  // Non-destructive migrations for existing databases
  runMigrations(database);

  // Seed default data if empty
  seedDefaults(database);
}

function runMigrations(database) {
  try {
    const settingsColumns = database.prepare("PRAGMA table_info(settings)").all().map(c => c.name);
    const addCol = (colName, colDef) => {
      if (!settingsColumns.includes(colName)) {
        try {
          database.exec(`ALTER TABLE settings ADD COLUMN ${colName} ${colDef};`);
        } catch (e) {
          console.error(`Migration error on settings.${colName}:`, e.message);
        }
      }
    };

    addCol('company_name', "TEXT DEFAULT 'Minha Companhia 3D'");
    addCol('company_cnpj', "TEXT DEFAULT ''");
    addCol('company_ie', "TEXT DEFAULT ''");
    addCol('company_cep', "TEXT DEFAULT ''");
    addCol('company_address', "TEXT DEFAULT ''");
    addCol('company_city', "TEXT DEFAULT 'São Paulo'");
    addCol('company_state', "TEXT DEFAULT 'SP'");
    addCol('company_phone', "TEXT DEFAULT ''");
    addCol('company_email', "TEXT DEFAULT ''");
    addCol('company_logo', "TEXT DEFAULT ''");
    addCol('default_printer_power_w', "REAL DEFAULT 200");
    addCol('machine_hour_cost', "REAL DEFAULT 0.40");
    addCol('selected_state_uf', "TEXT DEFAULT 'SP'");
    addCol('catalog_settings_json', "TEXT DEFAULT '{}'");

    // Migration for products
    const productColumns = database.prepare("PRAGMA table_info(products)").all().map(c => c.name);
    if (!productColumns.includes('is_active_in_catalog')) {
      try {
        database.exec("ALTER TABLE products ADD COLUMN is_active_in_catalog INTEGER DEFAULT 1;");
      } catch (e) {
        console.error("Migration error on products.is_active_in_catalog:", e.message);
      }
    }
  } catch (err) {
    console.error('Error running migrations:', err.message);
  }
}

function seedDefaults(database) {
  // 1. Initial user (admin@precifica3d.local / admin123)
  const userCountStmt = database.prepare('SELECT COUNT(*) as count FROM users');
  const userCount = userCountStmt.get().count;
  if (userCount === 0) {
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync('admin123', salt);
    const insertUser = database.prepare(`
      INSERT INTO users (email, password_hash, name)
      VALUES (?, ?, ?)
    `);
    insertUser.run('admin@precifica3d.local', hash, 'Administrador');
  }

  // 2. Settings singleton
  const settingsCountStmt = database.prepare('SELECT COUNT(*) as count FROM settings');
  if (settingsCountStmt.get().count === 0) {
    database.exec(`
      INSERT INTO settings (
        id, business_name, currency_symbol, energy_kwh_cost,
        labor_hour_cost, failure_margin_pct, default_markup,
        default_tax_pct, default_marketplace_fee_pct, client_mode_pin
      ) VALUES (
        1, 'Oficina 3D Studio', 'R$', 0.85, 25.00, 5.0, 2.0, 6.0, 16.0, '1234'
      )
    `);
  }

  // 3. Default Printers
  const printerCount = database.prepare('SELECT COUNT(*) as count FROM printers').get().count;
  if (printerCount === 0) {
    const insertPrinter = database.prepare(`
      INSERT INTO printers (name, model, power_watts, purchase_price, lifespan_hours, maintenance_hour_cost, bed_width, bed_depth, bed_height, is_default)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertPrinter.run('Bambu Lab X1-Carbon', 'X1-Carbon', 160, 8500, 6000, 0.60, 256, 256, 256, 1);
    insertPrinter.run('Bambu Lab A1', 'A1', 130, 4200, 5000, 0.45, 256, 256, 256, 0);
    insertPrinter.run('Creality Ender 3 V3', 'Ender 3 V3', 120, 1800, 3500, 0.40, 220, 220, 250, 0);
  }

  // 4. Default Filaments
  const filamentCount = database.prepare('SELECT COUNT(*) as count FROM filaments').get().count;
  if (filamentCount === 0) {
    const insertFilament = database.prepare(`
      INSERT INTO filaments (name, type, brand, color_name, color_hex, density_g_cm3, spool_weight_g, price, cost_per_gram, in_stock_spools)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertFilament.run('eSUN PLA+ Preto', 'PLA', 'eSUN', 'Preto', '#1e293b', 1.24, 1000, 95.0, 0.095, 2);
    insertFilament.run('eSUN PLA+ Branco', 'PLA', 'eSUN', 'Branco', '#f8fafc', 1.24, 1000, 95.0, 0.095, 1);
    insertFilament.run('Voolt3D PETG Cinza', 'PETG', 'Voolt3D', 'Cinza', '#64748b', 1.27, 1000, 89.0, 0.089, 1);
    insertFilament.run('Creality ABS Preto', 'ABS', 'Creality', 'Preto', '#0f172a', 1.04, 1000, 90.0, 0.090, 1);
    insertFilament.run('eSUN TPU 95A Vermelho', 'TPU', 'eSUN', 'Vermelho', '#ef4444', 1.21, 1000, 140.0, 0.140, 1);
  }

  // 5. Default Additional Costs
  const addCostsCount = database.prepare('SELECT COUNT(*) as count FROM additional_costs').get().count;
  if (addCostsCount === 0) {
    const insertCost = database.prepare(`
      INSERT INTO additional_costs (name, category, unit_cost, default_qty)
      VALUES (?, ?, ?, ?)
    `);
    insertCost.run('Argola de Chaveiro com Corrente', 'Ferragens', 0.50, 1);
    insertCost.run('Embalagem Caixa Kraft P', 'Embalagem', 1.20, 1);
    insertCost.run('Saquinho Plástico com Lacre', 'Embalagem', 0.25, 1);
    insertCost.run('Ímã de Neodímio 6x2mm', 'Ferragens', 0.80, 2);
    insertCost.run('Parafuso M3x12 com Porca', 'Ferragens', 0.40, 1);
  }

  // 6. Default Slicer Profiles
  const profileCount = database.prepare('SELECT COUNT(*) as count FROM slicer_profiles').get().count;
  if (profileCount === 0) {
    const insertProfile = database.prepare(`
      INSERT INTO slicer_profiles (name, printer_id, material_type, layer_height, infill_pct, speed_mm_s, wall_count, top_bottom_layers, support_type, brim_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertProfile.run('X1C · PLA · 0.20mm', 1, 'PLA', 0.20, 15, 250, 3, 4, 'none', 'auto');
    insertProfile.run('X1C · PLA · 0.12mm (Fino)', 1, 'PLA', 0.12, 15, 200, 3, 5, 'none', 'auto');
    insertProfile.run('X1C · PLA · 0.28mm (Rápido)', 1, 'PLA', 0.28, 12, 300, 2, 3, 'none', 'auto');
    insertProfile.run('X1C · PETG · 0.20mm', 1, 'PETG', 0.20, 20, 200, 3, 4, 'none', 'auto');
    insertProfile.run('X1C · ABS · 0.20mm', 1, 'ABS', 0.20, 20, 250, 3, 4, 'none', 'auto');
    insertProfile.run('A1 · PLA · 0.20mm', 2, 'PLA', 0.20, 15, 200, 3, 4, 'none', 'auto');
    insertProfile.run('A1 · PETG · 0.20mm', 2, 'PETG', 0.20, 20, 180, 3, 4, 'none', 'auto');
  }

  // 7. Seed 1 sample customer, product and order so the user sees a complete, working dashboard right away
  const prodCount = database.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (prodCount === 0) {
    const insertProd = database.prepare(`
      INSERT INTO products (
        name, description, category, total_weight_g, total_print_time_min,
        material_cost, material_margin_cost, energy_cost, machine_depreciation_cost,
        labor_assembly_cost, additional_costs_total, unit_cost, sale_price, markup,
        profit_gross, tax_cost, marketplace_fee_cost, profit_net, profit_margin_pct,
        placas_json, filaments_json, additional_costs_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertProd.run(
      'Chaveiro Personalizado Articulado',
      'Chaveiro 3D articulado de alta resistência.',
      'Chaveiros',
      12.0,
      35,
      1.14,
      0.23,
      0.08,
      0.15,
      0.60,
      0.50,
      2.70,
      8.00,
      2.96,
      5.30,
      0.48,
      1.28,
      3.54,
      44.25,
      JSON.stringify([{
        name: 'Placa Principal',
        copies: 1,
        weight_g: 12.0,
        print_time_min: 35,
        layer_height: 0.20
      }]),
      JSON.stringify([{
        filamentId: 1,
        name: 'eSUN PLA+ Preto',
        weight_g: 12.0,
        cost: 1.14
      }]),
      JSON.stringify([{
        name: 'Argola de Chaveiro com Corrente',
        qty: 1,
        unit_cost: 0.50,
        total: 0.50
      }])
    );
  }

  const custCount = database.prepare('SELECT COUNT(*) as count FROM customers').get().count;
  if (custCount === 0) {
    const insertCust = database.prepare(`
      INSERT INTO customers (name, phone, email, notes)
      VALUES (?, ?, ?, ?)
    `);
    insertCust.run('Lucas Fernandes', '(11) 98765-4321', 'lucas@exemplo.com', 'Cliente frequente de brindes corporativos');
  }

  const orderCount = database.prepare('SELECT COUNT(*) as count FROM orders').get().count;
  if (orderCount === 0) {
    const insertOrder = database.prepare(`
      INSERT INTO orders (
        code, customer_id, status, payment_status, payment_method, validity_days,
        delivery_method, notes, discount_pct, discount_value, subtotal, total,
        estimated_cost, estimated_net_profit, items_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertOrder.run(
      'PED-20260901',
      1,
      'finalizado',
      'pago',
      'PIX',
      30,
      'Retirada no Local',
      'Lote de 10 chaveiros entregues com sucesso.',
      0,
      0,
      80.00,
      80.00,
      27.00,
      48.20,
      JSON.stringify([{
        productId: 1,
        name: 'Chaveiro Personalizado Articulado',
        qty: 10,
        unitPrice: 8.00,
        unitCost: 2.70,
        discount: 0
      }])
    );
  }
}
