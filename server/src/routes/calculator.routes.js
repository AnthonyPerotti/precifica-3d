import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { upload } from '../middleware/upload.js';
import { analyzeStl } from '../services/meshAnalyzer.js';
import { parseGcodeFile } from '../services/gcodeParser.js';
import { calculatePricing } from '../services/pricingService.js';
import { getDb } from '../db/database.js';

const router = express.Router();

// Analyze 3D file or G-code
router.post('/analyze', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
  }

  const filePath = req.file.path;
  const originalName = req.file.originalname;
  const ext = path.extname(originalName).toLowerCase();
  const fileUrl = `/uploads/${req.file.filename}`;

  const density = parseFloat(req.body.density) || 1.24;
  const infillPct = parseInt(req.body.infillPct, 10) || 15;
  const layerHeight = parseFloat(req.body.layerHeight) || 0.20;
  const speedMmS = parseFloat(req.body.speedMmS) || 200;

  try {
    if (ext === '.stl' || ext === '.obj') {
      const analysis = analyzeStl(filePath, { density, infillPct, layerHeight, speedMmS });
      if (!analysis.success) {
        return res.status(422).json(analysis);
      }

      const plates = [{
        name: 'Placa 1',
        copies: 1,
        weight_g: analysis.estimatedWeightGrams,
        print_time_min: analysis.estimatedPrintTimeMin,
        layer_height: layerHeight
      }];

      return res.json({
        success: true,
        filename: req.file.filename,
        originalName,
        fileUrl,
        fileType: ext.replace('.', '').toUpperCase(),
        totalWeightGrams: analysis.estimatedWeightGrams,
        totalPrintTimeMin: analysis.estimatedPrintTimeMin,
        dimensions: analysis.dimensions,
        volumeCm3: analysis.volumeCm3,
        triangleCount: analysis.triangleCount,
        plates
      });
    } else if (ext === '.gcode' || ext === '.3mf') {
      const gcodeResult = parseGcodeFile(filePath);
      const resPlates = gcodeResult.plates && gcodeResult.plates.length > 0 ? gcodeResult.plates : [{
        name: 'Placa 1',
        copies: 1,
        weight_g: gcodeResult.totalWeightGrams || 15.0,
        print_time_min: gcodeResult.totalPrintTimeMin || 45,
        layer_height: gcodeResult.layerHeight || 0.20,
        filaments: [{ type: 'PLA', colorHex: '#10b981', weight_g: gcodeResult.totalWeightGrams || 15.0 }]
      }];

      const allFilaments = [];
      resPlates.forEach(p => {
        if (p.filaments) allFilaments.push(...p.filaments);
      });

      return res.json({
        success: true,
        filename: req.file.filename,
        originalName,
        fileUrl,
        fileType: ext.replace('.', '').toUpperCase(),
        suggestedName: gcodeResult.suggestedName || originalName.replace(/(\.gcode)?\.[^/.]+$/i, ''),
        totalWeightGrams: gcodeResult.totalWeightGrams || 15.0,
        totalPrintTimeMin: gcodeResult.totalPrintTimeMin || 45,
        layerHeight: gcodeResult.layerHeight || 0.20,
        layerCount: gcodeResult.layerCount || 0,
        plates: resPlates,
        thumbnailUrl: gcodeResult.thumbnailUrl || null,
        advancedConfig: gcodeResult.advancedConfig || null,
        filaments: allFilaments.length > 0 ? allFilaments : [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: gcodeResult.totalWeightGrams || 15.0 }]
      });
    } else {
      // Fallback for .step / .stp
      return res.json({
        success: true,
        filename: req.file.filename,
        originalName,
        fileUrl,
        fileType: ext.replace('.', '').toUpperCase(),
        totalWeightGrams: 20.0,
        totalPrintTimeMin: 60,
        plates: [{
          name: 'Placa 1',
          copies: 1,
          weight_g: 20.0,
          print_time_min: 60,
          layer_height: 0.20
        }]
      });
    }
  } catch (err) {
    return res.status(500).json({ error: `Falha ao processar arquivo: ${err.message}` });
  }
});

// Compute live pricing based on inputs
router.post('/pricing', (req, res) => {
  const db = getDb();
  const settings = db.prepare('SELECT * FROM settings WHERE id = 1').get();

  let printer = null;
  if (req.body.printerId) {
    printer = db.prepare('SELECT * FROM printers WHERE id = ?').get(req.body.printerId);
  }
  if (!printer) {
    printer = db.prepare('SELECT * FROM printers WHERE is_default = 1 LIMIT 1').get() ||
              db.prepare('SELECT * FROM printers LIMIT 1').get();
  }

  const calculation = calculatePricing({
    weightGrams: parseFloat(req.body.weightGrams) || 0,
    filaments: req.body.filaments || [],
    defaultCostPerGram: parseFloat(req.body.defaultCostPerGram) || 0.095,
    printTimeMinutes: parseInt(req.body.printTimeMinutes, 10) || 0,
    quantity: parseInt(req.body.quantity, 10) || 1,
    printer,
    settings,
    laborAssemblyMinutes: parseInt(req.body.laborAssemblyMinutes, 10) || 0,
    additionalCosts: req.body.additionalCosts || [],
    markup: parseFloat(req.body.markup) || 2.0,
    taxPct: req.body.taxPct !== undefined ? parseFloat(req.body.taxPct) : null,
    marketplaceFeePct: req.body.marketplaceFeePct !== undefined ? parseFloat(req.body.marketplaceFeePct) : null
  });

  res.json({
    success: true,
    calculation
  });
});

export default router;
