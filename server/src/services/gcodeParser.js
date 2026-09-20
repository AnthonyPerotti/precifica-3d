import fs from 'node:fs';
import path from 'node:path';
import AdmZip from 'adm-zip';
import { config } from '../config.js';

/**
 * Parses G-code or 3MF metadata to extract real slicer estimates,
 * multi-color filaments, plate names, print time, layer height, and thumbnails.
 */
export function parseGcodeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === '.3mf') {
    return parse3mfFile(filePath);
  }

  try {
    const content = fs.readFileSync(filePath, 'utf8');
    return parseGcodeContent(content);
  } catch (err) {
    return {
      success: false,
      error: `Erro ao ler arquivo G-code: ${err.message}`
    };
  }
}

/**
 * Extracts embedded files from a .3mf zip container and parses slice info, gcode, and thumbnails.
 */
/**
 * Extracts embedded files from a .3mf zip container and parses slice info, gcode, and thumbnails.
 */
export function parse3mfFile(filePath) {
  try {
    const zip = new AdmZip(filePath);
    const entries = zip.getEntries();

    // 1. Extract thumbnail if available
    const thumbnailUrl = extract3mfThumbnail(entries);

    // 2. Check for embedded .gcode (e.g. Metadata/plate_1.gcode)
    let gcodeMeta = null;
    const gcodeEntry = entries.find(e => {
      const name = e.entryName.toLowerCase();
      return !e.isDirectory && name.endsWith('.gcode');
    });
    if (gcodeEntry) {
      try {
        const gcodeText = gcodeEntry.getData().toString('utf8');
        gcodeMeta = parseGcodeContent(gcodeText);
      } catch (err) {
        console.warn('Notice parsing embedded gcode:', err.message);
      }
    }

    // 3. Check for plate JSON (e.g. Metadata/plate_1.json)
    let plateJson = null;
    const jsonEntry = entries.find(e => {
      const name = e.entryName.toLowerCase();
      return !e.isDirectory && name.includes('plate_') && name.endsWith('.json');
    });
    if (jsonEntry) {
      try {
        plateJson = JSON.parse(jsonEntry.getData().toString('utf8'));
      } catch {}
    }

    // 4. Look for Bambu / Orca slice_info.config
    const sliceInfoEntry = entries.find(e => e.entryName.toLowerCase().endsWith('slice_info.config')) ||
      entries.find(e => !e.isDirectory && e.entryName.toLowerCase().endsWith('.config') && !e.entryName.toLowerCase().includes('settings'));


    if (sliceInfoEntry) {
      const configText = sliceInfoEntry.getData().toString('utf8');
      const parsedConfig = parseSliceInfoConfig(configText, gcodeMeta, plateJson, entries);
      if (parsedConfig && parsedConfig.plates && parsedConfig.plates.length > 0) {
        return {
          ...parsedConfig,
          thumbnailUrl: thumbnailUrl || parsedConfig.thumbnailUrl
        };
      }
    }

    // 5. If only gcode was found
    if (gcodeMeta && gcodeMeta.plates && gcodeMeta.plates.length > 0) {
      return {
        ...gcodeMeta,
        thumbnailUrl: thumbnailUrl || gcodeMeta.thumbnailUrl
      };
    }

    // 6. Fallback to 3D/3dmodel.model XML mesh geometry
    const modelEntry = entries.find(e => {
      const name = e.entryName.toLowerCase();
      return !e.isDirectory && name.includes('3dmodel.model');
    });

    if (modelEntry) {
      const modelXml = modelEntry.getData().toString('utf8');
      const meshStats = parse3mfModelXml(modelXml);
      if (meshStats) {
        return {
          ...meshStats,
          thumbnailUrl
        };
      }
    }

    // Default fallback
    return {
      success: true,
      suggestedName: 'Peça 3D',
      totalWeightGrams: 15.0,
      totalPrintTimeMin: 45,
      layerHeight: 0.20,
      layerCount: 225,
      thumbnailUrl,
      plates: [{
        name: 'Placa 1',
        copies: 1,
        weight_g: 15.0,
        print_time_min: 45,
        layer_height: 0.20,
        filaments: [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: 15.0 }]
      }]
    };
  } catch (err) {
    console.error('3MF parsing notice:', err.message);
    return {
      success: true,
      suggestedName: 'Peça 3D',
      totalWeightGrams: 15.0,
      totalPrintTimeMin: 45,
      layerHeight: 0.20,
      layerCount: 225,
      thumbnailUrl: null,
      plates: [{
        name: 'Placa 1',
        copies: 1,
        weight_g: 15.0,
        print_time_min: 45,
        layer_height: 0.20,
        filaments: [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: 15.0 }]
      }]
    };
  }
}

/**
 * Extracts the best available thumbnail from 3MF entries and saves it to uploads.
 * Priority: Profile Pictures > Cover > Model Pictures > thumbnail_middle > plate_1 > top > any thumbnail > first image
 */
function extract3mfThumbnail(entries) {
  try {
    const imageEntries = entries.filter(e => {
      const name = e.entryName.toLowerCase();
      return !e.isDirectory && (
        name.endsWith('.png') ||
        name.endsWith('.jpg') ||
        name.endsWith('.jpeg') ||
        name.endsWith('.webp')
      );
    });

    if (imageEntries.length === 0) return null;

    // Score each entry: higher = better quality / more relevant
    const PRIORITY = [
      { check: n => n.includes('profile pictures'), score: 250 },
      { check: n => n.includes('cover') && !n.includes('recover'), score: 220 },
      { check: n => n.includes('model pictures'), score: 200 },
      { check: n => n.includes('thumbnail_middle'), score: 100 },
      { check: n => n.includes('plate_1') && !n.includes('small') && !n.includes('no_light'), score: 80 },
      { check: n => n.includes('top_'), score: 70 },
      { check: n => n.includes('thumbnail_3mf'), score: 60 },
      { check: n => n.includes('thumbnail'), score: 50 },
      { check: n => n.includes('thumbnail_small'), score: 30 },
      { check: n => n.includes('plate_1_small'), score: 20 },
    ];

    const scored = imageEntries.map(e => {
      const n = e.entryName.toLowerCase();
      const priority = PRIORITY.find(p => p.check(n));
      return { entry: e, score: priority ? priority.score : 10 };
    });

    scored.sort((a, b) => b.score - a.score);
    const preferred = scored[0].entry;

    const buffer = preferred.getData();
    if (!buffer || buffer.length === 0) return null;

    const ext = path.extname(preferred.entryName).toLowerCase() || '.png';
    const filename = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}${ext}`;
    const uploadDir = config.uploadsDir || path.join(process.cwd(), 'uploads');
    fs.mkdirSync(uploadDir, { recursive: true });
    const fullPath = path.join(uploadDir, filename);
    fs.writeFileSync(fullPath, buffer);

    console.log(`[3MF] Thumbnail extracted: ${preferred.entryName} (${buffer.length} bytes, score: ${scored[0].score}) -> ${filename}`);
    return `/uploads/${filename}`;
  } catch (e) {
    console.warn('Could not extract 3MF thumbnail:', e.message);
  }
  return null;
}

/**
 * Extracts specific thumbnail image for a plate (e.g. Metadata/plate_1.png).
 */
function extractPlateThumbnail(entries, plateIndex) {
  try {
    const candidates = [
      `metadata/plate_${plateIndex}.png`,
      `plate_${plateIndex}.png`,
      `metadata/plate_${plateIndex}.webp`,
      `plate_${plateIndex}.webp`,
      `metadata/top_${plateIndex}.png`,
      `top_${plateIndex}.png`,
      `metadata/top_${plateIndex}.webp`,
      `top_${plateIndex}.webp`,
      `metadata/pick_${plateIndex}.png`,
      `pick_${plateIndex}.png`
    ];

    let foundEntry = entries.find(e => {
      if (e.isDirectory) return false;
      const lower = e.entryName.toLowerCase();
      return candidates.some(c => lower.endsWith(c) && !lower.includes('small') && !lower.includes('no_light'));
    });

    if (!foundEntry) {
      const fallbackCandidates = [
        `metadata/plate_${plateIndex}_small.png`,
        `plate_${plateIndex}_small.png`,
        `metadata/plate_${plateIndex}_small.webp`,
        `plate_${plateIndex}_small.webp`
      ];
      foundEntry = entries.find(e => {
        if (e.isDirectory) return false;
        const lower = e.entryName.toLowerCase();
        return fallbackCandidates.some(c => lower.endsWith(c));
      });
    }

    if (foundEntry) {
      const buffer = foundEntry.getData();
      if (buffer && buffer.length > 0) {
        const ext = path.extname(foundEntry.entryName).toLowerCase() || '.png';
        const filename = `plate_${Date.now()}_${plateIndex}_${Math.random().toString(36).substring(2, 6)}${ext}`;
        const uploadDir = config.uploadsDir || path.join(process.cwd(), 'uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        fs.writeFileSync(path.join(uploadDir, filename), buffer);
        return `/uploads/${filename}`;
      }
    }
  } catch (err) {
    console.warn(`Could not extract plate ${plateIndex} thumbnail:`, err.message);
  }
  return null;
}

/**
 * Extracts object/piece names for a given plate index from Metadata/plate_X.json
 */
function extractPlateObjects(entries, plateIndex) {
  try {
    const targetSuffix = `plate_${plateIndex}.json`;
    const jsonEntry = entries.find(e => !e.isDirectory && e.entryName.toLowerCase().endsWith(targetSuffix));
    if (jsonEntry) {
      const parsed = JSON.parse(jsonEntry.getData().toString('utf8'));
      if (parsed && Array.isArray(parsed.bbox_objects)) {
        return parsed.bbox_objects
          .map(o => o.name)
          .filter(Boolean)
          .map(n => n.replace(/\.(stl|step|obj|3mf)$/i, ''));
      }
    }
  } catch (err) {
    console.warn(`Could not extract plate ${plateIndex} objects:`, err.message);
  }
  return [];
}

/**
 * Extracts embedded base64 thumbnail comments from G-code content.
 */
function extractGcodeThumbnail(content) {
  try {
    const thumbRegex = /;\s*thumbnail(?:_[A-Z0-9]+)?\s+begin\s+[0-9]+x[0-9]+\s+[0-9]+([\s\S]*?);\s*thumbnail(?:_[A-Z0-9]+)?\s+end/i;
    const match = content.match(thumbRegex);
    if (match) {
      const rawLines = match[1];
      const base64Str = rawLines.replace(/^;\s*/gm, '').replace(/\r?\n/g, '').trim();
      if (base64Str.length > 0) {
        const buffer = Buffer.from(base64Str, 'base64');
        const filename = `thumb_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.png`;
        const uploadDir = config.uploadsDir || path.join(process.cwd(), 'uploads');
        fs.mkdirSync(uploadDir, { recursive: true });
        const fullPath = path.join(uploadDir, filename);
        fs.writeFileSync(fullPath, buffer);

        // Also ensure fallback
        try {
          const fallbackDir = path.resolve(process.cwd(), 'uploads');
          if (fallbackDir !== uploadDir) {
            fs.mkdirSync(fallbackDir, { recursive: true });
            fs.writeFileSync(path.join(fallbackDir, filename), buffer);
          }
        } catch {}

        return `/uploads/${filename}`;
      }
    }
  } catch (e) {
    console.warn('Could not decode G-code thumbnail:', e.message);
  }
  return null;
}

/**
 * Parses XML/Config slice info typical in Bambu Studio and OrcaSlicer 3MF packages.
 */
function parseSliceInfoConfig(xml, gcodeMeta = null, plateJson = null, entries = null) {
  try {
    const plates = [];
    let totalWeightGrams = 0;
    let totalPrintTimeMin = 0;
    let suggestedName = '';

    // Extract object name from <object ... name="...">
    const objMatch = xml.match(/<object\s+[^>]*name=["']([^"']+)["']/i);
    if (objMatch && objMatch[1]) {
      suggestedName = objMatch[1].trim();
    } else if (plateJson && plateJson.bbox_objects && plateJson.bbox_objects[0]?.name) {
      suggestedName = plateJson.bbox_objects[0].name.trim();
    }

    // Look for <plate> blocks
    const plateBlocks = xml.split(/<plate>/i).slice(1);

    if (plateBlocks.length === 0) {
      // Single plate XML
      let timeSec = 0;
      const metaPred = xml.match(/<metadata\s+key=["']prediction["']\s+value=["']([0-9.]+)["']/i);
      const tagPred = xml.match(/<(?:prediction|print_time)>([0-9]+)<\/(?:prediction|print_time)>/i);
      if (metaPred) timeSec = parseFloat(metaPred[1]);
      else if (tagPred) timeSec = parseInt(tagPred[1], 10);
      else if (gcodeMeta) timeSec = gcodeMeta.totalPrintTimeMin * 60;

      const timeMin = Math.max(1, Math.ceil(timeSec / 60));

      const metaWeight = xml.match(/<metadata\s+key=["']weight["']\s+value=["']([0-9.]+)["']/i);
      let plateWeight = metaWeight ? parseFloat(metaWeight[1]) : 0;

      const filaments = [];
      const filamentMatches = [...xml.matchAll(/<filament\s+([^>]+)\/?>/gi)];
      let filamentWeightSum = 0;

      for (const fm of filamentMatches) {
        const attrs = fm[1];
        const gMatch = attrs.match(/used_g=["']([0-9.]+)["']/i);
        const colMatch = attrs.match(/color=["']([^"']+)["']/i);
        const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
        const w = gMatch ? parseFloat(gMatch[1]) : 0;
        filamentWeightSum += w;
        filaments.push({
          type: typeMatch ? typeMatch[1] : 'PLA',
          colorHex: colMatch ? (colMatch[1].startsWith('#') ? colMatch[1] : `#${colMatch[1]}`) : '#10b981',
          color_hex: colMatch ? (colMatch[1].startsWith('#') ? colMatch[1] : `#${colMatch[1]}`) : '#10b981',
          weight_g: parseFloat(w.toFixed(2))
        });
      }

      if (plateWeight === 0) {
        plateWeight = filamentWeightSum > 0 ? filamentWeightSum : (gcodeMeta?.totalWeightGrams || 10.0);
      }

      totalWeightGrams = plateWeight;
      totalPrintTimeMin = timeMin || 30;

      const pName = suggestedName ? `${suggestedName}_plate1` : 'Placa 1';
      const plateThumbnailUrl = entries ? extractPlateThumbnail(entries, 1) : null;
      const plateObjects = entries ? extractPlateObjects(entries, 1) : (plateJson?.bbox_objects ? plateJson.bbox_objects.map(o => o.name) : []);

      plates.push({
        id: 1,
        name: pName,
        copies: 1,
        pieces_per_plate: plateObjects.length > 0 ? plateObjects.length : 1,
        parts_per_product: 1,
        weight_g: parseFloat(plateWeight.toFixed(2)),
        print_time_min: totalPrintTimeMin,
        layer_height: plateJson?.layer_height || gcodeMeta?.layerHeight || 0.20,
        thumbnailUrl: plateThumbnailUrl,
        objects: plateObjects,
        filaments: filaments.length > 0 ? filaments : [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: plateWeight }],
        filaments_used: filaments.length > 0 ? filaments : [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: plateWeight }],
        advancedConfig: gcodeMeta?.advancedConfig || getDefaultAdvancedConfig()
      });
    } else {
      for (let i = 0; i < plateBlocks.length; i++) {
        const block = plateBlocks[i].split(/<\/plate>/i)[0];
        const idxMatch = block.match(/<metadata\s+key=["']index["']\s+value=["'](\d+)["']/i);
        const plateIndex = idxMatch ? parseInt(idxMatch[1], 10) : (i + 1);

        // Plate title
        const nameMatch = block.match(/<(?:plate_name|name)>([^<]+)<\//i);
        const name = nameMatch ? nameMatch[1].trim() : (suggestedName ? `${suggestedName}_plate${plateIndex}` : `Placa ${plateIndex}`);

        // Time in seconds
        let timeSec = 0;
        const metaPred = block.match(/<metadata\s+key=["']prediction["']\s+value=["']([0-9.]+)["']/i);
        const tagPred = block.match(/<(?:prediction|print_time)>([0-9]+)<\//i);
        if (metaPred) timeSec = parseFloat(metaPred[1]);
        else if (tagPred) timeSec = parseInt(tagPred[1], 10);
        else if (gcodeMeta) timeSec = gcodeMeta.totalPrintTimeMin * 60;

        const printTimeMin = Math.max(1, Math.ceil(timeSec / 60));

        // Weight
        const metaWeight = block.match(/<metadata\s+key=["']weight["']\s+value=["']([0-9.]+)["']/i);
        let plateWeight = metaWeight ? parseFloat(metaWeight[1]) : 0;

        // Filaments
        const filaments = [];
        const filamentMatches = [...block.matchAll(/<filament\s+([^>]+)\/?>/gi)];
        let filamentWeightSum = 0;

        for (const fm of filamentMatches) {
          const attrs = fm[1];
          const gMatch = attrs.match(/used_g=["']([0-9.]+)["']/i);
          const colMatch = attrs.match(/color=["']([^"']+)["']/i);
          const typeMatch = attrs.match(/type=["']([^"']+)["']/i);
          const w = gMatch ? parseFloat(gMatch[1]) : 0;
          filamentWeightSum += w;
          filaments.push({
            type: typeMatch ? typeMatch[1] : 'PLA',
            colorHex: colMatch ? (colMatch[1].startsWith('#') ? colMatch[1] : `#${colMatch[1]}`) : '#10b981',
            color_hex: colMatch ? (colMatch[1].startsWith('#') ? colMatch[1] : `#${colMatch[1]}`) : '#10b981',
            weight_g: parseFloat(w.toFixed(2))
          });
        }

        if (plateWeight === 0) {
          plateWeight = filamentWeightSum > 0 ? filamentWeightSum : (gcodeMeta?.totalWeightGrams || 8.0);
        }

        totalWeightGrams += plateWeight;
        totalPrintTimeMin += printTimeMin;

        const plateThumbnailUrl = entries ? extractPlateThumbnail(entries, plateIndex) : null;
        const plateObjects = entries ? extractPlateObjects(entries, plateIndex) : [];

        plates.push({
          id: plateIndex,
          name,
          copies: 1,
          pieces_per_plate: plateObjects.length > 0 ? plateObjects.length : 1,
          parts_per_product: 1,
          weight_g: parseFloat(plateWeight.toFixed(2)),
          print_time_min: printTimeMin,
          layer_height: plateJson?.layer_height || gcodeMeta?.layerHeight || 0.20,
          thumbnailUrl: plateThumbnailUrl,
          objects: plateObjects,
          filaments: filaments.length > 0 ? filaments : [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: plateWeight }],
          filaments_used: filaments.length > 0 ? filaments : [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: plateWeight }],
          advancedConfig: gcodeMeta?.advancedConfig || getDefaultAdvancedConfig()
        });
      }
    }

    return {
      success: true,
      suggestedName: suggestedName || 'Chaveiro',
      totalWeightGrams: parseFloat(totalWeightGrams.toFixed(2)),
      totalPrintTimeMin,
      layerHeight: plateJson?.layer_height || gcodeMeta?.layerHeight || 0.20,
      layerCount: gcodeMeta?.layerCount || Math.ceil(totalPrintTimeMin * 5),
      advancedConfig: gcodeMeta?.advancedConfig || getDefaultAdvancedConfig(),
      plates
    };
  } catch (err) {
    return null;
  }
}

function getDefaultAdvancedConfig() {
  return {
    wall_generator: 'arachne',
    top_shell_layers: 5,
    bottom_shell_layers: 3,
    infill_combination: 'Não',
    support_type: 'tree(auto) (default)',
    brim_type: 'auto_brim 5mm',
    bed_type: 'Textured PEI Plate',
    print_sequence: 'by layer',
    nozzle_diameter: '0.40mm',
    infill_density: '15%'
  };
}

/**
 * Parses 3D/3dmodel.model XML from standard 3MF files to approximate volume.
 */
function parse3mfModelXml(xml) {
  try {
    const vertices = [];
    const vMatches = [...xml.matchAll(/<vertex\s+x=["']([-\d.eE+]+)["']\s+y=["']([-\d.eE+]+)["']\s+z=["']([-\d.eE+]+)["']/gi)];
    for (const m of vMatches) {
      vertices.push([parseFloat(m[1]), parseFloat(m[2]), parseFloat(m[3])]);
    }

    if (vertices.length < 4) return null;

    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;

    for (const v of vertices) {
      if (v[0] < minX) minX = v[0]; if (v[0] > maxX) maxX = v[0];
      if (v[1] < minY) minY = v[1]; if (v[1] > maxY) maxY = v[1];
      if (v[2] < minZ) minZ = v[2]; if (v[2] > maxZ) maxZ = v[2];
    }

    const widthMm = Math.max(0, maxX - minX);
    const depthMm = Math.max(0, maxY - minY);
    const heightMm = Math.max(0, maxZ - minZ);
    const volumeCm3 = (widthMm * depthMm * heightMm * 0.35) / 1000.0;
    const weightG = Math.max(1.0, parseFloat((volumeCm3 * 1.24 * 0.38).toFixed(1)));
    const printTimeMin = Math.max(10, Math.ceil(weightG * 3.5));

    return {
      success: true,
      suggestedName: 'Modelo 3D',
      totalWeightGrams: weightG,
      totalPrintTimeMin: printTimeMin,
      layerHeight: 0.20,
      layerCount: Math.ceil(heightMm / 0.20),
      advancedConfig: getDefaultAdvancedConfig(),
      plates: [{
        name: 'Placa 1',
        copies: 1,
        weight_g: weightG,
        print_time_min: printTimeMin,
        layer_height: 0.20,
        filaments: [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: weightG }],
        filaments_used: [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: weightG }]
      }]
    };
  } catch {
    return null;
  }
}

export function parseGcodeContent(content) {
  let estimatedTimeMin = 0;
  let filamentWeightGrams = 0;
  let layerHeight = 0.20;
  let layerCount = 0;
  let suggestedName = '';
  const plates = [];
  const detectedFilaments = [];

  // Extract thumbnail if embedded in G-code
  const thumbnailUrl = extractGcodeThumbnail(content);

  // 1. Filament used [g] / total filament weight [g] : 2.65,0.35
  const multiGramRegex = /;\s*total filament weight\s*\[g\]\s*:\s*([^\r\n;]+)/i;
  const multiGramMatch = content.match(multiGramRegex);
  if (multiGramMatch) {
    const rawWeights = multiGramMatch[1].split(',').map(s => parseFloat(s.trim())).filter(n => !isNaN(n));
    if (rawWeights.length > 0) {
      filamentWeightGrams = parseFloat(rawWeights.reduce((a, b) => a + b, 0).toFixed(2));
      rawWeights.forEach((w, idx) => {
        detectedFilaments.push({
          type: 'PLA',
          colorHex: idx === 0 ? '#057748' : (idx === 1 ? '#FFFF00' : '#3b82f6'),
          color_hex: idx === 0 ? '#057748' : (idx === 1 ? '#FFFF00' : '#3b82f6'),
          weight_g: parseFloat(w.toFixed(2))
        });
      });
    }
  } else {
    const filamentGramRegex = /;\s*(?:total\s+)?filament\s+used\s*(?:\[g\]|\(g\))\s*[:=]\s*([0-9.]+)/i;
    const gramMatch = content.match(filamentGramRegex);
    if (gramMatch) {
      filamentWeightGrams = parseFloat(gramMatch[1]);
    } else {
      const filamentMeterRegex = /;\s*(?:total\s+)?filament\s+used\s*(?:\[m\]|\(m\))\s*[:=]\s*([0-9.]+)/i;
      const meterMatch = content.match(filamentMeterRegex);
      if (meterMatch) {
        const meters = parseFloat(meterMatch[1]);
        filamentWeightGrams = parseFloat((meters * 2.98).toFixed(2));
      }
    }
  }

  // Multi-filament detection from G-code comments if not already filled
  if (detectedFilaments.length === 0) {
    const filamentBlockMatches = [...content.matchAll(/;\s*filament_type\s*=\s*([^\r\n]+)/gi)];
    if (filamentBlockMatches.length > 0) {
      const types = filamentBlockMatches[0][1].split(';');
      for (let i = 0; i < types.length; i++) {
        const t = types[i].trim();
        if (t) {
          detectedFilaments.push({
            type: t,
            colorHex: i === 0 ? '#057748' : (i === 1 ? '#FFFF00' : '#3b82f6'),
            color_hex: i === 0 ? '#057748' : (i === 1 ? '#FFFF00' : '#3b82f6'),
            weight_g: filamentWeightGrams > 0 ? parseFloat((filamentWeightGrams / types.length).toFixed(2)) : 5.0
          });
        }
      }
    }
  }

  // 2. Print time: Bambu / Orca style
  // ; model printing time: 11m 17s; total estimated time: 17m 33s
  const bambuTimeRegex = /;\s*(?:model printing time:[^;]+;\s*)?total estimated time:\s*([^\r\n;]+)/i;
  const bambuTimeMatch = content.match(bambuTimeRegex);
  if (bambuTimeMatch) {
    estimatedTimeMin = parseTimeStringToMinutes(bambuTimeMatch[1]);
  } else {
    const timeRegex = /;\s*estimated\s+printing\s+time\s*(?:\([^)]+\))?\s*[:=]\s*([^\r\n]+)/i;
    const timeMatch = content.match(timeRegex);
    if (timeMatch) {
      estimatedTimeMin = parseTimeStringToMinutes(timeMatch[1]);
    } else {
      const curaTimeRegex = /;TIME:([0-9]+)/i;
      const curaMatch = content.match(curaTimeRegex);
      if (curaMatch) {
        estimatedTimeMin = Math.ceil(parseInt(curaMatch[1], 10) / 60);
      }
    }
  }

  // 3. Layer height & count
  const layerHeightRegex = /;\s*layer_height\s*=\s*([0-9.]+)/i;
  const lhMatch = content.match(layerHeightRegex);
  if (lhMatch) layerHeight = parseFloat(lhMatch[1]);

  const layerNumMatch = content.match(/;\s*total layer number:\s*([0-9]+)/i) || content.match(/;\s*(?:total_layer_count|layer_count)\s*=\s*([0-9]+)/i);
  if (layerNumMatch) layerCount = parseInt(layerNumMatch[1], 10);

  // 4. Advanced config extraction from comments
  const advConfig = {
    wall_generator: content.includes('arachne') ? 'arachne' : 'classic',
    top_shell_layers: extractConfigVal(content, 'top_shell_layers', 5),
    bottom_shell_layers: extractConfigVal(content, 'bottom_shell_layers', 3),
    infill_combination: content.includes('infill_combination = 1') ? 'Sim' : 'Não',
    support_type: content.includes('support') ? 'tree(auto) (default)' : 'Não',
    brim_type: extractConfigVal(content, 'brim_type', 'auto_brim 5mm'),
    bed_type: extractConfigVal(content, 'bed_type', 'Textured PEI Plate'),
    print_sequence: extractConfigVal(content, 'print_sequence', 'by layer'),
    nozzle_diameter: '0.40mm',
    infill_density: extractConfigVal(content, 'sparse_infill_density', '15%')
  };

  const plateMatch = content.match(/;\s*(?:plate_name|plate_id)\s*[:=]\s*([^\r\n]+)/i);
  const plateName = plateMatch ? plateMatch[1].trim() : 'Placa 1';

  plates.push({
    name: plateName,
    copies: 1,
    weight_g: filamentWeightGrams || 12.0,
    print_time_min: estimatedTimeMin || 35,
    layer_height: layerHeight,
    filaments: detectedFilaments.length > 0 ? detectedFilaments : [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: filamentWeightGrams || 12.0 }],
    filaments_used: detectedFilaments.length > 0 ? detectedFilaments : [{ type: 'PLA', colorHex: '#10b981', color_hex: '#10b981', weight_g: filamentWeightGrams || 12.0 }],
    advancedConfig: advConfig
  });

  return {
    success: true,
    suggestedName: suggestedName || plateName,
    totalWeightGrams: filamentWeightGrams || 12.0,
    totalPrintTimeMin: estimatedTimeMin || 35,
    layerHeight,
    layerCount,
    thumbnailUrl,
    advancedConfig: advConfig,
    plates
  };
}

function extractConfigVal(content, key, fallback) {
  const r = new RegExp(`;\\s*${key}\\s*=\\s*([^\\r\\n]+)`, 'i');
  const m = content.match(r);
  return m && m[1].trim() ? m[1].trim() : fallback;
}

function parseTimeStringToMinutes(str) {
  let minutes = 0;
  const days = str.match(/([0-9]+)\s*d/i);
  const hours = str.match(/([0-9]+)\s*h/i);
  const mins = str.match(/([0-9]+)\s*m/i);
  const secs = str.match(/([0-9]+)\s*s/i);

  if (days) minutes += parseInt(days[1], 10) * 24 * 60;
  if (hours) minutes += parseInt(hours[1], 10) * 60;
  if (mins) minutes += parseInt(mins[1], 10);
  if (secs && !mins && !hours) minutes += Math.ceil(parseInt(secs[1], 10) / 60);

  // If format is like HH:MM:SS
  if (!hours && !mins && str.includes(':')) {
    const parts = str.split(':').map(p => parseInt(p, 10));
    if (parts.length === 3) {
      minutes = parts[0] * 60 + parts[1] + Math.ceil(parts[2] / 60);
    } else if (parts.length === 2) {
      minutes = parts[0] + Math.ceil(parts[1] / 60);
    }
  }

  return minutes > 0 ? minutes : 15;
}

