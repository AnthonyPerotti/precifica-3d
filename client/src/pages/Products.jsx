import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Plus,
  Package,
  Layers,
  Clock,
  Scale,
  Edit2,
  Trash2,
  ChevronDown,
  ChevronUp,
  FileText,
  ShoppingBag,
  Zap,
  Info,
  Sparkles,
  DollarSign,
  MoreVertical,
  Camera,
  Check,
  Globe,
  Disc,
  Settings,
  Tag
} from 'lucide-react';
import { api } from '../api/client.js';
import { Modal } from '../components/common/Modal.jsx';
import { formatCurrency, formatWeight, formatTime, formatPercent } from '../utils/formatters.js';

export function Products({ clientMode, onNavigateToCalculator, onEditProduct, onGenerateOrder }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todos']);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [newCategoryModalOpen, setNewCategoryModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');

  // Contextual Menu
  const [menuOpenProductId, setMenuOpenProductId] = useState(null);

  // Detail Modal State
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [simulatedQty, setSimulatedQty] = useState(1);
  const [expandedPlateIndex, setExpandedPlateIndex] = useState(0);
  const [showAdvancedConfigs, setShowAdvancedConfigs] = useState(true);
  const [editingDesc, setEditingDesc] = useState(false);
  const [tempDesc, setTempDesc] = useState('');
  const [detailMessage, setDetailMessage] = useState(null);

  const modalImageInputRef = useRef(null);

  // Quick Create Modal
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [quickForm, setQuickForm] = useState({
    name: '',
    weight_g: 20,
    print_time_min: 45,
    material_cost: 2.0,
    markup: 2.0
  });

  // Close context menu on outside click
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (!e.target.closest('.card-context-menu')) {
        setMenuOpenProductId(null);
      }
    };
    window.addEventListener('mousedown', handleOutsideClick);
    return () => window.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  useEffect(() => {
    loadProducts();
  }, [selectedCategory, search, clientMode]);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedCategory && selectedCategory !== 'Todos') params.category = selectedCategory;
      if (search) params.search = search;
      if (clientMode) params.catalog_only = true;

      const data = await api.getProducts(params);
      setProducts(data.products || []);
      if (data.categories) setCategories(data.categories);
    } catch (err) {
      console.error('Erro ao carregar produtos:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetail = (product) => {
    setSelectedProduct(product);
    setSimulatedQty(1);
    setExpandedPlateIndex(0);
    setShowAdvancedConfigs(true);
    setEditingDesc(false);
    setTempDesc(product.description || '');
  };

  const handleDeleteProduct = async (id, e) => {
    if (e) e.stopPropagation();
    setMenuOpenProductId(null);
    if (!window.confirm('Tem certeza que deseja excluir este produto do catálogo?')) return;

    try {
      await api.deleteProduct(id);
      setProducts(products.filter(p => p.id !== id));
      if (selectedProduct?.id === id) setSelectedProduct(null);
    } catch (err) {
      alert(err.message || 'Falha ao excluir produto.');
    }
  };

  const handleToggleCatalog = async (id, e) => {
    if (e) e.stopPropagation();
    setMenuOpenProductId(null);
    try {
      const res = await api.toggleProductCatalog(id);
      setProducts(products.map(p => p.id === id ? { ...p, is_active_in_catalog: res.is_active_in_catalog } : p));
      if (selectedProduct?.id === id) {
        setSelectedProduct({ ...selectedProduct, is_active_in_catalog: res.is_active_in_catalog });
      }
    } catch (err) {
      alert(err.message || 'Erro ao alterar visibilidade no catálogo.');
    }
  };

  const handleModalImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedProduct) return;

    try {
      const formData = new FormData();
      formData.append('image', file);
      const uploadRes = await api.uploadProductImage(formData);
      if (uploadRes.imageUrl) {
        await api.updateProduct(selectedProduct.id, { image_url: uploadRes.imageUrl });
        const updated = { ...selectedProduct, image_url: uploadRes.imageUrl };
        setSelectedProduct(updated);
        setProducts(products.map(p => p.id === selectedProduct.id ? updated : p));
        setDetailMessage('Foto atualizada com sucesso!');
        setTimeout(() => setDetailMessage(null), 3000);
      }
    } catch (err) {
      alert(err.message || 'Erro ao atualizar foto do produto.');
    }
  };

  const handleSaveDescription = async () => {
    if (!selectedProduct) return;
    try {
      await api.updateProduct(selectedProduct.id, { description: tempDesc });
      const updated = { ...selectedProduct, description: tempDesc };
      setSelectedProduct(updated);
      setProducts(products.map(p => p.id === selectedProduct.id ? updated : p));
      setEditingDesc(false);
      setDetailMessage('Descrição atualizada!');
      setTimeout(() => setDetailMessage(null), 3000);
    } catch (err) {
      alert(err.message || 'Erro ao salvar descrição.');
    }
  };

  const handleQuickCreate = async (e) => {
    e.preventDefault();
    try {
      const weight = parseFloat(quickForm.weight_g) || 10;
      const time = parseInt(quickForm.print_time_min, 10) || 30;
      const mk = parseFloat(quickForm.markup) || 2.0;

      const matCost = weight * 0.095;
      const energyCost = (150 / 1000) * (time / 60) * 0.85;
      const machCost = (time / 60) * 1.5;
      const totalCost = matCost + energyCost + machCost;
      const salePrice = totalCost * mk;
      const gross = salePrice - totalCost;
      const net = gross * 0.85;

      await api.createProduct({
        name: quickForm.name,
        category: 'Geral',
        is_active_in_catalog: 1,
        total_weight_g: weight,
        total_print_time_min: time,
        material_cost: matCost,
        energy_cost: energyCost,
        machine_depreciation_cost: machCost,
        unit_cost: totalCost,
        sale_price: salePrice,
        markup: mk,
        profit_gross: gross,
        profit_net: net,
        profit_margin_pct: (net / salePrice) * 100,
        placas: [{ name: 'Placa 1', copies: 1, pieces_per_plate: 1, weight_g: weight, print_time_min: time, layer_height: 0.20 }]
      });

      setQuickCreateOpen(false);
      setQuickForm({ name: '', weight_g: 20, print_time_min: 45, material_cost: 2.0, markup: 2.0 });
      loadProducts();
    } catch (err) {
      alert(err.message || 'Erro ao criar produto rápido.');
    }
  };

  // Helper for Product Filaments
  const getProductFilaments = (prod) => {
    if (Array.isArray(prod?.filaments) && prod.filaments.length > 0) {
      return prod.filaments;
    }
    // Fallback from plates
    if (Array.isArray(prod?.placas)) {
      const fils = [];
      prod.placas.forEach(pl => {
        if (Array.isArray(pl.filaments_used)) {
          pl.filaments_used.forEach(f => fils.push(f));
        }
      });
      if (fils.length > 0) return fils;
    }
    return [{ name: 'PLA', colorHex: '#00bcd4', used_g: prod?.total_weight_g || 15, cost: prod?.material_cost || 1.8 }];
  };

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Top Header & Search Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        {/* Search */}
        <div style={{ position: 'relative', flex: 1, maxWidth: '380px' }}>
          <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
            <Search size={16} />
          </div>
          <input
            type="text"
            className="form-control"
            placeholder="Buscar produtos por nome ou descrição..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ paddingLeft: '40px', fontSize: '0.875rem' }}
          />
        </div>

        {/* Action Buttons */}
        {!clientMode && (
          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={() => setQuickCreateOpen(true)}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}
            >
              <Sparkles size={14} color="#00bcd4" />
              <span>Criação rápida</span>
            </button>
            <button
              type="button"
              onClick={onNavigateToCalculator}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}
            >
              <Plus size={14} />
              <span>Novo Produto (Calculadora)</span>
            </button>
          </div>
        )}
      </div>

      {/* Category Filter Pills */}
      <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, marginBottom: 20 }}>
        {categories.map(cat => (
          <button
            key={cat}
            type="button"
            onClick={() => setSelectedCategory(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: '9999px',
              border: selectedCategory === cat ? '1px solid #00bcd4' : '1px solid var(--border-color)',
              background: selectedCategory === cat ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-card)',
              color: selectedCategory === cat ? '#00e5ff' : 'var(--text-secondary)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Product Cards Grid */}
      {products.length === 0 && !loading ? (
        <div className="card" style={{
          textAlign: 'center',
          padding: '60px 20px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 16
        }}>
          <div style={{
            width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-input)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)'
          }}>
            <Package size={28} />
          </div>
          <div>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              Nenhum produto encontrado
            </h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginTop: 4 }}>
              Cadastre produtos usando a calculadora ou a criação rápida.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              type="button"
              onClick={() => setQuickCreateOpen(true)}
              className="btn btn-secondary"
            >
              Criar rápido (4 perguntas)
            </button>
            <button
              type="button"
              onClick={onNavigateToCalculator}
              className="btn btn-primary"
            >
              Usar calculadora (avançado)
            </button>
          </div>
        </div>
      ) : (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))',
          gap: 20
        }}>
          {products.map(prod => {
            const filamentsList = getProductFilaments(prod);
            const firstPlate = Array.isArray(prod.placas) && prod.placas.length > 0 ? prod.placas[0] : null;
            const piecesPerPlate = firstPlate?.pieces_per_plate || firstPlate?.copies || 1;
            const hasExtras = Array.isArray(prod.additionalCosts) && prod.additionalCosts.length > 0;
            const isCatalogActive = prod.is_active_in_catalog !== 0;

            return (
              <div
                key={prod.id}
                onClick={() => handleOpenDetail(prod)}
                className="card"
                style={{
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  padding: '16px',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = 'var(--border-color)';
                }}
              >
                {/* 1. Card Top: Thumbnail + Catalog Badge */}
                <div>
                  <div style={{
                    height: '146px',
                    background: 'radial-gradient(circle at center, #1a2736 0%, #0d1622 100%)',
                    borderRadius: 'var(--radius-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: 12,
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          if (!e.target.dataset.retried && prod.image_url && prod.image_url.startsWith('/uploads')) {
                            e.target.dataset.retried = 'true';
                            e.target.src = `http://localhost:5172${prod.image_url}`;
                          } else {
                            e.target.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <Package size={52} color="#00bcd4" opacity={0.6} />
                    )}

                    {/* Catalog Visibility Tag */}
                    <span style={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      background: isCatalogActive ? 'rgba(16, 185, 129, 0.85)' : 'rgba(100, 116, 139, 0.85)',
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: 4,
                      backdropFilter: 'blur(4px)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      <Globe size={11} />
                      <span>{isCatalogActive ? 'No catálogo' : 'Privado'}</span>
                    </span>

                    {/* Category pill */}
                    <span style={{
                      position: 'absolute',
                      bottom: 8,
                      left: 8,
                      fontSize: '0.6875rem',
                      background: 'rgba(0, 0, 0, 0.65)',
                      padding: '2px 8px',
                      borderRadius: 4,
                      color: 'var(--text-secondary)'
                    }}>
                      {prod.category || 'Geral'}
                    </span>
                  </div>

                  {/* Title and 3-dots Context Menu */}
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8, position: 'relative' }}>
                    <h3 style={{
                      fontSize: '1rem',
                      fontWeight: 700,
                      color: 'var(--text-primary)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      flex: 1
                    }} title={prod.name}>
                      {prod.name}
                    </h3>

                    {/* Context Menu Button (···) */}
                    {!clientMode && (
                      <div className="card-context-menu" style={{ position: 'relative' }}>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuOpenProductId(menuOpenProductId === prod.id ? null : prod.id);
                          }}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--text-muted)',
                            cursor: 'pointer',
                            padding: '4px',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Mais opções"
                        >
                          <MoreVertical size={18} />
                        </button>

                        {/* Dropdown Menu */}
                        {menuOpenProductId === prod.id && (
                          <div
                            onClick={(e) => e.stopPropagation()}
                            style={{
                              position: 'absolute',
                              right: 0,
                              top: '100%',
                              background: '#131e2b',
                              border: '1px solid rgba(0, 188, 212, 0.3)',
                              borderRadius: 'var(--radius-md)',
                              boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
                              zIndex: 100,
                              minWidth: '180px',
                              padding: '6px 0'
                            }}
                          >
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenProductId(null);
                                if (onEditProduct) onEditProduct(prod);
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 188, 212, 0.15)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Edit2 size={14} color="#00bcd4" />
                              <span>Editar</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setMenuOpenProductId(null);
                                if (onGenerateOrder) onGenerateOrder({ ...prod, qty: 1 });
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 188, 212, 0.15)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <ShoppingBag size={14} color="#10b981" />
                              <span>Criar pedido</span>
                            </button>

                            <button
                              type="button"
                              onClick={(e) => handleToggleCatalog(prod.id, e)}
                              style={{
                                width: '100%',
                                padding: '8px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-primary)',
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 188, 212, 0.15)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Globe size={14} color={isCatalogActive ? '#f59e0b' : '#10b981'} />
                              <span>{isCatalogActive ? 'Remover do catálogo' : 'Ativar no catálogo'}</span>
                            </button>

                            <div style={{ height: 1, background: 'var(--border-color)', margin: '4px 0' }} />

                            <button
                              type="button"
                              onClick={(e) => handleDeleteProduct(prod.id, e)}
                              style={{
                                width: '100%',
                                padding: '8px 14px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                                background: 'transparent',
                                border: 'none',
                                color: '#f43f5e',
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                textAlign: 'left'
                              }}
                              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(244, 63, 94, 0.15)'}
                              onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                            >
                              <Trash2 size={14} color="#f43f5e" />
                              <span>Excluir</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 2. Specs Colored Badges Pills (Identical to reference prints 2 & 3) */}
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
                    {/* Pieces per plate */}
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      background: 'rgba(99, 102, 241, 0.15)',
                      color: '#818cf8',
                      border: '1px solid rgba(99, 102, 241, 0.3)',
                      padding: '2px 7px',
                      borderRadius: 4
                    }}>
                      {piecesPerPlate} un/placa
                    </span>

                    {/* Time */}
                    <span style={{
                      fontSize: '0.6875rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-secondary)',
                      padding: '2px 7px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      ⏱ {formatTime(prod.total_print_time_min)}
                    </span>

                    {/* Weight */}
                    <span style={{
                      fontSize: '0.6875rem',
                      background: 'rgba(255, 255, 255, 0.05)',
                      color: 'var(--text-secondary)',
                      padding: '2px 7px',
                      borderRadius: 4,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4
                    }}>
                      ⚖ {formatWeight(prod.total_weight_g)}
                    </span>

                    {/* Markup Margin % */}
                    <span style={{
                      fontSize: '0.6875rem',
                      fontWeight: 700,
                      background: 'rgba(245, 158, 11, 0.15)',
                      color: '#fbbf24',
                      border: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '2px 7px',
                      borderRadius: 4
                    }}>
                      ↗ {Number(prod.markup || 2).toFixed(1)}x
                    </span>

                    {/* Extras */}
                    {hasExtras && (
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        background: 'rgba(6, 182, 212, 0.15)',
                        color: '#22d3ee',
                        border: '1px solid rgba(6, 182, 212, 0.3)',
                        padding: '2px 7px',
                        borderRadius: 4
                      }}>
                        +{prod.additionalCosts.length} extras
                      </span>
                    )}

                    {/* Assembly */}
                    {prod.labor_assembly_cost > 0 && (
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        background: 'rgba(249, 115, 22, 0.15)',
                        color: '#fb923c',
                        border: '1px solid rgba(249, 115, 22, 0.3)',
                        padding: '2px 7px',
                        borderRadius: 4
                      }}>
                        Mont. {formatCurrency(prod.labor_assembly_cost)}
                      </span>
                    )}

                    {/* Multi-color */}
                    {filamentsList.length > 1 && (
                      <span style={{
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        background: 'rgba(236, 72, 153, 0.15)',
                        color: '#f472b6',
                        border: '1px solid rgba(236, 72, 153, 0.3)',
                        padding: '2px 7px',
                        borderRadius: 4
                      }}>
                        🎨 {filamentsList.length} cores
                      </span>
                    )}
                  </div>
                </div>

                {/* 3. Card Footer: Plates count & Unit Sale Price */}
                <div style={{
                  borderTop: '1px solid var(--border-color)',
                  paddingTop: 12,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 5 }}>
                    <Layers size={13} color="#00bcd4" />
                    <span>{Array.isArray(prod.placas) ? prod.placas.length : 1} placa(s)</span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '1.25rem', fontWeight: 800, color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(prod.sale_price)} <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>/un</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ========================================================================= */}
      {/* DETAILED PRODUCT MODAL (Faithfully matches Reference Print 1) */}
      {/* ========================================================================= */}
      {selectedProduct && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedProduct(null)}
          title={selectedProduct.name}
          headerRight={
            !clientMode && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => handleToggleCatalog(selectedProduct.id)}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8125rem',
                    color: selectedProduct.is_active_in_catalog !== 0 ? '#10b981' : 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                  title="Visibilidade no Catálogo"
                >
                  <Globe size={14} />
                  <span>{selectedProduct.is_active_in_catalog !== 0 ? 'No Catálogo' : 'Oculto'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const prodToEdit = selectedProduct;
                    setSelectedProduct(null);
                    if (onEditProduct) onEditProduct(prodToEdit);
                  }}
                  className="btn btn-secondary"
                  style={{
                    padding: '6px 12px',
                    fontSize: '0.8125rem',
                    color: '#00e5ff',
                    borderColor: 'rgba(0, 188, 212, 0.4)',
                    background: 'rgba(0, 188, 212, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6
                  }}
                >
                  <Edit2 size={14} />
                  <span>Editar</span>
                </button>

                <button
                  type="button"
                  onClick={(e) => handleDeleteProduct(selectedProduct.id, e)}
                  className="btn btn-secondary btn-icon"
                  style={{ width: 32, height: 32, color: '#f43f5e' }}
                  title="Excluir produto"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )
          }
          maxWidth="1020px"
          footer={
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 12,
              fontSize: '0.75rem',
              color: 'var(--text-secondary)'
            }}>
              <div>⚖ Peso: <strong style={{ color: '#ffffff' }}>{formatWeight(selectedProduct.total_weight_g)}</strong></div>
              <div>•</div>
              <div>⏱ Tempo: <strong style={{ color: '#ffffff' }}>{formatTime(selectedProduct.total_print_time_min)}</strong></div>
              <div>•</div>
              <div>Custo: <strong style={{ color: '#f87171' }}>{formatCurrency(selectedProduct.unit_cost)}</strong></div>
              <div>•</div>
              <div>Venda: <strong style={{ color: '#00e5ff' }}>{formatCurrency(selectedProduct.sale_price)}</strong></div>
              <div>•</div>
              <div>Líquido: <strong style={{ color: '#10b981' }}>{formatCurrency(selectedProduct.profit_net)} ({formatPercent(selectedProduct.profit_margin_pct)})</strong></div>
              <div>•</div>
              <div>Montagem: <strong style={{ color: '#fbbf24' }}>{selectedProduct.labor_assembly_cost > 0 ? formatCurrency(selectedProduct.labor_assembly_cost) : '0%'}</strong></div>
              <div>•</div>
              <div>Markup: <strong style={{ color: '#c084fc' }}>{Number(selectedProduct.markup || 2).toFixed(1)}x</strong></div>
            </div>
          }
        >
          {detailMessage && (
            <div style={{
              background: 'rgba(16, 185, 129, 0.15)',
              border: '1px solid #10b981',
              color: '#34d399',
              padding: '8px 14px',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.8125rem',
              fontWeight: 600,
              marginBottom: 16,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <Check size={14} />
              <span>{detailMessage}</span>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1.05fr 1.15fr', gap: 24, alignItems: 'start' }}>
            {/* ============================================================ */}
            {/* LEFT COLUMN: Image, Descrição, Filamentos, Simulador de Lote */}
            {/* ============================================================ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 1. Preview Container with photo change button */}
              <div style={{
                height: '240px',
                borderRadius: 'var(--radius-lg)',
                overflow: 'hidden',
                background: 'radial-gradient(circle at center, #1b293b 0%, #0c141e 100%)',
                border: '1px solid rgba(0, 188, 212, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                position: 'relative'
              }}>
                {selectedProduct.image_url ? (
                  <img
                    src={selectedProduct.image_url}
                    alt={selectedProduct.name}
                    style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    onError={(e) => {
                      if (!e.target.dataset.retried && selectedProduct.image_url && selectedProduct.image_url.startsWith('/uploads')) {
                        e.target.dataset.retried = 'true';
                        e.target.src = `http://localhost:5172${selectedProduct.image_url}`;
                      } else {
                        e.target.style.display = 'none';
                      }
                    }}
                  />
                ) : (
                  <Package size={80} color="#00bcd4" opacity={0.4} />
                )}

                {/* Change photo button */}
                <button
                  type="button"
                  onClick={() => modalImageInputRef.current?.click()}
                  style={{
                    position: 'absolute',
                    top: 10,
                    right: 10,
                    background: 'rgba(15, 23, 42, 0.85)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#ffffff',
                    padding: '5px 10px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    backdropFilter: 'blur(4px)'
                  }}
                >
                  <Camera size={13} />
                  <span>Trocar foto</span>
                </button>
                <input
                  type="file"
                  ref={modalImageInputRef}
                  onChange={handleModalImageUpload}
                  accept="image/*"
                  style={{ display: 'none' }}
                />

                <div style={{
                  position: 'absolute',
                  bottom: 8,
                  left: 10,
                  fontSize: '0.6875rem',
                  background: 'rgba(0,0,0,0.65)',
                  padding: '3px 8px',
                  borderRadius: 4,
                  color: 'var(--text-muted)'
                }}>
                  {selectedProduct.category || 'Geral'}
                </div>
              </div>

              {/* 2. Seção DESCRIÇÃO */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <FileText size={14} />
                    <span>DESCRIÇÃO</span>
                  </div>

                  {!editingDesc ? (
                    <button
                      type="button"
                      onClick={() => setEditingDesc(true)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.6875rem', display: 'flex', alignItems: 'center', gap: 4 }}
                    >
                      <Edit2 size={11} />
                      <span>Editar</span>
                    </button>
                  ) : (
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button
                        type="button"
                        onClick={handleSaveDescription}
                        style={{ background: '#00bcd4', border: 'none', color: '#000', borderRadius: 4, padding: '2px 8px', fontSize: '0.6875rem', fontWeight: 700, cursor: 'pointer' }}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingDesc(false); setTempDesc(selectedProduct.description || ''); }}
                        style={{ background: 'transparent', border: '1px solid var(--border-color)', color: 'var(--text-muted)', borderRadius: 4, padding: '2px 8px', fontSize: '0.6875rem', cursor: 'pointer' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  )}
                </div>

                {editingDesc ? (
                  <textarea
                    className="form-control"
                    rows={3}
                    value={tempDesc}
                    onChange={(e) => setTempDesc(e.target.value)}
                    placeholder="Adicione detalhes do produto, acabamento ou instruções..."
                    style={{ fontSize: '0.8125rem' }}
                  />
                ) : (
                  <p style={{
                    fontSize: '0.8125rem',
                    color: selectedProduct.description ? 'var(--text-secondary)' : 'var(--text-muted)',
                    lineHeight: '1.5',
                    margin: 0,
                    whiteSpace: 'pre-wrap'
                  }}>
                    {selectedProduct.description || '+ Adicionar descrição...'}
                  </p>
                )}

                {/* Especificações Técnicas Detalhadas do Fatiamento */}
                {(() => {
                  const firstPlate = Array.isArray(selectedProduct.placas) && selectedProduct.placas.length > 0 ? selectedProduct.placas[0] : null;
                  const adv = firstPlate?.advanced_config || selectedProduct.advanced_config || {};
                  const layerH = firstPlate?.layer_height || selectedProduct.layer_height || 0.20;
                  const plateCount = Array.isArray(selectedProduct.placas) ? selectedProduct.placas.length : 1;
                  const fils = getProductFilaments(selectedProduct);

                  return (
                    <div style={{
                      marginTop: 12,
                      paddingTop: 10,
                      borderTop: '1px solid rgba(255, 255, 255, 0.08)',
                      display: 'flex',
                      flexWrap: 'wrap',
                      gap: 6
                    }}>
                      <span style={{ background: 'rgba(0, 188, 212, 0.12)', border: '1px solid rgba(0, 188, 212, 0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '0.6875rem', color: '#00e5ff', fontWeight: 600 }}>
                        Camada {layerH}mm
                      </span>
                      <span style={{ background: 'rgba(168, 85, 247, 0.12)', border: '1px solid rgba(168, 85, 247, 0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '0.6875rem', color: '#c084fc', fontWeight: 600 }}>
                        {plateCount} {plateCount === 1 ? 'Placa' : 'Placas'}
                      </span>
                      <span style={{ background: 'rgba(244, 114, 182, 0.12)', border: '1px solid rgba(244, 114, 182, 0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '0.6875rem', color: '#f472b6', fontWeight: 600 }}>
                        {fils.length} {fils.length === 1 ? 'Cor' : 'Cores'}
                      </span>
                      {adv.wall_generator && (
                        <span style={{ background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '0.6875rem', color: '#fbbf24' }}>
                          Paredes: {adv.wall_generator}
                        </span>
                      )}
                      {adv.support_type && (
                        <span style={{ background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '0.6875rem', color: '#34d399' }}>
                          Suporte: {adv.support_type}
                        </span>
                      )}
                      {adv.infill_density && (
                        <span style={{ background: 'rgba(99, 102, 241, 0.12)', border: '1px solid rgba(99, 102, 241, 0.3)', borderRadius: 4, padding: '2px 8px', fontSize: '0.6875rem', color: '#818cf8' }}>
                          Infill: {adv.infill_density}
                        </span>
                      )}
                      {adv.bed_type && (
                        <span style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid rgba(255, 255, 255, 0.15)', borderRadius: 4, padding: '2px 8px', fontSize: '0.6875rem', color: 'var(--text-secondary)' }}>
                          Mesa: {adv.bed_type}
                        </span>
                      )}
                    </div>
                  );
                })()}
              </div>

              {/* 3. Seção FILAMENTOS UTILIZADOS (conforme print 1) */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Disc size={14} />
                  <span>FILAMENTOS UTILIZADOS</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {getProductFilaments(selectedProduct).map((fil, idx) => {
                    const colorHex = fil.colorHex || fil.color_hex || '#00bcd4';
                    const weight = fil.used_g || fil.weightGrams || fil.weight_g || (selectedProduct.total_weight_g / getProductFilaments(selectedProduct).length);
                    const cost = fil.cost || (weight * 0.12);

                    return (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '6px 8px',
                          background: 'rgba(255, 255, 255, 0.02)',
                          borderRadius: 'var(--radius-sm)'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div
                            style={{
                              width: 14,
                              height: 14,
                              borderRadius: '50%',
                              background: colorHex,
                              border: '1px solid rgba(255, 255, 255, 0.3)',
                              flexShrink: 0
                            }}
                            title={colorHex}
                          />
                          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                            {fil.name || fil.type || 'PLA'}
                          </span>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: '0.8125rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>{formatWeight(weight)}</span>
                          <span style={{ fontWeight: 700, color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>
                            {formatCurrency(cost)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 4. SIMULADOR DE PRODUÇÃO (conforme print 1) */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid rgba(0, 188, 212, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '16px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#00bcd4', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <ShoppingBag size={15} />
                    <span>SIMULADOR DE PRODUÇÃO</span>
                  </div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                    (config. unidades atuais: {simulatedQty} un)
                  </span>
                </div>

                {/* Quick Qty Buttons & Input */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 14 }}>
                  {[1, 2, 5, 10, 50].map(q => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => setSimulatedQty(q)}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: simulatedQty === q ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                        background: simulatedQty === q ? 'rgba(0, 188, 212, 0.2)' : 'transparent',
                        color: simulatedQty === q ? '#00e5ff' : 'var(--text-muted)',
                        cursor: 'pointer'
                      }}
                    >
                      {q} un
                    </button>
                  ))}
                  <input
                    type="number"
                    min="1"
                    value={simulatedQty}
                    onChange={(e) => setSimulatedQty(Math.max(1, parseInt(e.target.value, 10) || 1))}
                    className="form-control"
                    style={{ width: '60px', padding: '3px 6px', fontSize: '0.75rem', textAlign: 'center' }}
                  />
                </div>

                {/* 4 Metric Cards Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 16 }}>
                  <div style={{ background: '#0e1724', padding: '10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>Filamento total</div>
                    <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#ffffff', marginTop: 2 }}>
                      {formatWeight(selectedProduct.total_weight_g * simulatedQty)}
                    </div>
                  </div>

                  <div style={{ background: '#0e1724', padding: '10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>Tempo total</div>
                    <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#ffffff', marginTop: 2 }}>
                      {formatTime(selectedProduct.total_print_time_min * simulatedQty)}
                    </div>
                  </div>

                  <div style={{ background: '#0e1724', padding: '10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>$ Custo material</div>
                    <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#38bdf8', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {formatCurrency((selectedProduct.material_cost || 0) * simulatedQty)}
                    </div>
                  </div>

                  <div style={{ background: '#0e1724', padding: '10px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                    <div style={{ color: 'var(--text-muted)', fontSize: '0.6875rem' }}>$ Custo total</div>
                    <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: '#f87171', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                      {formatCurrency((selectedProduct.unit_cost || 0) * simulatedQty)}
                    </div>
                  </div>
                </div>

                {/* Primary Action Button */}
                <button
                  type="button"
                  onClick={() => {
                    if (onGenerateOrder) {
                      onGenerateOrder({
                        ...selectedProduct,
                        qty: simulatedQty
                      });
                      setSelectedProduct(null);
                    }
                  }}
                  className="btn btn-primary"
                  style={{ width: '100%', padding: '10px', fontSize: '0.875rem', fontWeight: 700 }}
                >
                  Gerar orçamento de {simulatedQty} un.
                </button>

                <div style={{ textAlign: 'center', marginTop: 8 }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (onGenerateOrder) {
                        onGenerateOrder({
                          ...selectedProduct,
                          qty: simulatedQty
                        });
                        setSelectedProduct(null);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '0.75rem', textDecoration: 'underline', cursor: 'pointer' }}
                  >
                    Criar pedido em vez disso
                  </button>
                </div>
              </div>
            </div>

            {/* ============================================================ */}
            {/* RIGHT COLUMN: Decomposição de Preço, Custos Adicionais, Placas */}
            {/* ============================================================ */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* 1. Tabela de Decomposição de Preço */}
              <div style={{
                background: 'var(--bg-input)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                border: '1px solid var(--border-color)'
              }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#00bcd4', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <DollarSign size={15} />
                  <span>DE ONDE VEM O PREÇO</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: '0.8125rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Material (filamento)</span>
                    <span>{formatCurrency(selectedProduct.material_cost)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Margem de perda</span>
                    <span>{formatCurrency(selectedProduct.material_margin_cost)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Tempo de impressão (máquina)</span>
                    <span>{formatCurrency(selectedProduct.machine_depreciation_cost)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Energia elétrica</span>
                    <span>{formatCurrency(selectedProduct.energy_cost)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Custos adicionais</span>
                    <span>{formatCurrency(selectedProduct.additional_costs_total)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'var(--text-secondary)' }}>Montagem manual</span>
                    <span>{formatCurrency(selectedProduct.labor_assembly_cost)}</span>
                  </div>

                  <div style={{
                    borderTop: '1px dashed var(--border-color)',
                    paddingTop: 6,
                    marginTop: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 700
                  }}>
                    <span>Custo total unitário:</span>
                    <span style={{ color: 'var(--text-primary)' }}>{formatCurrency(selectedProduct.unit_cost)}</span>
                  </div>

                  <div style={{
                    borderTop: '1px solid var(--border-color)',
                    paddingTop: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontWeight: 800,
                    fontSize: '0.9375rem'
                  }}>
                    <span>Preço de Venda ({Number(selectedProduct.markup || 2).toFixed(1)}x):</span>
                    <span style={{ color: '#00e5ff' }}>{formatCurrency(selectedProduct.sale_price)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fb7185', fontSize: '0.75rem' }}>
                    <span>Impostos estimados:</span>
                    <span>-{formatCurrency(selectedProduct.tax_cost)}</span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#fb7185', fontSize: '0.75rem' }}>
                    <span>Taxa de plataforma estimada:</span>
                    <span>-{formatCurrency(selectedProduct.marketplace_fee_cost)}</span>
                  </div>

                  <div style={{
                    borderTop: '1px solid rgba(16, 185, 129, 0.3)',
                    paddingTop: 8,
                    marginTop: 4,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    fontWeight: 700,
                    color: '#10b981'
                  }}>
                    <span>Lucro Líquido por unidade:</span>
                    <span style={{ fontSize: '1.0625rem' }}>
                      {formatCurrency(selectedProduct.profit_net)} ({formatPercent(selectedProduct.profit_margin_pct)})
                    </span>
                  </div>
                </div>
              </div>

              {/* 2. Seção CUSTOS ADICIONAIS detalhados (conforme print 1) */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Tag size={13} />
                  <span>CUSTOS ADICIONAIS</span>
                </div>

                {Array.isArray(selectedProduct.additionalCosts) && selectedProduct.additionalCosts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {selectedProduct.additionalCosts.map((extra, i) => (
                      <div
                        key={extra.id || i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          fontSize: '0.8125rem',
                          padding: '4px 0',
                          borderBottom: '1px solid rgba(255,255,255,0.04)'
                        }}
                      >
                        <span style={{ color: 'var(--text-secondary)' }}>
                          {extra.name} <span style={{ color: 'var(--text-muted)' }}>({extra.qty || 1}× {formatCurrency(extra.unit_cost)})</span>
                        </span>
                        <span style={{ fontWeight: 700, color: '#f472b6', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency((extra.unit_cost || 0) * (extra.qty || 1))}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                      Total extras: <strong style={{ color: '#f472b6', marginLeft: 6 }}>{formatCurrency(selectedProduct.additional_costs_total)}</strong>
                    </div>
                  </div>
                ) : (
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Nenhum custo adicional ou insumo cadastrado neste produto.
                  </div>
                )}
              </div>

              {/* 3. Seção PLACAS com Configurações Avançadas (conforme print 1) */}
              <div style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)',
                padding: '14px 16px'
              }}>
                <div style={{
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  color: '#00bcd4',
                  textTransform: 'uppercase',
                  marginBottom: 10,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6
                }}>
                  <Layers size={14} />
                  <span>PLACAS ({Array.isArray(selectedProduct.placas) ? selectedProduct.placas.length : 1})</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {(Array.isArray(selectedProduct.placas) && selectedProduct.placas.length > 0
                    ? selectedProduct.placas
                    : [{ name: 'Placa 1', weight_g: selectedProduct.total_weight_g, print_time_min: selectedProduct.total_print_time_min }]
                  ).map((pl, pIdx) => {
                    const isExpanded = expandedPlateIndex === pIdx;
                    return (
                      <div
                        key={pIdx}
                        style={{
                          border: '1px solid var(--border-color)',
                          borderRadius: 'var(--radius-md)',
                          background: '#0a1017',
                          overflow: 'hidden'
                        }}
                      >
                        {/* Plate Header Bar */}
                        <div
                          onClick={() => setExpandedPlateIndex(isExpanded ? null : pIdx)}
                          style={{
                            padding: '10px 14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            cursor: 'pointer',
                            background: isExpanded ? 'rgba(0, 188, 212, 0.08)' : 'transparent'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <Layers size={14} color="#00bcd4" />
                            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {pl.name || `Placa ${pIdx + 1}`}
                            </span>
                            <span style={{ fontSize: '0.6875rem', background: 'rgba(99, 102, 241, 0.2)', color: '#818cf8', padding: '2px 6px', borderRadius: 4 }}>
                              {pl.pieces_per_plate || 1} un
                            </span>
                          </div>

                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            <span>{formatWeight(pl.weight_g)}</span>
                            <span>•</span>
                            <span>{formatTime(pl.print_time_min)}</span>
                            {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </div>
                        </div>

                        {/* Plate Expanded Content */}
                        {isExpanded && (
                          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--border-color)', fontSize: '0.8125rem' }}>
                            {/* Technical Specs Grid */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
                              <div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Un. por placa</div>
                                <div style={{ fontWeight: 600 }}>{pl.pieces_per_plate || 1} un</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Altura camada</div>
                                <div style={{ fontWeight: 600 }}>{pl.layer_height || '0.20'} mm</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Velocidade</div>
                                <div style={{ fontWeight: 600 }}>{pl.speed_mms || '300'} mm/s</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Suporte</div>
                                <div style={{ fontWeight: 600 }}>{pl.support || 'S/ Suporte'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Brim / Aba</div>
                                <div style={{ fontWeight: 600 }}>{pl.brim || 'auto_brim 5mm'}</div>
                              </div>
                              <div>
                                <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>Filamento</div>
                                <div style={{ fontWeight: 600 }}>{pl.filaments_used?.[0]?.name || 'PLA'}</div>
                              </div>
                            </div>

                            {/* Sub-accordion: Configurações avançadas (conforme print 1) */}
                            <div style={{
                              background: 'rgba(255, 255, 255, 0.02)',
                              borderRadius: 'var(--radius-sm)',
                              border: '1px solid rgba(255, 255, 255, 0.06)',
                              padding: '8px 10px'
                            }}>
                              <div
                                onClick={() => setShowAdvancedConfigs(!showAdvancedConfigs)}
                                style={{
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  cursor: 'pointer',
                                  fontSize: '0.75rem',
                                  fontWeight: 700,
                                  color: '#00bcd4'
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <Settings size={12} />
                                  <span>⚙ Configurações avançadas</span>
                                </div>
                                {showAdvancedConfigs ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                              </div>

                              {showAdvancedConfigs && (
                                <div style={{
                                  marginTop: 8,
                                  paddingTop: 8,
                                  borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                                  display: 'grid',
                                  gridTemplateColumns: '1fr 1fr',
                                  gap: 6,
                                  fontSize: '0.6875rem',
                                  color: 'var(--text-secondary)'
                                }}>
                                  <div>Gerador de paredes: <strong style={{ color: '#fff' }}>arachne</strong></div>
                                  <div>Camadas topo/base: <strong style={{ color: '#fff' }}>5 / 3</strong></div>
                                  <div>Combinação infill: <strong style={{ color: '#fff' }}>Ativo</strong></div>
                                  <div>Tipo de suporte: <strong style={{ color: '#fff' }}>tree(auto)</strong></div>
                                  <div>Tipo de mesa: <strong style={{ color: '#fff' }}>Textured PEI</strong></div>
                                  <div>Sequência: <strong style={{ color: '#fff' }}>by layer</strong></div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick Create Modal */}
      <Modal
        isOpen={quickCreateOpen}
        onClose={() => setQuickCreateOpen(false)}
        title="Criar Produto Rápido (4 Perguntas)"
        maxWidth="500px"
      >
        <form onSubmit={handleQuickCreate} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">1. Nome do produto</label>
            <input
              type="text"
              className="form-control"
              placeholder="Ex: Suporte para Celular"
              value={quickForm.name}
              onChange={(e) => setQuickForm({ ...quickForm, name: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">2. Peso estimado em gramas</label>
            <input
              type="number"
              min="1"
              className="form-control"
              value={quickForm.weight_g}
              onChange={(e) => setQuickForm({ ...quickForm, weight_g: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">3. Tempo de impressão estimado (minutos)</label>
            <input
              type="number"
              min="1"
              className="form-control"
              value={quickForm.print_time_min}
              onChange={(e) => setQuickForm({ ...quickForm, print_time_min: e.target.value })}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">4. Multiplicador de Markup</label>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
              {[1.5, 2.0, 2.5, 3.0].map(m => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setQuickForm({ ...quickForm, markup: m })}
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--radius-md)',
                    border: quickForm.markup === m ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                    background: quickForm.markup === m ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                    color: quickForm.markup === m ? '#00e5ff' : 'var(--text-secondary)',
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontSize: '0.8125rem'
                  }}
                >
                  {m.toFixed(1)}x
                </button>
              ))}
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            style={{ marginTop: 8, padding: '12px' }}
          >
            Cadastrar Produto
          </button>
        </form>
      </Modal>
    </div>
  );
}
