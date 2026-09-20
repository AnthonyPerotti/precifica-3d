import React, { useState, useEffect, useRef } from 'react';
import {
  UploadCloud,
  Layers,
  Check,
  Plus,
  Trash2,
  DollarSign,
  AlertCircle,
  FileText,
  Save,
  Clock,
  Scale,
  Zap,
  Cpu,
  Info,
  ChevronLeft,
  ChevronRight,
  Sliders,
  Settings,
  HelpCircle,
  Upload,
  Camera,
  X
} from 'lucide-react';
import { api } from '../api/client.js';
import { Modal } from '../components/common/Modal.jsx';
import { formatCurrency, formatWeight, formatTime, formatPercent } from '../utils/formatters.js';

// Brazilian Electricity Tariffs per State (UF)
const BRAZIL_STATE_TARIFFS = [
  { uf: 'AC', name: 'Acre', kwh: 0.95 },
  { uf: 'AL', name: 'Alagoas', kwh: 0.88 },
  { uf: 'AP', name: 'Amapá', kwh: 0.94 },
  { uf: 'AM', name: 'Amazonas', kwh: 0.81 },
  { uf: 'BA', name: 'Bahia', kwh: 0.90 },
  { uf: 'CE', name: 'Ceará', kwh: 0.77 },
  { uf: 'DF', name: 'Distrito Federal', kwh: 0.66 },
  { uf: 'ES', name: 'Espírito Santo', kwh: 0.71 },
  { uf: 'GO', name: 'Goiás', kwh: 0.84 },
  { uf: 'MA', name: 'Maranhão', kwh: 0.89 },
  { uf: 'MT', name: 'Mato Grosso', kwh: 0.86 },
  { uf: 'MS', name: 'Mato Grosso do Sul', kwh: 0.91 },
  { uf: 'MG', name: 'Minas Gerais', kwh: 0.84 },
  { uf: 'PA', name: 'Pará', kwh: 1.04 },
  { uf: 'PB', name: 'Paraíba', kwh: 0.69 },
  { uf: 'PR', name: 'Paraná', kwh: 0.59 },
  { uf: 'PE', name: 'Pernambuco', kwh: 0.82 },
  { uf: 'PI', name: 'Piauí', kwh: 0.98 },
  { uf: 'RJ', name: 'Rio de Janeiro', kwh: 0.94 },
  { uf: 'RN', name: 'Rio Grande do Norte', kwh: 0.76 },
  { uf: 'RS', name: 'Rio Grande do Sul', kwh: 0.86 },
  { uf: 'RO', name: 'Rondônia', kwh: 0.86 },
  { uf: 'RR', name: 'Roraima', kwh: 0.64 },
  { uf: 'SC', name: 'Santa Catarina', kwh: 0.58 },
  { uf: 'SP', name: 'São Paulo', kwh: 0.66 },
  { uf: 'SE', name: 'Sergipe', kwh: 0.74 },
  { uf: 'TO', name: 'Tocantins', kwh: 1.02 }
];

export function Calculator({
  clientMode,
  editingProduct,
  onClearEditingProduct,
  onProductSaved,
  onGenerateOrder
}) {
  // General State
  const [loading, setLoading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [message, setMessage] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  // Settings & DB Options
  const [settings, setSettings] = useState(null);
  const [printers, setPrinters] = useState([]);
  const [availableFilaments, setAvailableFilaments] = useState([]);
  const [availableExtras, setAvailableExtras] = useState([]);
  const [slicerProfiles, setSlicerProfiles] = useState([]);

  // Cost Settings Modal State
  const [costModalOpen, setCostModalOpen] = useState(false);
  const [costFormSaving, setCostFormSaving] = useState(false);
  const [costForm, setCostForm] = useState({
    printerId: '',
    failureMarginPct: 20,
    machineHourCost: 0.25,
    printerPowerW: 150,
    kwhCost: 0.8,
    selectedStateUf: 'SP',
    montagemPct: 10,
    platformFeePct: 0,
    taxPct: 0
  });

  // Product Header Form
  const [productName, setProductName] = useState('');
  const [productDesc, setProductDesc] = useState('');
  const [productCategory, setProductCategory] = useState('Geral');
  const [imageUrl, setImageUrl] = useState('');

  // 3D File / Model
  const [uploadedFile, setUploadedFile] = useState(null);
  const [fileUrl, setFileUrl] = useState('');
  const [modelFilename, setModelFilename] = useState('');
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedPrinterId, setSelectedPrinterId] = useState('');

  // Production Mode: 'multiparte' | 'quantidade' | 'avancado'
  const [productionMode, setProductionMode] = useState('multiparte');

  // Layout Mode: 'steps' | 'classic' (configured via Settings)
  const [calculatorLayout, setCalculatorLayout] = useState(() => {
    return localStorage.getItem('precifica3d_calculator_layout') || 'steps';
  });

  // Accordion Sections State (Open/Close for Steps mode)
  const [openSections, setOpenSections] = useState({
    piece: true,
    filaments: false,
    extras: false,
    price: false
  });

  // Plates (Placas de impressão)
  // isEmpty flag: true while no file has been imported yet — hides the plate card
  const [plates, setPlacas] = useState([
    {
      id: 1,
      name: 'Placa 1',
      copies: 1,
      pieces_per_plate: 1,
      parts_per_product: 1,
      weight_g: 0,
      print_time_min: 0,
      layer_height: 0.20,
      speed_mms: 300,
      support: 'S/ Suporte',
      brim: 'auto_brim 5mm',
      filaments_used: [],
      isEmpty: true
    }
  ]);

  // Selected Filaments Mapping
  const [selectedFilaments, setSelectedFilaments] = useState([]);

  // Physical Extras / Additional Costs (Inline editable list)
  const [selectedExtras, setSelectedExtras] = useState([]);

  // Indirect Costs / Percentages
  const [montagemEnabled, setMontagemEnabled] = useState(true);
  const [montagemPct, setMontagemPct] = useState(10);
  const [platformFeeEnabled, setPlatformFeeEnabled] = useState(true);
  const [platformFeePct, setMarketplaceFeePct] = useState(16.0);
  const [taxEnabled, setTaxEnabled] = useState(true);
  const [taxPct, setTaxPct] = useState(6.0);

  // Markup & Margins
  const [markup, setMarkup] = useState(2.0);

  // Live Pricing Calculation
  const [pricing, setPricing] = useState(null);

  const fileInputRef = useRef(null);
  const imageInputRef = useRef(null);

  const handleProductImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await api.uploadProductImage(formData);
      if (res.imageUrl) {
        setImageUrl(res.imageUrl);
        setMessage({ type: 'success', text: 'Imagem do produto atualizada com sucesso!' });
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao enviar imagem.' });
    }
  };

  const handleOpenCostSettingsModal = () => {
    const currentPrinter = printers.find(p => p.id === parseInt(selectedPrinterId, 10)) || printers[0];
    setCostForm({
      printerId: selectedPrinterId || currentPrinter?.id || '',
      failureMarginPct: settings?.failure_margin_pct ?? 20,
      machineHourCost: currentPrinter?.hourly_cost ?? settings?.machine_hour_cost ?? 0.25,
      printerPowerW: currentPrinter?.power_watts ?? settings?.default_printer_power_w ?? 150,
      kwhCost: settings?.energy_kwh_cost ?? 0.8,
      selectedStateUf: settings?.selected_state_uf || 'SP',
      montagemPct: montagemPct ?? 10,
      platformFeePct: platformFeePct ?? 0,
      taxPct: taxPct ?? 0
    });
    setCostModalOpen(true);
  };

  const handleSaveCostSettings = async () => {
    try {
      setCostFormSaving(true);
      const payload = {
        failure_margin_pct: parseFloat(costForm.failureMarginPct) || 0,
        machine_hour_cost: parseFloat(costForm.machineHourCost) || 0,
        default_printer_power_w: parseFloat(costForm.printerPowerW) || 0,
        energy_kwh_cost: parseFloat(costForm.kwhCost) || 0,
        selected_state_uf: costForm.selectedStateUf,
        labor_hour_cost: parseFloat(costForm.montagemPct) || 0,
        default_marketplace_fee_pct: parseFloat(costForm.platformFeePct) || 0,
        default_tax_pct: parseFloat(costForm.taxPct) || 0
      };

      await api.updateSettings(payload);

      if (costForm.printerId) {
        setSelectedPrinterId(costForm.printerId);
        const printerObj = printers.find(p => p.id === parseInt(costForm.printerId, 10));
        if (printerObj) {
          try {
            await api.updatePrinter(printerObj.id, {
              ...printerObj,
              power_watts: parseFloat(costForm.printerPowerW) || printerObj.power_watts,
              hourly_cost: parseFloat(costForm.machineHourCost) || printerObj.hourly_cost,
              is_default: 1
            });
            setPrinters(prev => prev.map(p => p.id === printerObj.id ? {
              ...p,
              power_watts: parseFloat(costForm.printerPowerW) || printerObj.power_watts,
              hourly_cost: parseFloat(costForm.machineHourCost) || printerObj.hourly_cost,
              is_default: 1
            } : { ...p, is_default: 0 }));
          } catch (e) {
            console.warn('Could not update printer attributes:', e);
          }
        }
      }

      setSettings(prev => ({
        ...prev,
        ...payload
      }));
      setMontagemPct(parseFloat(costForm.montagemPct) || 0);
      setMarketplaceFeePct(parseFloat(costForm.platformFeePct) || 0);
      setTaxPct(parseFloat(costForm.taxPct) || 0);

      setCostModalOpen(false);
      setMessage({ type: 'success', text: 'Configurações de custo padrão salvas com sucesso!' });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar configurações de custo.' });
    } finally {
      setCostFormSaving(false);
    }
  };

  // Load Settings and Options
  useEffect(() => {
    loadInitialData();
  }, []);

  // Populate form if editingProduct is passed
  useEffect(() => {
    if (editingProduct) {
      setProductName(editingProduct.name || '');
      setProductDesc(editingProduct.description || '');
      setProductCategory(editingProduct.category || 'Geral');
      setImageUrl(editingProduct.image_url || '');
      setFileUrl(editingProduct.model_file_url || '');
      setModelFilename(editingProduct.model_filename || '');

      if (editingProduct.placas && editingProduct.placas.length > 0) {
        setPlacas(editingProduct.placas);
      }

      if (editingProduct.filaments && editingProduct.filaments.length > 0) {
        setSelectedFilaments(editingProduct.filaments);
      }

      if (editingProduct.additionalCosts && editingProduct.additionalCosts.length > 0) {
        setSelectedExtras(editingProduct.additionalCosts);
      }

      if (editingProduct.markup) setMarkup(editingProduct.markup);
      if (editingProduct.tax_cost !== undefined) setTaxPct(editingProduct.tax_pct || 6.0);
      if (editingProduct.marketplace_fee_cost !== undefined) setMarketplaceFeePct(editingProduct.marketplace_fee_pct || 16.0);
    }
  }, [editingProduct]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      const data = await api.getSettings();
      setSettings(data.settings);
      setPrinters(data.printers || []);
      setAvailableFilaments(data.filaments || []);
      setAvailableExtras(data.additionalCosts || []);
      setSlicerProfiles(data.slicerProfiles || []);

      if (data.settings) {
        setMarkup(data.settings.default_markup || 2.0);
        setTaxPct(data.settings.default_tax_pct || 6.0);
        setMarketplaceFeePct(data.settings.default_marketplace_fee_pct || 16.0);
        if (data.settings.calculator_layout) {
          setCalculatorLayout(data.settings.calculator_layout);
          localStorage.setItem('precifica3d_calculator_layout', data.settings.calculator_layout);
        }
      }

      const defaultPrinter = data.printers?.find(p => p.is_default) || data.printers?.[0];
      if (defaultPrinter) {
        setSelectedPrinterId(defaultPrinter.id);
      }

      if (data.slicerProfiles && data.slicerProfiles.length > 0) {
        setSelectedProfileId(data.slicerProfiles[0].id);
      }

      // Filament is selected by user or loaded when editing
      if (editingProduct?.filaments && editingProduct.filaments.length > 0) {
        setSelectedFilaments(editingProduct.filaments);
      }
    } catch (err) {
      console.error('Erro ao carregar dados:', err);
    } finally {
      setLoading(false);
    }
  };

  // Recalculate Live Pricing whenever inputs change
  useEffect(() => {
    recalculatePricing();
  }, [
    plates,
    selectedFilaments,
    selectedExtras,
    montagemEnabled,
    montagemPct,
    platformFeeEnabled,
    platformFeePct,
    taxEnabled,
    taxPct,
    markup,
    selectedPrinterId,
    productionMode,
    settings
  ]);

  /**
   * Computes the cost of running ONE print cycle for a single plate.
   * This is the fundamental unit of cost from which all production
   * mode calculations derive.
   *
   * @param {object} placa - plate object
   * @param {number} totalBatchWeight - total weight of all plates in current batch (for filament split)
   * @returns {number} cost in BRL
   */
  const getBaseCycleCost = (placa, singleCycleTotalWeight) => {
    const plateWeight = placa.weight_g || 0;
    const plateTimeMin = placa.print_time_min || 0;

    // Material: distribute filament cost proportional to plate weight
    let plateMaterialCost = 0;
    const hasFilament = selectedFilaments.length > 0 && selectedFilaments.some(f => f.filamentId);
    if (hasFilament && singleCycleTotalWeight > 0) {
      selectedFilaments.forEach(f => {
        const filCostPerGram = f.costPerGram || 0;
        const filWeight = f.weightGrams || (singleCycleTotalWeight / selectedFilaments.length);
        // Distribute by this plate's weight fraction
        plateMaterialCost += filCostPerGram * filWeight * (plateWeight / singleCycleTotalWeight);
      });
    }

    const failureMarginPct = settings?.failure_margin_pct ?? 20.0;
    const plateMaterialWithMargin = plateMaterialCost * (1 + failureMarginPct / 100);

    const currentPrinter = printers.find(p => p.id === parseInt(selectedPrinterId, 10)) || printers[0];
    const printerPowerW = currentPrinter?.power_watts || settings?.default_printer_power_w || 150;
    const machineHourCost = currentPrinter?.hourly_cost || settings?.machine_hour_cost || 0.25;
    const kwhCost = settings?.energy_kwh_cost ?? settings?.electricity_kwh_cost ?? 0.8;

    const plateHours = plateTimeMin / 60;
    const plateEnergyCost = (printerPowerW / 1000) * plateHours * kwhCost;
    const plateMachineCost = plateHours * machineHourCost;

    return plateMaterialWithMargin + plateEnergyCost + plateMachineCost;
  };

  const recalculatePricing = () => {
    const hasFilament = selectedFilaments.length > 0 && selectedFilaments.some(f => f.filamentId);

    const activePlates = plates.filter(p => !p.isEmpty);
    const validPlates = activePlates.length > 0 ? activePlates : plates;

    // Total batch weight (across all plates × their copies)
    let totalBatchWeight = 0;
    let totalBatchTimeMin = 0;
    validPlates.forEach(p => {
      const copies = p.copies || 1;
      totalBatchWeight += (p.weight_g || 0) * copies;
      totalBatchTimeMin += (p.print_time_min || 0) * copies;
    });

    // Single-plate total weight (1 cycle of each plate)
    const singleCycleTotalWeight = validPlates.reduce((acc, p) => acc + (p.weight_g || 0), 0);

    // 1. Determine total finished products and batch cost per production mode
    let totalFinishedProducts = 1;
    let batchBaseCost = 0;

    if (productionMode === 'multiparte') {
      // Multiparte: all plates together form 1 assembled product.
      // Each plate's copies = number of print rounds required for that part in 1 product.
      validPlates.forEach(p => {
        const copies = p.copies || 1;
        batchBaseCost += getBaseCycleCost(p, singleCycleTotalWeight) * copies;
      });
      totalFinishedProducts = 1;
    } else if (productionMode === 'quantidade') {
      // Quantidade: copies = number of print runs, pieces = pieces produced per run.
      let totalPieces = 0;
      validPlates.forEach(p => {
        const copies = p.copies || 1;
        const pieces = p.pieces_per_plate || 1;
        batchBaseCost += getBaseCycleCost(p, singleCycleTotalWeight) * copies;
        totalPieces += copies * pieces;
      });
      totalFinishedProducts = Math.max(1, totalPieces);
    } else {
      // Avancado: copies * pieces parts produced, divided by parts_per_product.
      validPlates.forEach(p => {
        const copies = p.copies || 1;
        batchBaseCost += getBaseCycleCost(p, singleCycleTotalWeight) * copies;
      });
      const prodsPerPlate = validPlates.map(p => {
        const copies = p.copies || 1;
        const pieces = p.pieces_per_plate || 1;
        const partsNeeded = p.parts_per_product || 1;
        return Math.floor((copies * pieces) / partsNeeded);
      });
      totalFinishedProducts = Math.max(1, Math.min(...prodsPerPlate));
    }

    // 2. Physical Extras / Additional Insumos (per unit)
    const additionalCostsTotalUnit = selectedExtras.reduce((acc, e) => acc + ((e.unit_cost || 0) * (e.qty || 1)), 0);

    // Unit Manufacturing Cost
    const unitManufacturingCost = batchBaseCost / totalFinishedProducts;

    // 3. Assembly / Labor
    const laborAssemblyCostUnit = montagemEnabled ? unitManufacturingCost * (montagemPct / 100) : 0;

    // Total Unit Cost
    const unitCost = unitManufacturingCost + laborAssemblyCostUnit + additionalCostsTotalUnit;

    // Total Batch Cost
    const totalBatchCost = unitCost * totalFinishedProducts;

    // 4. Sale Price from Markup
    const effectiveMarkup = Math.max(1.0, parseFloat(markup) || 2.0);
    const unitSalePrice = unitCost * effectiveMarkup;
    const totalSalePrice = unitSalePrice * totalFinishedProducts;
    const profitGrossUnit = unitSalePrice - unitCost;

    // 5. Taxes and Marketplace Deductions
    const effectiveTaxPct = taxEnabled ? (parseFloat(taxPct) || 0) : 0;
    const effectiveFeePct = platformFeeEnabled ? (parseFloat(platformFeePct) || 0) : 0;

    const taxCostUnit = unitSalePrice * (effectiveTaxPct / 100);
    const taxCostTotal = totalSalePrice * (effectiveTaxPct / 100);

    const marketplaceFeeCostUnit = unitSalePrice * (effectiveFeePct / 100);
    const marketplaceFeeCostTotal = totalSalePrice * (effectiveFeePct / 100);

    // 6. Net Profit
    const profitNetUnit = profitGrossUnit - taxCostUnit - marketplaceFeeCostUnit;
    const profitNetTotal = profitNetUnit * totalFinishedProducts;
    const profitMarginPct = unitSalePrice > 0 ? (profitNetUnit / unitSalePrice) * 100 : 0;

    // Filament batch material cost (scaled by batch weight)
    const totalMaterialCost = hasFilament ? selectedFilaments.reduce((acc, f) => {
      const filCostPerGram = f.costPerGram || 0;
      const weightRatio = singleCycleTotalWeight > 0 ? (totalBatchWeight / singleCycleTotalWeight) : 1;
      const filWeight = (f.weightGrams || (singleCycleTotalWeight / selectedFilaments.length)) * weightRatio;
      return acc + filCostPerGram * filWeight;
    }, 0) : 0;

    const failureMarginPct = settings?.failure_margin_pct ?? 20.0;
    const materialMarginTotal = totalMaterialCost * (failureMarginPct / 100);

    const currentPrinter = printers.find(p => p.id === parseInt(selectedPrinterId, 10)) || printers[0];
    const printerPowerW = currentPrinter?.power_watts || settings?.default_printer_power_w || 150;
    const machineHourCost = currentPrinter?.hourly_cost || settings?.machine_hour_cost || 0.25;
    const kwhCost = settings?.energy_kwh_cost ?? settings?.electricity_kwh_cost ?? 0.8;
    const totalHours = totalBatchTimeMin / 60;
    const energyCostTotal = (printerPowerW / 1000) * totalHours * kwhCost;
    const machineDepreciationTotal = totalHours * machineHourCost;

    setPricing({
      hasFilament,
      totalWeight: totalBatchWeight,
      totalTimeMin: totalBatchTimeMin,
      singleCycleWeight: singleCycleTotalWeight,
      finishedProducts: totalFinishedProducts,

      // Unit Metrics
      materialCost: totalMaterialCost / totalFinishedProducts,
      materialMarginCost: materialMarginTotal / totalFinishedProducts,
      energyCost: energyCostTotal / totalFinishedProducts,
      machineDepreciationCost: machineDepreciationTotal / totalFinishedProducts,
      laborAssemblyCost: laborAssemblyCostUnit,
      additionalCostsTotal: additionalCostsTotalUnit,
      unitCost: hasFilament ? unitCost : 0,
      salePrice: hasFilament ? unitSalePrice : 0,
      unitSalePrice: hasFilament ? unitSalePrice : 0,
      profitGross: hasFilament ? profitGrossUnit : 0,
      profitNet: hasFilament ? profitNetUnit : 0,
      taxCost: hasFilament ? taxCostUnit : 0,
      marketplaceFeeCost: hasFilament ? marketplaceFeeCostUnit : 0,

      // Total Batch Metrics
      totalCost: hasFilament ? totalBatchCost : 0,
      totalSalePrice: hasFilament ? totalSalePrice : 0,
      profitNetTotal: hasFilament ? profitNetTotal : 0,
      taxCostTotal: hasFilament ? taxCostTotal : 0,
      marketplaceFeeCostTotal: hasFilament ? marketplaceFeeCostTotal : 0,
      materialCostTotal: totalMaterialCost,
      materialMarginCostTotal: materialMarginTotal,
      energyCostTotal,
      machineDepreciationCostTotal: machineDepreciationTotal,
      laborAssemblyCostTotal: laborAssemblyCostUnit * totalFinishedProducts,
      additionalCostsTotalBatch: additionalCostsTotalUnit * totalFinishedProducts,

      markup: effectiveMarkup,
      taxPct: effectiveTaxPct,
      marketplaceFeePct: effectiveFeePct,
      profitMarginPct: hasFilament ? profitMarginPct : 0,
      singleCycleTotalWeight,
    });
  };

  // Drag & Drop Listeners
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processUploadedFile(file);
    }
  };

  // Handle File Upload and Local Analysis
  const processUploadedFile = async (file) => {
    if (!file) return;

    setAnalyzing(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('layerHeight', '0.20');
    formData.append('infillPct', '15');

    try {
      const result = await api.analyzeFile(formData);
      setUploadedFile(result);
      setFileUrl(result.fileUrl);
      setModelFilename(result.filename);
      if (result.thumbnailUrl) {
        setImageUrl(result.thumbnailUrl);
      }

      // Auto-name product if blank
      if (!productName || productName.startsWith('Novo Produto')) {
        const baseName = result.suggestedName || file.name.replace(/(\.gcode)?\.[^/.]+$/i, '').replace(/[-_]/g, ' ');
        setProductName(baseName.charAt(0).toUpperCase() + baseName.slice(1));
      }

      // Auto-generate rich description if blank
      if (!productDesc) {
        const descParts = [];
        const plateCount = result.plates?.length || 1;
        descParts.push(`Impressão em ${plateCount} ${plateCount === 1 ? 'placa' : 'placas'}`);
        if (result.filaments && result.filaments.length > 0) {
          const filText = result.filaments.map(f => `${f.type || 'PLA'} (${parseFloat(f.weight_g || 0).toFixed(1)}g)`).join(' + ');
          descParts.push(`Filamentos: ${filText}`);
        }
        if (result.layerHeight) {
          descParts.push(`Camada: ${result.layerHeight}mm`);
        }
        if (result.advancedConfig) {
          if (result.advancedConfig.wall_generator) descParts.push(`Paredes: ${result.advancedConfig.wall_generator}`);
          if (result.advancedConfig.support_type) descParts.push(`Suporte: ${result.advancedConfig.support_type}`);
          if (result.advancedConfig.infill_density) descParts.push(`Preenchimento: ${result.advancedConfig.infill_density}`);
        }
        if (descParts.length > 0) {
          setProductDesc(descParts.join(' • '));
        }
      }

      // Configure Plates
      if (result.plates && result.plates.length > 0) {
        setPlacas(result.plates.map((pl, idx) => ({
          id: pl.id || idx + 1,
          name: pl.name || `Placa ${idx + 1}`,
          copies: 1,
          pieces_per_plate: pl.pieces_per_plate || 1,
          parts_per_product: pl.parts_per_product || 1,
          weight_g: pl.weight_g || 15,
          print_time_min: pl.print_time_min || 40,
          layer_height: pl.layer_height || result.layerHeight || 0.20,
          speed_mms: 300,
          support: pl.support || result.advancedConfig?.support_type || 'S/ Suporte',
          brim: pl.brim || result.advancedConfig?.brim_type || 'auto_brim 5mm',
          filaments_used: pl.filaments_used || [{ name: 'PLA', color_hex: '#10b981', weight_g: pl.weight_g || 15 }],
          advanced_config: pl.advanced_config || result.advancedConfig,
          thumbnailUrl: pl.thumbnailUrl || null,
          objects: pl.objects || [],
          isEmpty: false
        })));
      } else {
        setPlacas([{
          id: 1,
          name: file.name.replace(/\.[^/.]+$/, ''),
          copies: 1,
          pieces_per_plate: 1,
          parts_per_product: 1,
          weight_g: result.totalWeightGrams || 0,
          print_time_min: result.totalPrintTimeMin || 0,
          layer_height: 0.20,
          speed_mms: 300,
          support: 'S/ Suporte',
          brim: 'auto_brim 5mm',
          filaments_used: result.filaments?.length > 0
            ? result.filaments.map(f => ({ name: f.type || 'PLA', color_hex: f.color_hex || '#10b981', weight_g: f.weight_g || 0 }))
            : [],
          isEmpty: false
        }]);
      }

      // Populate Detected Multi-color Filaments
      if (result.filaments && result.filaments.length > 0) {
        const mapped = result.filaments.map((rf, i) => {
          const match = availableFilaments.find(af => af.color_hex?.toLowerCase() === rf.color_hex?.toLowerCase()) ||
            availableFilaments[i % availableFilaments.length] ||
            availableFilaments[0];
          return {
            id: i + 1,
            colorHex: rf.color_hex || (i === 0 ? '#10b981' : '#f59e0b'),
            type: rf.type || 'PLA',
            weightGrams: rf.weight_g || (result.totalWeightGrams / result.filaments.length),
            filamentId: match ? match.id : (availableFilaments[0]?.id || 1),
            name: match ? `${match.brand} ${match.type}` : 'Filamento Padrão',
            costPerGram: match ? match.cost_per_gram : 0.095
          };
        });
        setSelectedFilaments(mapped);
      } else if (availableFilaments.length > 0) {
        setSelectedFilaments([{
          id: 1,
          colorHex: '#10b981',
          type: 'PLA',
          weightGrams: result.totalWeightGrams || 15,
          filamentId: availableFilaments[0].id,
          name: `${availableFilaments[0].brand} ${availableFilaments[0].type}`,
          costPerGram: availableFilaments[0].cost_per_gram
        }]);
      }

      setMessage({
        type: 'success',
        text: `Arquivo ${file.name} lido com sucesso localmente! Peso: ${formatWeight(result.totalWeightGrams || 15)}, Tempo: ${formatTime(result.totalPrintTimeMin || 40)}.`
      });
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Falha ao analisar arquivo 3D.' });
    } finally {
      setAnalyzing(false);
    }
  };

  // Add Custom Physical Extra Item inline
  const handleAddNewCustomExtra = () => {
    const newExtra = {
      id: Date.now(),
      name: `Item extra ${selectedExtras.length + 1}`,
      qty: 1,
      unit_cost: 1.00
    };
    setSelectedExtras([...selectedExtras, newExtra]);
  };

  // Add from existing catalog extras
  const handleAddCatalogExtra = (extra) => {
    const existing = selectedExtras.find(e => e.id === extra.id);
    if (existing) {
      setSelectedExtras(selectedExtras.map(e => e.id === extra.id ? { ...e, qty: (e.qty || 1) + 1 } : e));
    } else {
      setSelectedExtras([...selectedExtras, {
        id: extra.id,
        name: extra.name,
        qty: extra.default_qty || 1,
        unit_cost: extra.unit_cost || 0
      }]);
    }
  };

  const handleRemoveExtra = (id) => {
    setSelectedExtras(selectedExtras.filter(e => e.id !== id));
  };

  // Save or Update Product
  const handleSaveProduct = async () => {
    if (!productName.trim()) {
      setMessage({ type: 'error', text: 'Informe o nome do produto para salvar no catálogo.' });
      return;
    }

    try {
      const payload = {
        name: productName,
        description: productDesc,
        category: productCategory,
        image_url: imageUrl || '',
        model_file_url: fileUrl,
        model_filename: modelFilename,
        total_weight_g: pricing?.totalWeight || 15,
        total_print_time_min: pricing?.totalTimeMin || 40,
        material_cost: pricing?.materialCost || 0,
        material_margin_cost: pricing?.materialMarginCost || 0,
        energy_cost: pricing?.energyCost || 0,
        machine_depreciation_cost: pricing?.machineDepreciationCost || 0,
        labor_assembly_cost: pricing?.laborAssemblyCost || 0,
        additional_costs_total: pricing?.additionalCostsTotal || 0,
        unit_cost: pricing?.unitCost || 0,
        sale_price: pricing?.salePrice || 0,
        markup: pricing?.markup || markup,
        profit_gross: pricing?.profitGross || 0,
        tax_cost: pricing?.taxCost || 0,
        marketplace_fee_cost: pricing?.marketplaceFeeCost || 0,
        profit_net: pricing?.profitNet || 0,
        profit_margin_pct: pricing?.profitMarginPct || 0,
        placas: plates,
        filaments: selectedFilaments,
        additionalCosts: selectedExtras
      };

      if (editingProduct && editingProduct.id) {
        await api.updateProduct(editingProduct.id, payload);
        setMessage({ type: 'success', text: `Produto "${productName}" atualizado com sucesso!` });
        if (onClearEditingProduct) onClearEditingProduct();
      } else {
        const saved = await api.createProduct(payload);
        setMessage({ type: 'success', text: `Produto "${saved.name}" salvo no catálogo!` });
      }

      if (onProductSaved) onProductSaved();
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Erro ao salvar produto.' });
    }
  };

  const handleGenerateQuote = () => {
    if (!productName.trim()) {
      setMessage({ type: 'error', text: 'Informe o nome do produto antes de gerar o orçamento.' });
      return;
    }

    const tempProduct = {
      name: productName,
      description: productDesc,
      unit_cost: pricing?.unitCost || 0,
      sale_price: pricing?.salePrice || 0,
      profit_net: pricing?.profitNet || 0,
      qty: 1
    };

    if (onGenerateOrder) {
      onGenerateOrder(tempProduct);
    }
  };

  const toggleAllSections = () => {
    const allOpen = Object.values(openSections).every(v => v);
    setOpenSections({
      piece: !allOpen,
      filaments: !allOpen,
      extras: !allOpen,
      price: !allOpen
    });
  };

  const totalPlateCost = (pricing?.unitCost || 0) * (pricing?.finishedProducts || 1);
  const isClassic = calculatorLayout === 'classic';

  // ===================================================================
  // RENDER HELPERS — defined before the main return block
  // ===================================================================

  const renderProductCard = () => (
    <div className="card" style={{ padding: '18px 20px', background: '#101925', borderRadius: 'var(--radius-lg)', border: '1px solid rgba(0, 188, 212, 0.2)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{
          width: 24,
          height: 24,
          borderRadius: '50%',
          background: 'rgba(0, 188, 212, 0.2)',
          color: '#00e5ff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '0.75rem',
          fontWeight: 800
        }}>1</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
          <Layers size={17} color="#00bcd4" />
          <span>Produto</span>
        </div>
      </div>

      {/* Large Square Image / Upload Area */}
      <div
        onClick={() => imageInputRef.current?.click()}
        title="Clique para carregar ou trocar a foto do produto"
        style={{
          width: '100%',
          aspectRatio: '1/1',
          maxHeight: 220,
          background: imageUrl ? '#090f17' : 'rgba(14, 22, 34, 0.7)',
          border: '1px dashed rgba(0, 188, 212, 0.35)',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          position: 'relative',
          overflow: 'hidden',
          marginBottom: 16,
          transition: 'all 0.2s'
        }}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt="Foto do produto"
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            onError={(e) => {
              if (!e.currentTarget.dataset.retried && imageUrl.startsWith('/uploads')) {
                e.currentTarget.dataset.retried = 'true';
                e.currentTarget.src = `http://localhost:5172${imageUrl}`;
              }
            }}
          />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, color: 'var(--text-muted)' }}>
            <Upload size={32} color="#00bcd4" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Foto do produto</span>
          </div>
        )}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            opacity: 0,
            transition: 'opacity 0.2s',
            color: '#fff'
          }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
        >
          <Upload size={22} />
        </div>
      </div>
      <input
        type="file"
        ref={imageInputRef}
        onChange={handleProductImageUpload}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Name input */}
      <div style={{ marginBottom: 12 }}>
        <input
          type="text"
          placeholder="Nome do produto"
          value={productName}
          onChange={(e) => setProductName(e.target.value)}
          className="form-control"
          style={{
            fontSize: '0.875rem',
            fontWeight: 600,
            background: 'rgba(14, 22, 34, 0.6)'
          }}
        />
      </div>

      {/* Description textarea */}
      <div>
        <textarea
          placeholder="Descrição (opcional)"
          value={productDesc}
          onChange={(e) => setProductDesc(e.target.value)}
          className="form-control"
          rows={3}
          style={{
            fontSize: '0.8125rem',
            background: 'rgba(14, 22, 34, 0.4)',
            resize: 'none'
          }}
        />
      </div>
    </div>
  );
  const renderPieceSection = (isClassic = false) => (
    <div className="card" style={{ padding: isClassic ? '18px 20px' : '18px 22px', background: isClassic ? '#101925' : undefined }}>
      {/* Header */}
      {isClassic ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(0, 188, 212, 0.2)',
              color: '#00e5ff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>2</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              <Layers size={17} color="#00bcd4" />
              <span>Placas de Impressão</span>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{plates.length} placa(s)</span>
            <span style={{ fontSize: '0.75rem', color: '#00e5ff', background: 'rgba(0, 188, 212, 0.1)', border: '1px solid rgba(0, 188, 212, 0.2)', padding: '2px 8px', borderRadius: 4 }}>
              ⏱ {pricing ? formatTime(pricing.totalTimeMin) : '0h 35m'}
            </span>
          </div>
        </div>
      ) : (
        <div
          onClick={() => setOpenSections({ ...openSections, piece: !openSections.piece })}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(0, 188, 212, 0.15)',
              color: '#00bcd4',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8125rem',
              fontWeight: 800
            }}>
              1
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>A peça</h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {plates.length} placa(s) • {pricing ? formatTime(pricing.totalTimeMin) : '0h 35m'} • {pricing ? formatWeight(pricing.totalWeight) : '15g'}
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                o arquivo, as placas e quantas peças saem de cada uma
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📌 Manter aberto</span>
          </div>
        </div>
      )}

      {(isClassic || openSections.piece) && (
        <div style={{ marginTop: isClassic ? 0 : 18, borderTop: isClassic ? 'none' : '1px solid var(--border-color)', paddingTop: isClassic ? 0 : 16 }}>

          {/* Drag & Drop Zone */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={(e) => {
              if (e.target.files?.[0]) processUploadedFile(e.target.files[0]);
            }}
            accept=".stl,.obj,.3mf,.gcode,.step,.stp"
            style={{ display: 'none' }}
          />

          <div
            onClick={() => fileInputRef.current?.click()}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            style={{
              border: isDragging ? '2px dashed #00e5ff' : '2px dashed rgba(0, 188, 212, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '24px 20px',
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragging ? 'rgba(0, 188, 212, 0.08)' : 'rgba(14, 22, 34, 0.5)',
              transition: 'all 0.2s ease',
              marginBottom: 16
            }}
          >
            <UploadCloud size={32} color="#00bcd4" style={{ margin: '0 auto 8px' }} />
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--text-primary)' }}>
              {analyzing ? 'Lendo e analisando malha 3D localmente...' : 'Arraste o arquivo da peça aqui ou clique para selecionar'}
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Lê .3mf e .gcode com fatiamento multi-placa e cores, ou .stl e .obj para cálculo volumétrico
            </div>
          </div>

          {/* Action Bar between Dropzone and Plates */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 12,
            marginBottom: 16
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>
                {plates.length} placa(s)
              </span>
              <span style={{
                fontSize: '0.75rem',
                color: '#00e5ff',
                background: 'rgba(0, 188, 212, 0.1)',
                border: '1px solid rgba(0, 188, 212, 0.2)',
                padding: '2px 8px',
                borderRadius: 4
              }}>
                ⏱ {pricing ? formatTime(pricing.totalTimeMin) : '0h 35m'}
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                {plates.reduce((acc, p) => acc + (p.copies || 1), 0)} impressões
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <button
                type="button"
                onClick={() => {
                  setUploadedFile(null);
                  setFileUrl('');
                  setModelFilename('');
                  setPlacas([{
                    id: 1,
                    name: 'Placa 1',
                    copies: 1,
                    pieces_per_plate: 1,
                    parts_per_product: 1,
                    weight_g: 0,
                    print_time_min: 0,
                    layer_height: 0.20,
                    speed_mms: 300,
                    support: 'S/ Suporte',
                    brim: 'auto_brim 5mm',
                    filaments_used: [],
                    isEmpty: true
                  }]);
                }}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '5px 10px', color: '#fb7185' }}
              >
                <Trash2 size={13} />
                <span>Limpar</span>
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '5px 12px', color: '#00bcd4' }}
              >
                <UploadCloud size={13} />
                <span>Adicionar arquivo</span>
              </button>
            </div>
          </div>

          {/* Mode of Production Selector Tabs */}
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Modo de produção
              </div>

              {/* Mode Tabs */}
              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  type="button"
                  onClick={() => setProductionMode('multiparte')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: productionMode === 'multiparte' ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                    background: productionMode === 'multiparte' ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                    color: productionMode === 'multiparte' ? '#00e5ff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>🧩</span>
                  <span>Multiparte</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProductionMode('quantidade')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: productionMode === 'quantidade' ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                    background: productionMode === 'quantidade' ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                    color: productionMode === 'quantidade' ? '#00e5ff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>📦</span>
                  <span>Quantidade</span>
                </button>

                <button
                  type="button"
                  onClick={() => setProductionMode('avancado')}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: productionMode === 'avancado' ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                    background: productionMode === 'avancado' ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                    color: productionMode === 'avancado' ? '#00e5ff' : 'var(--text-muted)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <span>⚙</span>
                  <span>Avançado</span>
                </button>
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
              {productionMode === 'multiparte' && '🧩 Várias placas formam um único produto montado (base + tampa + trava). O sistema soma os custos de todas as partes.'}
              {productionMode === 'quantidade' && '📦 Uma placa imprime várias cópias iguais (ex: 10 chaveiros). O custo da placa é dividido pelo número de cópias.'}
              {productionMode === 'avancado' && '⚙ Controle total dos parâmetros: edite partes por produto, unidades por placa e número de impressões de cada placa.'}
            </div>
          </div>

          {/* Plates List Cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {plates.filter(p => !p.isEmpty).map((placa, idx) => {
              const impressions = Math.max(1, placa.copies || 1);
              const pieces = Math.max(1, placa.pieces_per_plate || 1);
              const partsPerProduct = Math.max(1, placa.parts_per_product || 1);

              // baseCycleCost: cost of running this plate once (1 print cycle, no copies)
              const singleCycleTotalWeight = plates.reduce((acc, p) => acc + (p.weight_g || 0), 0);
              const baseCycleCost = getBaseCycleCost(placa, singleCycleTotalWeight);

              // plateTotalCost: all cycles (copies) for this plate
              const plateTotalCost = baseCycleCost * impressions;

              // unitCostPerPiece by production mode:
              // - multiparte: unit = baseCycleCost (1 finished product, copies just repeats the part)
              // - quantidade:  unit = baseCycleCost / piecesPerPlate
              // - avancado:    unit = (baseCycleCost * partsPerProduct) / piecesPerPlate
              let unitCostPerPiece;
              if (productionMode === 'multiparte') {
                unitCostPerPiece = baseCycleCost;
              } else if (productionMode === 'quantidade') {
                unitCostPerPiece = baseCycleCost / pieces;
              } else {
                unitCostPerPiece = (baseCycleCost * partsPerProduct) / pieces;
              }

              const plateCost = plateTotalCost;

              return (
                <div
                  key={placa.id || idx}
                  style={{
                    background: '#0d1520',
                    border: '1px solid rgba(0, 188, 212, 0.2)',
                    borderRadius: 'var(--radius-md)',
                    padding: '14px 16px'
                  }}
                >
                  {/* Top Plate Info Row */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 10, marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 44,
                        height: 44,
                        borderRadius: 6,
                        background: 'rgba(16, 185, 129, 0.1)',
                        border: '1px solid rgba(0, 188, 212, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#10b981',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {placa.thumbnailUrl ? (
                          <img
                            src={placa.thumbnailUrl}
                            alt={placa.name}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                            onError={(e) => {
                              if (!e.currentTarget.dataset.retried && placa.thumbnailUrl.startsWith('/uploads')) {
                                e.currentTarget.dataset.retried = 'true';
                                e.currentTarget.src = `http://localhost:5172${placa.thumbnailUrl}`;
                              } else {
                                e.currentTarget.style.display = 'none';
                              }
                            }}
                          />
                        ) : (
                          <Layers size={22} />
                        )}
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <input
                            type="text"
                            value={placa.name}
                            onChange={(e) => {
                              const val = e.target.value;
                              setPlacas(plates.map((p, i) => i === idx ? { ...p, name: val } : p));
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              borderBottom: '1px dashed rgba(255,255,255,0.2)',
                              color: '#ffffff',
                              fontWeight: 700,
                              fontSize: '0.875rem',
                              padding: '2px 4px'
                            }}
                          />
                          <span style={{ fontSize: '0.6875rem', color: '#00bcd4', background: 'rgba(0, 188, 212, 0.1)', padding: '1px 6px', borderRadius: 4 }}>
                            P{idx + 1}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: '#00e5ff', background: 'rgba(0, 188, 212, 0.1)', padding: '1px 6px', borderRadius: 4 }}>
                            ⏱ {formatTime(placa.print_time_min)}
                          </span>
                          <span style={{ fontSize: '0.6875rem', color: '#f59e0b', background: 'rgba(245, 158, 11, 0.1)', padding: '1px 6px', borderRadius: 4 }}>
                            ⚖ {formatWeight(placa.weight_g)}
                          </span>
                        </div>

                        {/* Plate Slicer Metadata Tags */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          <span>⌖ {placa.layer_height || 0.20}mm</span>
                          <span>⚡ {placa.speed_mms || 300}mm/s</span>
                          <span>🚫 {placa.support || 'S/ Suporte'}</span>
                          <span>⬚ {placa.brim || 'auto_brim 5mm'}</span>
                        </div>
                      </div>
                    </div>

                    {/* Cost Display on the Right */}
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.875rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(plateTotalCost)}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        {formatCurrency(unitCostPerPiece)}/un
                      </div>
                    </div>
                  </div>

                  {/* Objects / Pieces inside this Plate */}
                  {placa.objects && placa.objects.length > 0 && (
                    <div style={{ marginBottom: 10, padding: '6px 10px', background: 'rgba(0, 188, 212, 0.05)', borderRadius: 6, border: '1px solid rgba(0, 188, 212, 0.12)' }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: '#00e5ff', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span>🧩 Peças nesta placa ({placa.objects.length}):</span>
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                        {placa.objects.map((objName, oIdx) => (
                          <span key={oIdx} style={{
                            fontSize: '0.6875rem',
                            color: 'var(--text-primary)',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            padding: '1px 7px',
                            borderRadius: 4
                          }}>
                            {objName}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Filaments Used in this Plate */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                    {placa.filaments_used?.map((fu, fidx) => (
                      <div key={fidx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                        background: 'rgba(255, 255, 255, 0.04)',
                        padding: '2px 8px',
                        borderRadius: 4,
                        fontSize: '0.6875rem'
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: fu.color_hex || '#10b981' }} />
                        <span>{fu.name || 'PLA'} {formatWeight(fu.weight_g || placa.weight_g)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Production Mode Parameters */}
                  <div style={{
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                    paddingTop: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 12
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap', fontSize: '0.8125rem' }}>

                      {/* Imprimir mais de uma vez? — always shown */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ color: 'var(--text-muted)' }} title="Quantas rodadas desta placa um produto exige. Ex: o kit leva 10 peças e só cabem 5 na mesa → 2 impressões.">
                          Imprimir mais de uma vez?
                        </span>
                        <input
                          type="number"
                          min="1"
                          value={placa.copies || 1}
                          onChange={(e) => {
                            const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                            setPlacas(plates.map((p, i) => i === idx ? { ...p, copies: val } : p));
                          }}
                          className="form-control"
                          style={{ width: '50px', padding: '3px 6px', fontSize: '0.8125rem', textAlign: 'center' }}
                        />
                        <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>vezes</span>
                      </div>

                      {/* Produz várias unidades? — apenas para quantidade e avancado */}
                      {productionMode !== 'multiparte' && (
                        <>
                          <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--text-muted)' }} title="Se a placa imprime várias cópias iguais por vez, informe quantas.">
                              Produz várias unidades?
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={placa.pieces_per_plate || 1}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setPlacas(plates.map((p, i) => i === idx ? { ...p, pieces_per_plate: val } : p));
                              }}
                              className="form-control"
                              style={{ width: '50px', padding: '3px 6px', fontSize: '0.8125rem', textAlign: 'center' }}
                            />
                            <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>un</span>
                          </div>
                        </>
                      )}

                      {/* Partes/produto — somente avançado */}
                      {productionMode === 'avancado' && (
                        <>
                          <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ color: 'var(--text-muted)' }} title="Quantas unidades desta peça compõem 1 produto final montado.">
                              Partes/produto
                            </span>
                            <input
                              type="number"
                              min="1"
                              value={placa.parts_per_product || 1}
                              onChange={(e) => {
                                const val = Math.max(1, parseInt(e.target.value, 10) || 1);
                                setPlacas(plates.map((p, i) => i === idx ? { ...p, parts_per_product: val } : p));
                              }}
                              className="form-control"
                              style={{ width: '50px', padding: '3px 6px', fontSize: '0.8125rem', textAlign: 'center' }}
                            />
                          </div>
                        </>
                      )}

                      <span style={{ color: 'rgba(255,255,255,0.12)' }}>|</span>

                      {/* Summary line */}
                      <span style={{ color: '#00bcd4', fontSize: '0.75rem', fontWeight: 600 }}>
                        {productionMode === 'multiparte' && (
                          <>→ {impressions} {impressions > 1 ? 'impressões necessárias' : 'impressão'} para 1 produto montado</>
                        )}
                        {productionMode === 'quantidade' && (
                          <>→ {impressions} rodada(s) × {pieces} un/mesa = <strong style={{ color: '#00e5ff' }}>{impressions * pieces} produto(s)</strong></>
                        )}
                        {productionMode === 'avancado' && (
                          <>→ {impressions} rodada(s) × {pieces} un / {partsPerProduct} por prod. = <strong style={{ color: '#00e5ff' }}>{Math.floor((impressions * pieces) / partsPerProduct)} produto(s)</strong></>
                        )}
                      </span>
                    </div>

                    {plates.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setPlacas(plates.filter((_, i) => i !== idx))}
                        className="btn btn-danger btn-icon"
                        style={{ width: 28, height: 28 }}
                        title="Remover placa"
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}

            <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
              <button
                type="button"
                onClick={() => setPlacas([...plates, {
                  id: Date.now(),
                  name: `Placa ${plates.length + 1}`,
                  copies: 1,
                  pieces_per_plate: 1,
                  parts_per_product: 1,
                  weight_g: 10.0,
                  print_time_min: 30,
                  layer_height: 0.20,
                  speed_mms: 300,
                  support: 'S/ Suporte',
                  brim: 'auto_brim 5mm',
                  filaments_used: [{ name: 'PLA', color_hex: '#10b981', weight_g: 10.0 }]
                }])}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              >
                <Plus size={13} />
                <span>Adicionar outra placa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderFilamentsSection = (isClassic = false) => (
    <div className="card" style={{ padding: isClassic ? '18px 20px' : '18px 22px', background: isClassic ? '#101925' : undefined }}>
      {isClassic ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 800 }}>3</div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>Filamentos</div>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Total: <strong style={{ color: 'var(--text-primary)' }}>{formatWeight(pricing?.totalWeight || 0)}</strong>
          </div>
        </div>
      ) : (
        <div onClick={() => setOpenSections({ ...openSections, filaments: !openSections.filaments })}
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 800 }}>2</div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Filamentos</h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>{selectedFilaments.map(f => f.name).join(' • ') || 'PLA'}</span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>qual filamento da sua biblioteca é cada cor da placa</div>
            </div>
          </div>
        </div>
      )}

      {(isClassic || openSections.filaments) && (
        <div style={{ marginTop: isClassic ? 0 : 18, borderTop: isClassic ? 'none' : '1px solid var(--border-color)', paddingTop: isClassic ? 0 : 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 14 }}>
            {selectedFilaments.map((item, idx) => {
              const weightRatio = (pricing?.singleCycleWeight > 0 && pricing?.totalWeight > 0)
                ? (pricing.totalWeight / pricing.singleCycleWeight)
                : 1;
              const filBatchWeight = (item.weightGrams || (pricing?.totalWeight ? pricing.totalWeight / selectedFilaments.length : 15)) * weightRatio;
              const filCost = filBatchWeight * (item.costPerGram || 0.095);
              return (
                <div key={item.id || idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: '#0d1520', borderRadius: 'var(--radius-md)', border: '1px solid rgba(0, 188, 212, 0.2)', gap: 14, flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: '130px' }}>
                    <div style={{ width: 14, height: 14, borderRadius: '50%', backgroundColor: item.colorHex || '#10b981', flexShrink: 0 }} />
                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#ffffff' }}>{item.type || 'PLA'}</span>
                    <div style={{
                      background: 'rgba(255, 255, 255, 0.05)',
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: 4,
                      padding: '3px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-mono)'
                    }}>
                      {formatWeight(filBatchWeight)}
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <select
                      className="form-control"
                      value={item.filamentId}
                      onChange={(e) => {
                        const filId = parseInt(e.target.value, 10);
                        const found = availableFilaments.find(f => f.id === filId);
                        if (found) {
                          setSelectedFilaments(selectedFilaments.map((f, i) => i === idx ? {
                            ...f,
                            filamentId: found.id,
                            name: `${found.brand} ${found.type}`,
                            colorHex: f.colorHex,
                            costPerGram: found.cost_per_gram
                          } : f));
                        }
                      }}
                      style={{ padding: '6px 10px', fontSize: '0.8125rem' }}
                    >
                      {availableFilaments.map(fil => (
                        <option key={fil.id} value={fil.id}>
                          {fil.brand} {fil.type} ({fil.color_name}) — {formatCurrency(fil.price)}/kg
                        </option>
                      ))}
                    </select>
                  </div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 800, color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>
                    {formatCurrency(filCost)}
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-muted)', paddingTop: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#10b981', fontWeight: 600 }}>
              <Check size={14} />
              <span>Mapeamento: {selectedFilaments.length} filamento(s)</span>
            </div>
            <div>Total: <strong style={{ color: 'var(--text-primary)' }}>{formatWeight(pricing?.totalWeight || 0)}</strong></div>
          </div>
        </div>
      )}
    </div>
  );
  const renderExtrasSection = (isClassic = false) => (
    <div className="card" style={{ padding: isClassic ? '18px 20px' : '18px 22px', background: isClassic ? '#101925' : undefined }}>
      {/* Header */}
      {isClassic ? (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.2)',
              color: '#fbbf24',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.75rem',
              fontWeight: 800
            }}>4</div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: 'var(--text-primary)' }}>
              Custos adicionais
            </div>
          </div>
          <button
            type="button"
            onClick={handleAddNewCustomExtra}
            className="btn btn-secondary"
            style={{ fontSize: '0.75rem', padding: '3px 8px', color: '#00bcd4' }}
          >
            <Plus size={12} />
            <span>Adicionar</span>
          </button>
        </div>
      ) : (
        <div
          onClick={() => setOpenSections({ ...openSections, extras: !openSections.extras })}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            userSelect: 'none'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              background: 'rgba(245, 158, 11, 0.15)',
              color: '#f59e0b',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '0.8125rem',
              fontWeight: 800
            }}>
              3
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Extras</h3>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  montagem {montagemPct}% (padrão da conta)
                </span>
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                ímãs, embalagem, montagem, imposto e taxa de plataforma
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📌 Manter aberto</span>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleAddNewCustomExtra();
              }}
              className="btn btn-secondary"
              style={{ fontSize: '0.75rem', padding: '4px 10px', color: '#00bcd4' }}
            >
              <Plus size={13} />
              <span>Adicionar</span>
            </button>
          </div>
        </div>
      )}

      {(isClassic || openSections.extras) && (
        <div style={{ marginTop: isClassic ? 0 : 18, borderTop: isClassic ? 'none' : '1px solid var(--border-color)', paddingTop: isClassic ? 0 : 16 }}>
          {/* Catalog Quick Chips */}
          {availableExtras.length > 0 && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 6 }}>
                Insumos cadastrados na biblioteca:
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {availableExtras.map(extra => (
                  <button
                    key={extra.id}
                    type="button"
                    onClick={() => handleAddCatalogExtra(extra)}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                  >
                    <Plus size={11} />
                    <span>{extra.name} ({formatCurrency(extra.unit_cost)})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Physical Extras Table */}
          {selectedExtras.length === 0 ? (
            <div style={{
              background: 'rgba(0, 0, 0, 0.2)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              textAlign: 'center',
              color: 'var(--text-muted)',
              fontSize: '0.8125rem',
              marginBottom: 16
            }}>
              Nenhum custo adicional. Itens externos como argolas, ímãs, molas, embalagens — custo por unidade de produto.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {selectedExtras.map((item, idx) => (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    background: '#0d1520',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    gap: 12
                  }}
                >
                  {/* Name input */}
                  <input
                    type="text"
                    value={item.name}
                    onChange={(e) => {
                      const val = e.target.value;
                      setSelectedExtras(selectedExtras.map((ex, i) => i === idx ? { ...ex, name: val } : ex));
                    }}
                    className="form-control"
                    style={{ flex: 1, padding: '4px 8px', fontSize: '0.8125rem' }}
                  />

                  {/* Qty */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Qtd:</span>
                    <input
                      type="number"
                      min="1"
                      value={item.qty || 1}
                      onChange={(e) => {
                        const val = parseInt(e.target.value, 10) || 1;
                        setSelectedExtras(selectedExtras.map((ex, i) => i === idx ? { ...ex, qty: val } : ex));
                      }}
                      className="form-control"
                      style={{ width: '55px', padding: '4px 6px', fontSize: '0.8125rem' }}
                    />
                  </div>

                  {/* Unit Cost */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>R$/un:</span>
                    <input
                      type="number"
                      step="0.10"
                      min="0"
                      value={item.unit_cost || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setSelectedExtras(selectedExtras.map((ex, i) => i === idx ? { ...ex, unit_cost: val } : ex));
                      }}
                      className="form-control"
                      style={{ width: '75px', padding: '4px 6px', fontSize: '0.8125rem' }}
                    />
                  </div>

                  {/* Total */}
                  <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', minWidth: '70px', textAlign: 'right' }}>
                    {formatCurrency((item.unit_cost || 0) * (item.qty || 1))}
                  </div>

                  {/* Trash */}
                  <button
                    type="button"
                    onClick={() => handleRemoveExtra(item.id)}
                    className="btn btn-danger btn-icon"
                    style={{ width: 28, height: 28 }}
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Total adicionais (conforme print de referência) */}
          {selectedExtras.length > 0 && (
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              alignItems: 'center',
              gap: 8,
              padding: '4px 4px 14px',
              fontSize: '0.875rem',
              fontWeight: 700
            }}>
              <span style={{ color: 'var(--text-muted)' }}>Total adicionais:</span>
              <span style={{ color: '#f472b6', fontSize: '1rem', fontFamily: 'var(--font-mono)' }}>
                {formatCurrency(selectedExtras.reduce((acc, e) => acc + ((e.unit_cost || 0) * (e.qty || 1)), 0))}
              </span>
            </div>
          )}

          {/* Indirect Percentage Toggles (Identical to 015041.png) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {/* 1. Montagem */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#0d1520',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🔧</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Montagem</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(% sobre custo)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={montagemPct}
                  onChange={(e) => setMontagemPct(parseFloat(e.target.value) || 0)}
                  className="form-control"
                  style={{ width: '60px', padding: '4px 8px', fontSize: '0.8125rem', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>
                <button
                  type="button"
                  onClick={() => setMontagemEnabled(!montagemEnabled)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: montagemEnabled ? '1px solid #10b981' : '1px solid var(--border-color)',
                    background: montagemEnabled ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: montagemEnabled ? '#10b981' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {montagemEnabled ? 'Sim' : 'Não'}
                </button>
              </div>
            </div>

            {/* 2. Taxa de Plataformas */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#0d1520',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>🏪</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Taxa de plataformas</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(% sobre venda)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={platformFeePct}
                  onChange={(e) => setMarketplaceFeePct(parseFloat(e.target.value) || 0)}
                  className="form-control"
                  style={{ width: '60px', padding: '4px 8px', fontSize: '0.8125rem', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>
                <button
                  type="button"
                  onClick={() => setPlatformFeeEnabled(!platformFeeEnabled)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: platformFeeEnabled ? '1px solid #10b981' : '1px solid var(--border-color)',
                    background: platformFeeEnabled ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: platformFeeEnabled ? '#10b981' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {platformFeeEnabled ? 'Sim' : 'Não'}
                </button>
              </div>
            </div>

            {/* 3. Impostos */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              background: '#0d1520',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span>💲</span>
                <span style={{ fontSize: '0.8125rem', fontWeight: 600 }}>Impostos</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>(% sobre venda)</span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  value={taxPct}
                  onChange={(e) => setTaxPct(parseFloat(e.target.value) || 0)}
                  className="form-control"
                  style={{ width: '60px', padding: '4px 8px', fontSize: '0.8125rem', textAlign: 'center' }}
                />
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>%</span>
                <button
                  type="button"
                  onClick={() => setTaxEnabled(!taxEnabled)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: 4,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    border: taxEnabled ? '1px solid #10b981' : '1px solid var(--border-color)',
                    background: taxEnabled ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                    color: taxEnabled ? '#10b981' : 'var(--text-muted)',
                    cursor: 'pointer'
                  }}
                >
                  {taxEnabled ? 'Sim' : 'Não'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
  const renderPriceSection = (isClassic = false) => (
    <div className="card" style={{ padding: '18px 22px' }}>
      <div
        onClick={() => setOpenSections({ ...openSections, price: !openSections.price })}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', userSelect: 'none', flexWrap: 'wrap', gap: 10 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0, 188, 212, 0.15)', color: '#00bcd4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8125rem', fontWeight: 800 }}>4</div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>Preço</h3>
              <span style={{ fontSize: '0.8125rem', color: (selectedFilaments.length > 0 && pricing?.salePrice > 0) ? 'var(--text-muted)' : '#f59e0b' }}>
                {(selectedFilaments.length > 0 && pricing?.salePrice > 0)
                  ? `custo ${formatCurrency(pricing.unitCost)}/un • venda ${formatCurrency(pricing.unitSalePrice)}/un (${markup.toFixed(1)}x)${pricing.finishedProducts > 1 ? ` • total ${formatCurrency(pricing.totalSalePrice)} (${pricing.finishedProducts} un)` : ''}`
                  : 'Aguardando seleção do filamento...'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>de onde vem o custo e quanto cobrar por cima dele</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleOpenCostSettingsModal();
            }}
            className="btn btn-secondary"
            style={{
              fontSize: '0.75rem',
              padding: '5px 12px',
              borderRadius: 6,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              color: '#38bdf8',
              borderColor: 'rgba(56, 189, 248, 0.25)',
              background: 'rgba(56, 189, 248, 0.08)'
            }}
          >
            <Sliders size={13} />
            <span>Custos padrão</span>
          </button>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>📌 Manter aberto</span>
        </div>
      </div>

      {(isClassic || openSections.price) && (
        <div style={{ marginTop: 18, borderTop: '1px solid var(--border-color)', paddingTop: 16 }}>
          {(!pricing?.hasFilament || selectedFilaments.length === 0) ? (
            <div style={{ background: 'rgba(0, 188, 212, 0.05)', border: '1px dashed rgba(0, 188, 212, 0.35)', borderRadius: 'var(--radius-lg)', padding: '36px 20px', textAlign: 'center', margin: '8px 0 20px' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(0, 188, 212, 0.12)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12, color: '#00bcd4' }}>
                <Info size={22} />
              </div>
              <h4 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 6 }}>Selecione o filamento para calcular o preço</h4>
              <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', maxWidth: '440px', margin: '0 auto 16px', lineHeight: 1.5 }}>
                O cálculo de custo dos materiais e o preço de venda da peça só aparecem após você escolher o carretel da sua biblioteca.
              </p>
              <button type="button" onClick={() => setOpenSections(prev => ({ ...prev, filaments: true }))} className="btn btn-secondary" style={{ fontSize: '0.8125rem', color: '#00e5ff', borderColor: 'rgba(0, 188, 212, 0.4)' }}>
                Selecionar Filamento
              </button>
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 20 }}>
                <div style={{ background: '#0e2238', border: '1px solid rgba(0, 188, 212, 0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 600 }}>⚖ Material</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 6 }}>{pricing ? formatCurrency(pricing.materialCost) : 'R$ 0,00'}</div>
                  {pricing?.finishedProducts > 1 && (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      Total lote: {formatCurrency(pricing.materialCostTotal)}
                    </div>
                  )}
                </div>
                <div style={{ background: '#1e1b38', border: '1px solid rgba(168, 85, 247, 0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#c084fc', fontWeight: 600 }}>⚡ Margem do material</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 6 }}>{pricing ? formatCurrency(pricing.materialMarginCost) : 'R$ 0,00'}</div>
                  {pricing?.finishedProducts > 1 && (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      Total lote: {formatCurrency(pricing.materialMarginCostTotal)}
                    </div>
                  )}
                </div>
                <div style={{ background: '#0e1e32', border: '1px solid rgba(59, 130, 246, 0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#60a5fa', fontWeight: 600 }}>⏱ Hora-máquina</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 6 }}>{pricing ? formatCurrency(pricing.machineDepreciationCost) : 'R$ 0,00'}</div>
                  {pricing?.finishedProducts > 1 && (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      Total lote: {formatCurrency(pricing.machineDepreciationCostTotal)}
                    </div>
                  )}
                </div>
                <div style={{ background: '#242014', border: '1px solid rgba(245, 158, 11, 0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#fbbf24', fontWeight: 600 }}>⚡ Energia</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 6 }}>{pricing ? formatCurrency(pricing.energyCost) : 'R$ 0,00'}</div>
                  {pricing?.finishedProducts > 1 && (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      Total lote: {formatCurrency(pricing.energyCostTotal)}
                    </div>
                  )}
                </div>
                <div style={{ background: '#231818', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#f87171', fontWeight: 600 }}>🔧 Montagem</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 6 }}>{pricing ? formatCurrency(pricing.laborAssemblyCost) : 'R$ 0,00'}</div>
                  {pricing?.finishedProducts > 1 && (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      Total lote: {formatCurrency(pricing.laborAssemblyCostTotal)}
                    </div>
                  )}
                </div>
                <div style={{ background: '#2a1424', border: '1px solid rgba(236, 72, 153, 0.25)', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                  <div style={{ fontSize: '0.75rem', color: '#f472b6', fontWeight: 600 }}>📦 Adicionais</div>
                  <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 6 }}>{pricing ? formatCurrency(pricing.additionalCostsTotal) : 'R$ 0,00'}</div>
                  {pricing?.finishedProducts > 1 && (
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      Total lote: {formatCurrency(pricing.additionalCostsTotalBatch)}
                    </div>
                  )}
                </div>
                <div style={{ background: '#121f2d', border: '1px solid #00bcd4', borderRadius: 'var(--radius-md)', padding: '14px 16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ fontSize: '0.75rem', color: '#00bcd4', fontWeight: 700 }}>$ Custo Total</div>
                    {pricing?.finishedProducts > 1 && (
                      <div style={{ fontSize: '0.6875rem', color: '#38bdf8', fontWeight: 700 }}>{pricing.finishedProducts} un</div>
                    )}
                  </div>
                  <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#00e5ff', fontFamily: 'var(--font-mono)', marginTop: 6 }}>
                    {pricing ? formatCurrency(pricing.totalCost) : 'R$ 0,00'}
                  </div>
                  {pricing?.finishedProducts > 1 && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2, fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(pricing.unitCost)} / un
                    </div>
                  )}
                </div>
              </div>

              {!clientMode && pricing && (
                <div style={{ background: '#0d1520', border: '1px solid rgba(0, 188, 212, 0.2)', borderRadius: 'var(--radius-md)', padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                        {pricing.finishedProducts > 1 ? `Preço de Venda Total (${pricing.finishedProducts} un)` : 'Preço de Venda'}
                      </div>
                      <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(pricing.totalSalePrice)}
                      </div>
                      {pricing.finishedProducts > 1 && (
                        <div style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(pricing.unitSalePrice)} / un
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#fb7185' }}>Impostos ({pricing.taxPct}%)</div>
                      <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fb7185', fontFamily: 'var(--font-mono)' }}>
                        -{formatCurrency(pricing.taxCostTotal || pricing.taxCost)}
                      </div>
                      {pricing.finishedProducts > 1 && (
                        <div style={{ fontSize: '0.6875rem', color: '#fda4af', fontFamily: 'var(--font-mono)' }}>
                          -{formatCurrency(pricing.taxCost)} / un
                        </div>
                      )}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', color: '#fb7185' }}>Taxa Plataforma ({pricing.marketplaceFeePct}%)</div>
                      <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: '#fb7185', fontFamily: 'var(--font-mono)' }}>
                        -{formatCurrency(pricing.marketplaceFeeCostTotal || pricing.marketplaceFeeCost)}
                      </div>
                      {pricing.finishedProducts > 1 && (
                        <div style={{ fontSize: '0.6875rem', color: '#fda4af', fontFamily: 'var(--font-mono)' }}>
                          -{formatCurrency(pricing.marketplaceFeeCost)} / un
                        </div>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 700 }}>
                      {pricing.finishedProducts > 1 ? `LUCRO LÍQUIDO TOTAL (${pricing.finishedProducts} UN)` : 'LUCRO LÍQUIDO'}
                    </div>
                    <div style={{ fontSize: '1.375rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(pricing.profitNetTotal || pricing.profitNet)}
                      <span style={{ fontSize: '0.875rem', marginLeft: 6, fontWeight: 700 }}>({formatPercent(pricing.profitMarginPct)})</span>
                    </div>
                    {pricing.finishedProducts > 1 && (
                      <div style={{ fontSize: '0.75rem', color: '#34d399', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(pricing.profitNet)} / un
                      </div>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
  return (
    <div className="page-wrapper animate-fade-in" style={{ paddingBottom: 40 }}>
      {/* Editing alert */}
      {editingProduct && (
        <div style={{ background: 'rgba(0, 188, 212, 0.12)', border: '1px solid #00bcd4', borderRadius: 'var(--radius-md)', padding: '10px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#00e5ff', fontSize: '0.875rem', fontWeight: 600 }}>
            <Sliders size={16} />
            <span>Modo de Edição: Alterando produto "{editingProduct.name}"</span>
          </div>
          <button type="button" onClick={() => { if (onClearEditingProduct) onClearEditingProduct(); setProductName(''); setProductDesc(''); }} className="btn btn-secondary" style={{ fontSize: '0.75rem', padding: '4px 10px' }}>
            Cancelar edição
          </button>
        </div>
      )}

      {/* Message alert */}
      {message && (
        <div style={{ marginBottom: 16, padding: '10px 16px', borderRadius: 'var(--radius-md)', backgroundColor: message.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)', border: `1px solid ${message.type === 'success' ? 'rgba(16, 185, 129, 0.3)' : 'rgba(244, 63, 94, 0.3)'}`, color: message.type === 'success' ? '#34d399' : '#fb7185', fontSize: '0.8125rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
            <span>{message.text}</span>
          </div>
          <button onClick={() => setMessage(null)} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer' }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Product header bar (Steps mode) */}
      {!isClassic && (
        <>
          {/* Card 1: Photo + Name + Desc */}
          <div style={{ background: '#101925', border: '1px solid rgba(0, 188, 212, 0.2)', borderRadius: 'var(--radius-lg)', padding: '20px 24px', marginBottom: 14 }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 18 }}>
              <div
                onClick={() => imageInputRef.current?.click()}
                title="Clique para carregar ou trocar a foto do produto"
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 'var(--radius-md)',
                  background: imageUrl ? '#090f17' : 'rgba(14, 22, 34, 0.7)',
                  border: '1px dashed rgba(0, 188, 212, 0.35)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-muted)',
                  flexShrink: 0,
                  cursor: 'pointer',
                  position: 'relative',
                  overflow: 'hidden'
                }}
              >
                {imageUrl ? (
                  <img
                    src={imageUrl}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      if (!e.currentTarget.dataset.retried && imageUrl.startsWith('/uploads')) {
                        e.currentTarget.dataset.retried = 'true';
                        e.currentTarget.src = `http://localhost:5172${imageUrl}`;
                      } else {
                        e.currentTarget.style.display = 'none';
                      }
                    }}
                  />
                ) : (
                  <>
                    <Camera size={22} color="#00bcd4" />
                    <span style={{ fontSize: '0.625rem', marginTop: 4, textAlign: 'center', lineHeight: 1.1, color: 'var(--text-muted)' }}>Foto do produto</span>
                  </>
                )}
                <div
                  style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.2s', color: '#fff' }}
                  onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                  onMouseLeave={(e) => e.currentTarget.style.opacity = '0'}
                >
                  <Upload size={18} />
                </div>
              </div>
              <input type="file" ref={imageInputRef} onChange={handleProductImageUpload} accept="image/*" style={{ display: 'none' }} />

              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <input
                  type="text"
                  placeholder="Nome do produto (obrigatório para salvar)"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  className="form-control"
                  style={{
                    fontSize: '0.9375rem',
                    fontWeight: 700,
                    background: 'rgba(14, 22, 34, 0.6)',
                    borderColor: productName ? 'rgba(0, 188, 212, 0.4)' : 'var(--border-color)'
                  }}
                />
                <input
                  type="text"
                  placeholder="Descrição (opcional)"
                  value={productDesc}
                  onChange={(e) => setProductDesc(e.target.value)}
                  className="form-control"
                  style={{
                    fontSize: '0.8125rem',
                    background: 'rgba(14, 22, 34, 0.4)'
                  }}
                />
              </div>
            </div>
          </div>

          {/* Card 2: Sticky Values Summary Bar (Desce junto conforme rola a página - conforme Prints 2 a 5) */}
          <div style={{
            position: 'sticky',
            top: 10,
            zIndex: 85,
            background: '#0a121c',
            border: '1px solid rgba(0, 188, 212, 0.22)',
            borderRadius: 'var(--radius-lg)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(12px)',
            marginBottom: 10,
            overflow: 'hidden'
          }}>
            {/* Banner when no file is imported yet (conforme Print 2) */}
            {(!uploadedFile && plates.every(p => p.isEmpty)) && (
              <div style={{
                background: '#1a1408',
                borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
                padding: '8px 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                fontSize: '0.8125rem',
                color: '#fbbf24'
              }}>
                <AlertCircle size={15} color="#f59e0b" />
                <span>Adicione um arquivo para calcular o custo</span>
                <span
                  onClick={() => fileInputRef.current?.click()}
                  style={{ textDecoration: 'underline', cursor: 'pointer', fontWeight: 700, color: '#f59e0b' }}
                >
                  Escolher arquivo
                </span>
              </div>
            )}

            <div style={{ padding: '16px 22px' }}>
              {(!uploadedFile && plates.every(p => p.isEmpty)) ? (
                /* Empty state (Print 2): Values on left, buttons on right */
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 16
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        CUSTO TOTAL
                      </div>
                      <div style={{ fontSize: '1.4375rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        —
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        PREÇO DE VENDA
                      </div>
                      <div style={{ fontSize: '1.4375rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        —
                      </div>
                    </div>
                    <div>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        MARGEM
                      </div>
                      <div style={{ fontSize: '1.4375rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        —
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={handleGenerateQuote}
                      className="btn btn-secondary"
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.8125rem',
                        color: '#00e5ff',
                        borderColor: 'rgba(0, 188, 212, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <FileText size={15} />
                      <span>Gerar orçamento</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProduct}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 20px',
                        fontSize: '0.8125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Save size={15} />
                      <span>{editingProduct ? 'Atualizar produto' : 'Salvar produto'}</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Populated state (Prints 3, 4, 5): Metrics on top, buttons below */
                <>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 28
                  }}>
                    {/* 1. Custo Total */}
                    <div style={{ minWidth: '110px' }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {pricing?.finishedProducts > 1 ? 'CUSTO TOTAL /UN' : 'CUSTO TOTAL'}
                      </div>
                      <div style={{ fontSize: '1.4375rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        {(selectedFilaments.length > 0 && pricing?.unitCost > 0)
                          ? formatCurrency(pricing.unitCost)
                          : '—'}
                      </div>
                    </div>

                    {/* 2. Preço de Venda */}
                    <div style={{ minWidth: '120px' }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        {pricing?.finishedProducts > 1 ? 'PREÇO DE VENDA /UN' : 'PREÇO DE VENDA'}
                      </div>
                      <div style={{ fontSize: '1.4375rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                        {(selectedFilaments.length > 0 && pricing?.salePrice > 0)
                          ? formatCurrency(pricing.unitSalePrice)
                          : '—'}
                      </div>
                    </div>

                    {/* 3. Markup com slider de 1 a 10 e presets 2x, 3x, 5x */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        MARKUP
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <input
                          type="range"
                          min="1.0"
                          max="10.0"
                          step="0.1"
                          value={markup}
                          onChange={(e) => setMarkup(parseFloat(e.target.value) || 2.0)}
                          style={{ width: 100, accentColor: '#00bcd4', cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#ffffff', fontFamily: 'var(--font-mono)', minWidth: '36px' }}>
                          {markup.toFixed(1).replace('.', ',')}×
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                          {[2, 3, 5].map(pVal => {
                            const isActive = Math.abs(markup - pVal) < 0.05;
                            return (
                              <button
                                key={pVal}
                                type="button"
                                onClick={() => setMarkup(pVal)}
                                style={{
                                  padding: '2px 8px',
                                  borderRadius: 14,
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  background: isActive ? 'rgba(0, 188, 212, 0.18)' : 'transparent',
                                  border: isActive ? '1px solid #00bcd4' : '1px solid rgba(255, 255, 255, 0.16)',
                                  color: isActive ? '#00e5ff' : 'var(--text-muted)',
                                  cursor: 'pointer',
                                  lineHeight: 1.2
                                }}
                              >
                                {pVal}x
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    {/* 4. Margem: porcentagem e valor */}
                    <div style={{ minWidth: '120px' }}>
                      <div style={{ fontSize: '0.6875rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                        MARGEM
                      </div>
                      <div style={{ fontSize: '1.4375rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: 4, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                        <span>{pricing?.hasFilament ? formatPercent(pricing.profitMarginPct) : '—'}</span>
                        {pricing?.hasFilament && (
                          <span style={{ fontSize: '0.875rem', color: '#34d399', fontWeight: 700 }}>
                            ({formatCurrency(pricing.profitNet)})
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Buttons below row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 14 }}>
                    <button
                      type="button"
                      onClick={handleGenerateQuote}
                      className="btn btn-secondary"
                      style={{
                        padding: '8px 16px',
                        fontSize: '0.8125rem',
                        color: '#00e5ff',
                        borderColor: 'rgba(0, 188, 212, 0.35)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <FileText size={15} />
                      <span>Gerar orçamento</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveProduct}
                      className="btn btn-primary"
                      style={{
                        padding: '8px 20px',
                        fontSize: '0.8125rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Save size={15} />
                      <span>{editingProduct ? 'Atualizar produto' : 'Salvar produto'}</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Toggle all accordions */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
            <button
              type="button"
              onClick={toggleAllSections}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--text-muted)',
                fontSize: '0.75rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 4
              }}
            >
              <span>{Object.values(openSections).every(v => v) ? '↘ Recolher todos' : '↗ Abrir todos'}</span>
            </button>
          </div>
        </>
      )}

      {/* Main Content: Classic or Steps */}
      {isClassic ? (
        <div className="classic-layout-grid">
          {/* Column 1: Produto */}
          <div>
            {renderProductCard()}
          </div>

          {/* Column 2: Placas de Impressão */}
          <div>
            {renderPieceSection(true)}
          </div>

          {/* Column 3: Filamentos & Custos adicionais */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {renderFilamentsSection(true)}
            {renderExtrasSection(true)}
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {renderPieceSection(false)}
          {renderFilamentsSection(false)}
          {renderExtrasSection(false)}
          {renderPriceSection(false)}
        </div>
      )}

      {/* Modal: Configurações de Custo (conforme Print 2) */}
      <Modal
        isOpen={costModalOpen}
        onClose={() => setCostModalOpen(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 32,
              height: 32,
              borderRadius: '50%',
              background: 'rgba(0, 188, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Settings size={18} color="#00bcd4" />
            </div>
            <div>
              <div style={{ fontSize: '1.0625rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Configurações de Custo
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                Parâmetros para cálculo de preços
              </div>
            </div>
          </div>
        }
        footer={
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 10, width: '100%' }}>
            <button
              type="button"
              onClick={() => setCostModalOpen(false)}
              className="btn btn-secondary"
              style={{ padding: '8px 18px', fontSize: '0.875rem' }}
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSaveCostSettings}
              disabled={costFormSaving}
              className="btn btn-primary"
              style={{ padding: '8px 24px', fontSize: '0.875rem' }}
            >
              {costFormSaving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Detected printer banner */}
          <div style={{
            background: 'rgba(16, 185, 129, 0.1)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '12px 14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 28,
                height: 28,
                borderRadius: '50%',
                background: 'rgba(16, 185, 129, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981',
                flexShrink: 0
              }}>
                <Cpu size={15} />
              </div>
              <span style={{ fontSize: '0.8125rem', color: '#e2e8f0', lineHeight: 1.4 }}>
                Detectamos uma <strong>{printers.find(p => p.id === parseInt(costForm.printerId, 10))?.name || printers[0]?.name || 'Bambu Lab A1'}</strong> no seu arquivo. Aplicar {printers.find(p => p.id === parseInt(costForm.printerId, 10))?.power_watts || 150}W e R$ {(printers.find(p => p.id === parseInt(costForm.printerId, 10))?.hourly_cost || 0.25).toFixed(2).replace('.', ',')}/h?
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                const targetPrinter = printers.find(p => p.id === parseInt(costForm.printerId, 10)) || printers[0];
                if (targetPrinter) {
                  setCostForm(prev => ({
                    ...prev,
                    printerPowerW: targetPrinter.power_watts || 150,
                    machineHourCost: targetPrinter.hourly_cost || 0.25
                  }));
                }
              }}
              style={{
                background: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 14px',
                fontSize: '0.8125rem',
                fontWeight: 700,
                cursor: 'pointer',
                flexShrink: 0
              }}
            >
              Aplicar
            </button>
          </div>

          {/* Minha impressora */}
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
              Minha impressora
            </label>
            <select
              value={costForm.printerId}
              onChange={(e) => {
                const pId = e.target.value;
                const found = printers.find(p => p.id === parseInt(pId, 10));
                setCostForm(prev => ({
                  ...prev,
                  printerId: pId,
                  printerPowerW: found?.power_watts || prev.printerPowerW,
                  machineHourCost: found?.hourly_cost || prev.machineHourCost
                }));
              }}
              className="form-control"
              style={{ padding: '8px 12px', fontSize: '0.875rem' }}
            >
              {printers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.name} — {p.power_watts || 150}W · R$ {(p.hourly_cost || 0.25).toFixed(2).replace('.', ',')}/h
                </option>
              ))}
            </select>
          </div>

          {/* Grid 2 colunas: Margem & Custo hora */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                <span>Margem de material</span>
                <HelpCircle size={13} style={{ opacity: 0.6 }} />
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="1"
                  min="0"
                  max="100"
                  value={costForm.failureMarginPct}
                  onChange={(e) => setCostForm({ ...costForm, failureMarginPct: e.target.value })}
                  className="form-control"
                  style={{ paddingRight: 32, fontSize: '0.875rem' }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>%</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                <span>Custo por hora de impressão</span>
                <HelpCircle size={13} style={{ opacity: 0.6 }} />
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>R$</span>
                <input
                  type="number"
                  step="0.05"
                  min="0"
                  value={costForm.machineHourCost}
                  onChange={(e) => setCostForm({ ...costForm, machineHourCost: e.target.value })}
                  className="form-control"
                  style={{ paddingLeft: 36, fontSize: '0.875rem' }}
                />
              </div>
            </div>
          </div>

          {/* Grid 2 colunas: Potência & Custo kWh */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                <span>Potência da impressora</span>
                <HelpCircle size={13} style={{ opacity: 0.6 }} />
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="number"
                  step="10"
                  min="0"
                  value={costForm.printerPowerW}
                  onChange={(e) => setCostForm({ ...costForm, printerPowerW: e.target.value })}
                  className="form-control"
                  style={{ paddingRight: 32, fontSize: '0.875rem' }}
                />
                <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>W</span>
              </div>
            </div>

            <div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
                <span>Custo do kWh</span>
                <HelpCircle size={13} style={{ opacity: 0.6 }} />
              </label>
              <div style={{ position: 'relative', marginBottom: 8 }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>R$</span>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={costForm.kwhCost}
                  onChange={(e) => setCostForm({ ...costForm, kwhCost: e.target.value })}
                  className="form-control"
                  style={{ paddingLeft: 36, fontSize: '0.875rem' }}
                />
              </div>

              <select
                value={costForm.selectedStateUf}
                onChange={(e) => {
                  const uf = e.target.value;
                  const found = BRAZIL_STATE_TARIFFS.find(t => t.uf === uf);
                  setCostForm(prev => ({
                    ...prev,
                    selectedStateUf: uf,
                    kwhCost: found ? found.kwh : prev.kwhCost
                  }));
                }}
                className="form-control"
                style={{ fontSize: '0.75rem', padding: '5px 8px', color: 'var(--text-secondary)' }}
              >
                <option value="">Não sei — usar a média do meu estado...</option>
                {BRAZIL_STATE_TARIFFS.map(t => (
                  <option key={t.uf} value={t.uf}>
                    {t.uf} — {t.name} (R$ {t.kwh.toFixed(2).replace('.', ',')}/kWh)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Custo de montagem padrão */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
              <span>Custo de montagem padrão</span>
              <HelpCircle size={13} style={{ opacity: 0.6 }} />
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="1"
                min="0"
                max="100"
                value={costForm.montagemPct}
                onChange={(e) => setCostForm({ ...costForm, montagemPct: e.target.value })}
                className="form-control"
                style={{ paddingRight: 32, fontSize: '0.875rem' }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>%</span>
            </div>
          </div>

          {/* Taxa de plataformas padrão */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
              <span>Taxa de plataformas padrão</span>
              <HelpCircle size={13} style={{ opacity: 0.6 }} />
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={costForm.platformFeePct}
                onChange={(e) => setCostForm({ ...costForm, platformFeePct: e.target.value })}
                className="form-control"
                style={{ paddingRight: 32, fontSize: '0.875rem' }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>%</span>
            </div>
          </div>

          {/* Impostos padrão */}
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: 6, fontWeight: 600 }}>
              <span>Impostos padrão</span>
              <HelpCircle size={13} style={{ opacity: 0.6 }} />
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type="number"
                step="0.5"
                min="0"
                max="100"
                value={costForm.taxPct}
                onChange={(e) => setCostForm({ ...costForm, taxPct: e.target.value })}
                className="form-control"
                style={{ paddingRight: 32, fontSize: '0.875rem' }}
              />
              <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.8125rem' }}>%</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}

export default Calculator;
