import express from 'express';
import { getDb } from '../db/database.js';

const router = express.Router();

router.get('/dashboard', (req, res) => {
  const db = getDb();
  const { period } = req.query; // '30', '7', '90', 'all'

  let dateFilter = '';
  if (period === '7') {
    dateFilter = "AND o.created_at >= datetime('now', '-7 days')";
  } else if (period === '90') {
    dateFilter = "AND o.created_at >= datetime('now', '-90 days')";
  } else if (period === 'all') {
    dateFilter = '';
  } else {
    // default 30 days
    dateFilter = "AND o.created_at >= datetime('now', '-30 days')";
  }

  // 1. Overall Metrics
  const orders = db.prepare(`
    SELECT o.*, c.name as customer_name
    FROM orders o
    LEFT JOIN customers c ON o.customer_id = c.id
    WHERE 1=1 ${dateFilter}
  `).all();

  const totalOrders = orders.length;
  const finishedOrders = orders.filter(o => o.status === 'finalizado' || o.payment_status === 'pago');

  let grossRevenue = 0;
  let totalCost = 0;
  let netProfit = 0;

  // We accumulate from orders, or fallback to product estimates
  orders.forEach(o => {
    grossRevenue += (o.total || 0);
    totalCost += (o.estimated_cost || 0);
    netProfit += (o.estimated_net_profit || (o.total - o.estimated_cost));
  });

  const grossProfit = grossRevenue - totalCost;
  const netMarginPct = grossRevenue > 0 ? (netProfit / grossRevenue) * 100 : 0;
  const averageTicket = totalOrders > 0 ? grossRevenue / totalOrders : 0;

  // 2. Trend Line (Last 14-30 days points)
  const trendMap = {};
  const now = new Date();
  for (let i = 14; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const dateKey = d.toISOString().slice(5, 10); // MM-DD
    const dayName = d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
    trendMap[dateKey] = {
      date: dateKey,
      label: dayName,
      revenue: 0,
      grossProfit: 0,
      netProfit: 0
    };
  }

  orders.forEach(o => {
    if (o.created_at) {
      const orderDateKey = o.created_at.slice(5, 10);
      if (trendMap[orderDateKey]) {
        trendMap[orderDateKey].revenue += (o.total || 0);
        trendMap[orderDateKey].grossProfit += ((o.total || 0) - (o.estimated_cost || 0));
        trendMap[orderDateKey].netProfit += (o.estimated_net_profit || 0);
      }
    }
  });

  const trend = Object.values(trendMap);

  // 3. Where is the cost? (Donut distribution)
  // Query all products in database to get representative breakdown
  const products = db.prepare('SELECT * FROM products').all();
  let matCostSum = 0;
  let prodCostSum = 0; // energy + machine
  let laborCostSum = 0;
  let extraCostSum = 0;

  products.forEach(p => {
    matCostSum += (p.material_cost || 0) + (p.material_margin_cost || 0);
    prodCostSum += (p.energy_cost || 0) + (p.machine_depreciation_cost || 0);
    laborCostSum += (p.labor_assembly_cost || 0);
    extraCostSum += (p.additional_costs_total || 0);
  });

  const realTotalCost = matCostSum + prodCostSum + laborCostSum + extraCostSum;
  const safeDivisor = realTotalCost || 1;
  const costBreakdown = {
    material: {
      value: parseFloat(matCostSum.toFixed(2)),
      pct: Math.round((matCostSum / safeDivisor) * 100)
    },
    production: {
      value: parseFloat(prodCostSum.toFixed(2)),
      pct: Math.round((prodCostSum / safeDivisor) * 100)
    },
    assembly: {
      value: parseFloat(laborCostSum.toFixed(2)),
      pct: Math.round((laborCostSum / safeDivisor) * 100)
    },
    extras: {
      value: parseFloat(extraCostSum.toFixed(2)),
      pct: Math.round((extraCostSum / safeDivisor) * 100)
    },
    total: parseFloat(realTotalCost.toFixed(2))
  };

  // 4. Revenue by Stage
  const stages = {
    proposta: { total: 0, count: 0 },
    fila: { total: 0, count: 0 },
    em_producao: { total: 0, count: 0 },
    finalizado: { total: 0, count: 0 }
  };

  orders.forEach(o => {
    const s = o.status || 'proposta';
    if (stages[s]) {
      stages[s].total += (o.total || 0);
      stages[s].count += 1;
    }
  });

  // 5. Top Customers
  const customerStats = {};
  orders.forEach(o => {
    const cName = o.customer_name || 'Cliente Avulso';
    if (!customerStats[cName]) {
      customerStats[cName] = { name: cName, orderCount: 0, totalRevenue: 0, netProfit: 0 };
    }
    customerStats[cName].orderCount += 1;
    customerStats[cName].totalRevenue += (o.total || 0);
    customerStats[cName].netProfit += (o.estimated_net_profit || 0);
  });

  const topCustomers = Object.values(customerStats)
    .sort((a, b) => b.totalRevenue - a.totalRevenue)
    .slice(0, 5);

  // 6. Top Products
  const productStats = {};
  orders.forEach(o => {
    const items = safeJsonParse(o.items_json, []);
    items.forEach(it => {
      const pName = it.name || 'Produto 3D';
      if (!productStats[pName]) {
        productStats[pName] = { name: pName, quantity: 0, revenue: 0, profit: 0 };
      }
      const qty = parseInt(it.qty, 10) || 1;
      const unitP = parseFloat(it.unitPrice || 0);
      const unitC = parseFloat(it.unitCost || 0);
      productStats[pName].quantity += qty;
      productStats[pName].revenue += (unitP * qty);
      productStats[pName].profit += ((unitP - unitC) * qty);
    });
  });

  const topProducts = Object.values(productStats)
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // 7. Top Filaments — derived from order items that reference a filament
  // Build filament usage from orders that have filaments_json embedded
  const filamentStats = {};

  orders.forEach(o => {
    const items = safeJsonParse(o.items_json, []);
    items.forEach(it => {
      const filaments = safeJsonParse(it.filaments_json, []);
      filaments.forEach(f => {
        const key = f.filament_id || f.name;
        if (!key) return;
        if (!filamentStats[key]) {
          filamentStats[key] = {
            name: f.name || `Filamento ${key}`,
            grams: 0,
            cost: 0
          };
        }
        filamentStats[key].grams += (f.weight_g || 0) * (parseInt(it.qty, 10) || 1);
        filamentStats[key].cost += (f.material_cost || 0) * (parseInt(it.qty, 10) || 1);
      });
    });
  });

  const topFilaments = Object.values(filamentStats)
    .sort((a, b) => b.grams - a.grams)
    .slice(0, 5)
    .map(f => ({
      name: f.name,
      grams: Math.round(f.grams),
      cost: parseFloat(f.cost.toFixed(2))
    }));

  res.json({
    metrics: {
      grossRevenue: parseFloat(grossRevenue.toFixed(2)),
      grossProfit: parseFloat(grossProfit.toFixed(2)),
      netProfit: parseFloat(netProfit.toFixed(2)),
      netMarginPct: parseFloat(netMarginPct.toFixed(1)),
      averageTicket: parseFloat(averageTicket.toFixed(2)),
      totalOrders
    },
    trend,
    costBreakdown,
    revenueByStage: stages,
    topCustomers,
    topProducts,
    topFilaments
  });
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
