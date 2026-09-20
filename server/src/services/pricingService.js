/**
 * Pricing Calculation Engine for 3D Printing
 * Computes exact breakdown of materials, electricity, depreciation, labor, taxes and profit margins.
 */

export function calculatePricing({
  weightGrams = 0,
  filaments = [], // [{ costPerGram, weightGrams }]
  defaultCostPerGram = 0.095,
  printTimeMinutes = 0,
  quantity = 1,
  printer = null,
  settings = null,
  laborAssemblyMinutes = 0,
  additionalCosts = [], // [{ unitCost, qty }]
  markup = 2.0,
  taxPct = null,
  marketplaceFeePct = null
}) {
  const qty = Math.max(1, parseInt(quantity, 10) || 1);
  const printTimeHours = (printTimeMinutes / 60);

  // Settings defaults
  const energyKwhCost = settings?.energy_kwh_cost ?? 0.85;
  const laborHourCost = settings?.labor_hour_cost ?? 25.00;
  const failureMarginPct = settings?.failure_margin_pct ?? 5.0;
  const effectiveTaxPct = taxPct ?? settings?.default_tax_pct ?? 6.0;
  const effectiveMktFeePct = marketplaceFeePct ?? settings?.default_marketplace_fee_pct ?? 16.0;

  // Printer defaults
  const powerWatts = printer?.power_watts ?? 150;
  const purchasePrice = printer?.purchase_price ?? 5000;
  const lifespanHours = printer?.lifespan_hours ?? 5000;
  const maintenanceHourCost = printer?.maintenance_hour_cost ?? 0.50;

  // 1. Material Cost
  let materialCost = 0;
  if (filaments && filaments.length > 0) {
    materialCost = filaments.reduce((acc, f) => {
      const g = parseFloat(f.weightGrams || f.weight_g || 0);
      const c = parseFloat(f.costPerGram || f.cost_per_gram || defaultCostPerGram);
      return acc + (g * c);
    }, 0);
  } else {
    materialCost = (weightGrams || 0) * defaultCostPerGram;
  }

  // Multiply by production quantity
  materialCost = materialCost * qty;

  // Material failure margin (e.g. 5%)
  const materialMarginCost = materialCost * (failureMarginPct / 100);

  // 2. Electricity / Energy Cost
  const totalPrintTimeHours = printTimeHours * qty;
  const energyCost = (powerWatts / 1000) * totalPrintTimeHours * energyKwhCost;

  // 3. Machine Depreciation & Maintenance
  const machineDepreciationRate = (purchasePrice / lifespanHours) + maintenanceHourCost;
  const machineDepreciationCost = totalPrintTimeHours * machineDepreciationRate;

  // 4. Labor / Assembly Cost
  const totalAssemblyMinutes = laborAssemblyMinutes * qty;
  const laborAssemblyCost = (totalAssemblyMinutes / 60) * laborHourCost;

  // 5. Additional Costs (Magnets, Screws, Packaging, etc.)
  let additionalCostsTotal = 0;
  if (additionalCosts && additionalCosts.length > 0) {
    additionalCostsTotal = additionalCosts.reduce((acc, item) => {
      const unit = parseFloat(item.unitCost || item.unit_cost || 0);
      const itemQty = parseFloat(item.qty || item.quantity || 1);
      return acc + (unit * itemQty);
    }, 0) * qty;
  }

  // 6. Total Production Cost
  const totalCost = materialCost + materialMarginCost + energyCost + machineDepreciationCost + laborAssemblyCost + additionalCostsTotal;
  const unitCost = totalCost / qty;

  // 7. Sale Price Calculation
  const effectiveMarkup = Math.max(1.0, parseFloat(markup) || 2.0);
  const salePrice = totalCost * effectiveMarkup;
  const unitSalePrice = salePrice / qty;

  // 8. Profit and Deductions
  const profitGross = salePrice - totalCost;
  const taxCost = salePrice * (effectiveTaxPct / 100);
  const marketplaceFeeCost = salePrice * (effectiveMktFeePct / 100);
  const profitNet = salePrice - totalCost - taxCost - marketplaceFeeCost;
  const profitMarginPct = salePrice > 0 ? (profitNet / salePrice) * 100 : 0;

  return {
    quantity: qty,
    materialCost: round(materialCost),
    materialMarginCost: round(materialMarginCost),
    energyCost: round(energyCost),
    machineDepreciationCost: round(machineDepreciationCost),
    laborAssemblyCost: round(laborAssemblyCost),
    additionalCostsTotal: round(additionalCostsTotal),
    totalCost: round(totalCost),
    unitCost: round(unitCost),
    markup: effectiveMarkup,
    salePrice: round(salePrice),
    unitSalePrice: round(unitSalePrice),
    profitGross: round(profitGross),
    taxCost: round(taxCost),
    taxPct: effectiveTaxPct,
    marketplaceFeeCost: round(marketplaceFeeCost),
    marketplaceFeePct: effectiveMktFeePct,
    profitNet: round(profitNet),
    profitMarginPct: round(profitMarginPct, 1)
  };
}

function round(val, decimals = 2) {
  return parseFloat(Number(val || 0).toFixed(decimals));
}
