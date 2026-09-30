import React, { useState, useEffect, useMemo } from 'react';
import {
  Search,
  Plus,
  Calendar,
  User,
  Package,
  Printer,
  ChevronDown,
  ChevronUp,
  Trash2,
  CheckCircle,
  Clock,
  Send,
  FileText,
  DollarSign,
  AlertCircle,
  ExternalLink,
  ShoppingCart,
  Check,
  X,
  Edit2,
  Truck,
  MapPin,
  Tag,
  Layers,
  Box
} from 'lucide-react';
import { api } from '../api/client.js';
import { Modal } from '../components/common/Modal.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters.js';

const getDefaultValidityDate = (days = 30) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
};

export function Orders({ clientMode, initialNewOrderProduct, onClearInitialProduct }) {
  const [kanban, setKanban] = useState({
    proposta: [],
    fila: [],
    em_producao: [],
    finalizado: []
  });
  const [period, setPeriod] = useState('30');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);

  // Available catalog products and customers for selector
  const [availableProducts, setAvailableProducts] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [companySettings, setCompanySettings] = useState(null);

  // Modal State
  const [orderModalOpen, setOrderModalOpen] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);

  // Add Products Catalog Modal
  const [addProductsModalOpen, setAddProductsModalOpen] = useState(false);
  const [productSearch, setProductSearch] = useState('');
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Production Estimate Accordion
  const [showFilamentsDetails, setShowFilamentsDetails] = useState(true);

  // Customer manual edit toggle
  const [editingCustomerManual, setEditingCustomerManual] = useState(false);

  // New Customer Quick-add Modal
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '', document: '' });
  const [savingNewCustomer, setSavingNewCustomer] = useState(false);

  // Order Form
  const [orderForm, setOrderForm] = useState({
    customer_id: null,
    customer_name: '',
    customer_document: '',
    customer_phone: '',
    customer_email: '',
    customer_address: '',
    notes: '',
    status: 'proposta',
    payment_status: 'pendente',
    payment_method: 'PIX',
    validity_days: 30,
    validity_date: getDefaultValidityDate(30),
    delivery_method: 'Entrega',
    shipping_carrier: '',
    is_free_shipping: true,
    shipping_cost: 0,
    due_date: '',
    discount_pct: 0,
    discount_value: 0,
    items: []
  });

  // Print Preview Mode
  const [printQuote, setPrintQuote] = useState(null);

  const handlePrintProposal = () => {
    const sheetEl = document.getElementById('commercial-proposal-sheet');
    if (!sheetEl) {
      window.print();
      return;
    }

    const existingFrame = document.getElementById('proposal-print-iframe');
    if (existingFrame) existingFrame.remove();

    const iframe = document.createElement('iframe');
    iframe.id = 'proposal-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0';
    iframe.style.height = '0';
    iframe.style.border = '0';
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow.document;
    doc.open();
    doc.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Proposta Comercial - ${printQuote?.customer_name || 'Orçamento'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 0;
              background: #ffffff !important;
              color: #0f172a !important;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            #commercial-proposal-sheet {
              box-shadow: none !important;
              padding: 0 !important;
              margin: 0 !important;
              width: 100% !important;
              min-height: auto !important;
            }
          </style>
        </head>
        <body>
          ${sheetEl.outerHTML}
        </body>
      </html>
    `);
    doc.close();

    iframe.contentWindow.focus();
    setTimeout(() => {
      try {
        iframe.contentWindow.print();
      } catch (err) {
        console.error('Print iframe error:', err);
        window.print();
      } finally {
        setTimeout(() => {
          if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
        }, 1500);
      }
    }, 250);
  };

  const handleOpenPrintTab = () => {
    const sheetEl = document.getElementById('commercial-proposal-sheet');
    if (!sheetEl) return;

    const win = window.open('', '_blank');
    if (!win) return;

    win.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Proposta Comercial - ${printQuote?.customer_name || 'Orçamento'}</title>
          <style>
            @page {
              size: A4 portrait;
              margin: 12mm 15mm;
            }
            * {
              box-sizing: border-box;
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body {
              margin: 0;
              padding: 24px;
              background: #f8fafc;
              color: #0f172a;
              font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
              display: flex;
              justifyContent: center;
            }
            table {
              width: 100%;
              border-collapse: collapse;
            }
            #commercial-proposal-sheet {
              max-width: 800px;
              background: #ffffff;
              padding: 40px;
              box-shadow: 0 4px 20px rgba(0,0,0,0.1);
            }
            @media print {
              body {
                padding: 0 !important;
                background: #ffffff !important;
              }
              #commercial-proposal-sheet {
                box-shadow: none !important;
                padding: 0 !important;
                max-width: 100% !important;
              }
            }
          </style>
        </head>
        <body>
          ${sheetEl.outerHTML}
        </body>
      </html>
    `);
    win.document.close();
  };

  useEffect(() => {
    loadOrders();
    loadCatalogData();
  }, [period, search]);

  // Handle incoming order from Calculator or Product detail
  useEffect(() => {
    if (initialNewOrderProduct) {
      openNewOrderWithProduct(initialNewOrderProduct);
      if (onClearInitialProduct) onClearInitialProduct();
    }
  }, [initialNewOrderProduct]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.getOrders({ period, search });
      if (data.kanban) {
        setKanban(data.kanban);
      }
    } catch (err) {
      console.error('Erro ao carregar pedidos:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCatalogData = async () => {
    try {
      const prods = await api.getProducts();
      setAvailableProducts(prods.products || []);
      const custs = await api.getCustomers();
      setCustomers(custs || []);
      const s = await api.getSettings();
      if (s && s.settings) {
        setCompanySettings(s.settings);
      }
    } catch (e) {
      console.error('Erro ao carregar catálogo/clientes:', e);
    }
  };

  // Document formatter helper (CPF / CNPJ)
  const formatDocDisplay = (doc) => {
    if (!doc) return '';
    const clean = doc.replace(/\D/g, '');
    if (clean.length <= 11) {
      return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
    }
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
  };

  // Helper to enrich item with catalog metadata (weight, time, filaments, image)
  const enrichItemWithProductData = (item) => {
    if (!item.productId) return item;
    const p = availableProducts.find(x => x.id === item.productId);
    if (!p) return item;
    return {
      ...item,
      image_url: item.image_url || p.image_url || '',
      total_weight_g: item.total_weight_g ?? p.total_weight_g ?? 0,
      total_print_time_min: item.total_print_time_min ?? p.total_print_time_min ?? 0,
      filaments: (item.filaments && item.filaments.length > 0) ? item.filaments : (p.filaments || [])
    };
  };

  const openNewOrderWithProduct = (product) => {
    setOrderForm({
      customer_id: null,
      customer_name: '',
      customer_document: '',
      customer_phone: '',
      customer_email: '',
      customer_address: '',
      notes: '',
      status: 'proposta',
      payment_status: 'pendente',
      payment_method: 'PIX',
      validity_days: 30,
      validity_date: getDefaultValidityDate(30),
      delivery_method: 'Entrega',
      shipping_carrier: '',
      is_free_shipping: true,
      shipping_cost: 0,
      due_date: '',
      discount_pct: 0,
      discount_value: 0,
      items: [
        {
          productId: product.id || null,
          name: product.name,
          image_url: product.image_url || '',
          qty: product.qty || 1,
          unitPrice: product.sale_price || 0,
          unitCost: product.unit_cost || 0,
          total_weight_g: product.total_weight_g || 0,
          total_print_time_min: product.total_print_time_min || 0,
          filaments: product.filaments || [],
          discount: 0
        }
      ]
    });
    setEditingCustomerManual(false);
    setActiveOrder(null);
    setOrderModalOpen(true);
  };

  const handleOpenEditOrder = (order) => {
    setActiveOrder(order);
    const enrichedItems = (order.items || []).map(it => {
      const p = availableProducts.find(x => x.id === it.productId);
      return {
        ...it,
        image_url: it.image_url || p?.image_url || '',
        total_weight_g: it.total_weight_g ?? p?.total_weight_g ?? 0,
        total_print_time_min: it.total_print_time_min ?? p?.total_print_time_min ?? 0,
        filaments: (it.filaments && it.filaments.length > 0) ? it.filaments : (p?.filaments || [])
      };
    });

    setOrderForm({
      id: order.id,
      code: order.code,
      customer_id: order.customer_id || null,
      customer_name: order.customer_name || '',
      customer_document: order.customer_document || '',
      customer_phone: order.customer_phone || '',
      customer_email: order.customer_email || '',
      customer_address: order.customer_address || '',
      notes: order.notes || '',
      status: order.status || 'proposta',
      payment_status: order.payment_status || 'pendente',
      payment_method: order.payment_method || 'PIX',
      validity_days: order.validity_days || 30,
      validity_date: order.validity_date || (order.created_at ? new Date(new Date(order.created_at).getTime() + (order.validity_days || 30) * 86400000).toISOString().split('T')[0] : getDefaultValidityDate(30)),
      delivery_method: order.delivery_method || 'Entrega',
      shipping_carrier: order.shipping_carrier || '',
      is_free_shipping: order.is_free_shipping === 1 || order.is_free_shipping === true,
      shipping_cost: Number(order.shipping_cost) || 0,
      due_date: order.due_date || '',
      discount_pct: order.discount_pct || 0,
      discount_value: order.discount_value || 0,
      items: enrichedItems
    });
    setEditingCustomerManual(false);
    setOrderModalOpen(true);
  };

  // Drag and Drop support
  const handleDragStart = (e, orderId) => {
    e.dataTransfer.setData('text/plain', orderId);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDrop = async (e, targetStatus) => {
    e.preventDefault();
    const orderId = e.dataTransfer.getData('text/plain');
    if (!orderId) return;

    try {
      await api.updateOrderStatus(orderId, targetStatus);
      loadOrders();
    } catch (err) {
      alert(err.message || 'Erro ao mover pedido.');
    }
  };

  // Calculation helpers
  const calculateTotals = () => {
    let subtotal = 0;
    let cost = 0;

    orderForm.items.forEach(it => {
      const q = it.qty || 1;
      const up = it.unitPrice || 0;
      const uc = it.unitCost || 0;
      const d = it.discount || 0;
      subtotal += (up * q) - d;
      cost += (uc * q);
    });

    const generalDiscount = orderForm.discount_value || (subtotal * (orderForm.discount_pct / 100)) || 0;
    const shipping = (!orderForm.is_free_shipping && orderForm.delivery_method === 'Entrega') ? (orderForm.shipping_cost || 0) : 0;
    const total = Math.max(0, subtotal - generalDiscount + shipping);
    const netProfit = total - cost;

    return { subtotal, total, cost, netProfit, shipping };
  };

  const { subtotal, total, cost, netProfit, shipping } = calculateTotals();

  // Production estimate calculation across all items in orderForm
  const productionEstimate = useMemo(() => {
    let totalWeightG = 0;
    let totalTimeMin = 0;
    let totalProductionCost = 0;
    const filamentMap = {};

    orderForm.items.forEach(item => {
      const q = item.qty || 1;
      const weight = (item.total_weight_g || 0) * q;
      const time = (item.total_print_time_min || 0) * q;
      const unitProdCost = (item.unitCost || 0) * q;

      totalWeightG += weight;
      totalTimeMin += time;
      totalProductionCost += unitProdCost;

      const fils = item.filaments || [];
      if (fils.length > 0) {
        fils.forEach(f => {
          const key = f.filamentId || f.name || f.type || 'PLA';
          const filWeightG = (f.weightGrams ?? f.weight_g ?? (weight / fils.length)) * q;
          const costPerGram = f.costPerGram || (f.material_cost && filWeightG > 0 ? f.material_cost / filWeightG : 0.10);
          const filCost = f.material_cost ? (f.material_cost * q) : (filWeightG * costPerGram);

          if (!filamentMap[key]) {
            filamentMap[key] = {
              name: f.name || f.type || 'PLA',
              type: f.type || 'PLA',
              color_hex: f.color_hex || f.color || '#10b981',
              color_name: f.color_name || '',
              grams: 0,
              cost: 0
            };
          }
          filamentMap[key].grams += filWeightG;
          filamentMap[key].cost += filCost;
        });
      } else if (weight > 0) {
        const key = 'default_fil';
        if (!filamentMap[key]) {
          filamentMap[key] = {
            name: 'PLA Padrão',
            type: 'PLA',
            color_hex: '#10b981',
            color_name: '',
            grams: 0,
            cost: 0
          };
        }
        filamentMap[key].grams += weight;
        filamentMap[key].cost += (unitProdCost * 0.45);
      }
    });

    const filamentsList = Object.values(filamentMap);

    return {
      totalWeightG,
      totalTimeMin,
      totalProductionCost,
      filamentsList
    };
  }, [orderForm.items]);

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    try {
      const effectiveShippingCost = (!orderForm.is_free_shipping && orderForm.delivery_method === 'Entrega')
        ? (Number(orderForm.shipping_cost) || 0)
        : 0;
      const payload = {
        ...orderForm,
        shipping_cost: effectiveShippingCost,
        subtotal,
        total,
        estimated_cost: cost,
        estimated_net_profit: netProfit
      };

      if (activeOrder?.id) {
        await api.updateOrder(activeOrder.id, payload);
      } else {
        await api.createOrder(payload);
      }

      setOrderModalOpen(false);
      loadOrders();
    } catch (err) {
      alert(err.message || 'Falha ao salvar pedido.');
    }
  };

  const handleDeleteOrder = async (id) => {
    if (!window.confirm('Excluir este pedido?')) return;
    try {
      await api.deleteOrder(id);
      setOrderModalOpen(false);
      loadOrders();
    } catch (err) {
      alert(err.message || 'Erro ao excluir pedido.');
    }
  };

  const handleAddItemFromCatalog = (product) => {
    const existing = orderForm.items.find(i => i.productId === product.id);
    if (existing) {
      setOrderForm({
        ...orderForm,
        items: orderForm.items.map(i => i.productId === product.id ? { ...i, qty: i.qty + 1 } : i)
      });
    } else {
      setOrderForm({
        ...orderForm,
        items: [
          ...orderForm.items,
          {
            productId: product.id,
            name: product.name,
            image_url: product.image_url || '',
            qty: 1,
            unitPrice: product.sale_price || 0,
            unitCost: product.unit_cost || 0,
            total_weight_g: product.total_weight_g || 0,
            total_print_time_min: product.total_print_time_min || 0,
            filaments: product.filaments || [],
            discount: 0
          }
        ]
      });
    }
  };

  // Add multiple selected products from Add Products modal
  const handleConfirmAddProducts = () => {
    if (selectedProductIds.length === 0) {
      setAddProductsModalOpen(false);
      return;
    }

    let updatedItems = [...orderForm.items];

    selectedProductIds.forEach(prodId => {
      const p = availableProducts.find(x => x.id === prodId);
      if (!p) return;

      const existingIndex = updatedItems.findIndex(i => i.productId === p.id);
      if (existingIndex >= 0) {
        updatedItems[existingIndex] = {
          ...updatedItems[existingIndex],
          qty: (updatedItems[existingIndex].qty || 1) + 1
        };
      } else {
        updatedItems.push({
          productId: p.id,
          name: p.name,
          image_url: p.image_url || '',
          qty: 1,
          unitPrice: p.sale_price || 0,
          unitCost: p.unit_cost || 0,
          total_weight_g: p.total_weight_g || 0,
          total_print_time_min: p.total_print_time_min || 0,
          filaments: p.filaments || [],
          discount: 0
        });
      }
    });

    setOrderForm(prev => ({
      ...prev,
      items: updatedItems
    }));

    setSelectedProductIds([]);
    setAddProductsModalOpen(false);
  };

  // Thumbnail render helper
  const renderProductThumb = (imageUrl, name, size = 40) => {
    if (imageUrl) {
      return (
        <img
          src={imageUrl}
          alt={name || 'Produto'}
          style={{
            width: size,
            height: size,
            objectFit: 'contain',
            borderRadius: 'var(--radius-md)',
            background: '#09121d',
            border: '1px solid var(--border-color)',
            flexShrink: 0
          }}
        />
      );
    }
    return (
      <div
        style={{
          width: size,
          height: size,
          borderRadius: 'var(--radius-md)',
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.2) 0%, rgba(9, 18, 29, 0.95) 80%)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          color: '#10b981'
        }}
      >
        <Box size={Math.round(size * 0.55)} />
      </div>
    );
  };

  const columns = [
    { key: 'proposta', label: 'Proposta', color: '#a855f7' },
    { key: 'fila', label: 'Fila', color: '#3b82f6' },
    { key: 'em_producao', label: 'Em Produção', color: '#f59e0b' },
    { key: 'finalizado', label: 'Finalizado', color: '#10b981' }
  ];

  return (
    <div className="page-wrapper animate-fade-in">
      {/* Top Header & Filters */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 16,
        marginBottom: 24
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Search */}
          <div style={{ position: 'relative', width: '280px' }}>
            <div style={{
              position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: 'var(--text-muted)', display: 'flex', alignItems: 'center'
            }}>
              <Search size={16} />
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por cliente, ID ou notas..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '38px' }}
            />
          </div>

          {/* Period selector */}
          <select
            className="form-control"
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            style={{ width: '160px' }}
          >
            <option value="30">Últimos 30 dias</option>
            <option value="7">Últimos 7 dias</option>
            <option value="today">Hoje</option>
            <option value="all">Todos os pedidos</option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => {
            setActiveOrder(null);
            setOrderForm({
              customer_id: null,
              customer_name: '',
              customer_document: '',
              customer_phone: '',
              customer_email: '',
              customer_address: '',
              notes: '',
              status: 'proposta',
              payment_status: 'pendente',
              payment_method: 'PIX',
              validity_days: 30,
              validity_date: getDefaultValidityDate(30),
              delivery_method: 'A combinar',
              shipping_carrier: '',
              is_free_shipping: true,
              shipping_cost: 0,
              due_date: '',
              discount_pct: 0,
              discount_value: 0,
              items: []
            });
            setEditingCustomerManual(false);
            setOrderModalOpen(true);
          }}
          className="btn btn-primary"
        >
          <Plus size={16} />
          <span>Novo Pedido</span>
        </button>
      </div>

      {/* Kanban Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, minmax(260px, 1fr))',
        gap: 16,
        alignItems: 'start',
        overflowX: 'auto',
        paddingBottom: 20
      }}>
        {columns.map(col => {
          const list = kanban[col.key] || [];
          return (
            <div
              key={col.key}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, col.key)}
              style={{
                background: 'rgba(14, 22, 33, 0.6)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-lg)',
                padding: '16px',
                minHeight: '600px',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              {/* Column Header */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 14,
                paddingBottom: 10,
                borderBottom: '1px solid var(--border-color)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{
                    width: 8, height: 8, borderRadius: '50%',
                    backgroundColor: col.color
                  }} />
                  <span style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {col.label}
                  </span>
                </div>
                <span style={{
                  fontSize: '0.75rem', fontWeight: 700,
                  background: 'var(--bg-input)', padding: '2px 8px', borderRadius: 9999,
                  color: 'var(--text-secondary)'
                }}>
                  {list.length}
                </span>
              </div>

              {/* Cards in Column */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
                {list.length === 0 ? (
                  <div style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-muted)',
                    fontSize: '0.8125rem',
                    border: '1px dashed rgba(255, 255, 255, 0.05)',
                    borderRadius: 'var(--radius-md)',
                    padding: '24px 12px',
                    textAlign: 'center'
                  }}>
                    <FileText size={24} style={{ opacity: 0.4, marginBottom: 8 }} />
                    <span>Nenhum pedido</span>
                    <span style={{ fontSize: '0.75rem', opacity: 0.6 }}>Arraste um card aqui</span>
                  </div>
                ) : (
                  list.map(order => (
                    <div
                      key={order.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, order.id)}
                      onClick={() => handleOpenEditOrder(order)}
                      className="card"
                      style={{
                        padding: '14px',
                        cursor: 'grab',
                        background: 'var(--bg-card)',
                        borderColor: 'var(--border-color)',
                        transition: 'all 0.15s ease'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = 'rgba(0, 188, 212, 0.3)'}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = 'var(--border-color)'}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', color: '#00bcd4', fontWeight: 600 }}>
                          {order.code}
                        </span>
                        <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                          {formatDate(order.created_at)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <User size={13} color="var(--text-muted)" />
                        <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                          {order.customer_name || 'Cliente Avulso'}
                        </span>
                      </div>

                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 12 }}>
                        {order.items?.length || 0} prod. • {order.items?.reduce((acc, i) => acc + (i.qty || 1), 0) || 0} un.
                      </div>

                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderTop: '1px solid var(--border-color)',
                        paddingTop: 10
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Badge status={order.status} />
                          <button
                            type="button"
                            title="Imprimir Proposta Comercial"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPrintQuote(order);
                            }}
                            style={{
                              background: 'rgba(255, 255, 255, 0.05)',
                              border: '1px solid var(--border-color)',
                              borderRadius: 'var(--radius-sm)',
                              padding: '4px 6px',
                              color: 'var(--text-muted)',
                              cursor: 'pointer',
                              display: 'inline-flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.15s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.color = '#00e5ff';
                              e.currentTarget.style.borderColor = '#00bcd4';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.color = 'var(--text-muted)';
                              e.currentTarget.style.borderColor = 'var(--border-color)';
                            }}
                          >
                            <Printer size={13} />
                          </button>
                        </div>
                        <span style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(order.total)}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Order Create / Edit Modal (Matches 192804.png reference) */}
      {orderModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setOrderModalOpen(false)}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                background: 'rgba(0, 188, 212, 0.15)',
                color: '#00bcd4',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0
              }}>
                <ShoppingCart size={18} />
              </div>
              <div>
                <div style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1.2 }}>
                  {activeOrder ? `Pedido ${activeOrder.code}` : 'Novo Pedido'}
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Selecione o cliente e adicione os produtos
                </div>
              </div>
            </div>
          }
          maxWidth="700px"
        >
          <form onSubmit={handleSaveOrder} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* Status radio tabs */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: '#0a121e',
              padding: '6px 10px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: 8
            }}>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {columns.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setOrderForm({ ...orderForm, status: c.key })}
                    style={{
                      padding: '5px 12px',
                      borderRadius: 6,
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      border: orderForm.status === c.key ? `1px solid ${c.color}` : '1px solid transparent',
                      background: orderForm.status === c.key ? `${c.color}25` : 'transparent',
                      color: orderForm.status === c.key ? c.color : 'var(--text-muted)',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* PDF Print Button */}
              <button
                type="button"
                onClick={() => setPrintQuote({ ...orderForm, total, subtotal, cost, netProfit })}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '5px 10px', height: 28 }}
              >
                <Printer size={13} />
                <span>Imprimir</span>
              </button>
            </div>

            {/* 1. SEÇÃO CLIENTE */}
            <div style={{
              background: '#0d1726',
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  <User size={14} color="#00bcd4" />
                  <span>CLIENTE</span>
                </div>

                {orderForm.customer_name && !editingCustomerManual && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => setEditingCustomerManual(true)}
                      style={{
                        background: 'rgba(0, 188, 212, 0.1)',
                        border: '1px solid rgba(0, 188, 212, 0.3)',
                        borderRadius: 6,
                        padding: '3px 8px',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        color: '#00bcd4',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <Edit2 size={12} />
                      <span>Editar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setOrderForm({
                          ...orderForm,
                          customer_id: null,
                          customer_name: '',
                          customer_document: '',
                          customer_phone: '',
                          customer_email: '',
                          customer_address: ''
                        });
                        setEditingCustomerManual(false);
                      }}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--text-muted)',
                        cursor: 'pointer',
                        padding: 4,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Remover cliente"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>

              {/* Customer Selected Card */}
              {orderForm.customer_name && !editingCustomerManual ? (
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  background: '#09121d',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid rgba(0, 188, 212, 0.2)'
                }}>
                  <div style={{
                    width: 36,
                    height: 36,
                    borderRadius: '50%',
                    background: 'rgba(0, 188, 212, 0.15)',
                    color: '#00bcd4',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <User size={18} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      {orderForm.customer_name}
                    </div>
                    <div style={{
                      fontSize: '0.75rem',
                      color: 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                      flexWrap: 'wrap',
                      marginTop: 2
                    }}>
                      {orderForm.customer_document && (
                        <span>{formatDocDisplay(orderForm.customer_document)}</span>
                      )}
                      {orderForm.customer_phone && (
                        <span>• {orderForm.customer_phone}</span>
                      )}
                      {orderForm.customer_email && (
                        <span>• {orderForm.customer_email}</span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                /* Customer Selector / Manual Input */
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <select
                      className="form-control"
                      style={{ fontSize: '0.8125rem', flex: 1 }}
                      defaultValue=""
                      onChange={(e) => {
                        const custId = parseInt(e.target.value, 10);
                        const c = customers.find(x => x.id === custId);
                        if (c) {
                          setOrderForm({
                            ...orderForm,
                            customer_id: c.id,
                            customer_name: c.name || '',
                            customer_document: c.document || '',
                            customer_phone: c.phone || '',
                            customer_email: c.email || '',
                            customer_address: [c.address, c.city, c.state].filter(Boolean).join(' - ')
                          });
                          setEditingCustomerManual(false);
                        }
                      }}
                    >
                      <option value="" disabled>Escolha um cliente cadastrado...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>
                          {c.name} {c.phone ? `(${c.phone})` : ''} {c.document ? `• ${formatDocDisplay(c.document)}` : ''}
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        setNewCustomerForm({ name: '', phone: '', email: '', document: '' });
                        setNewCustomerModalOpen(true);
                      }}
                      className="btn btn-secondary"
                      style={{ fontSize: '0.75rem', padding: '6px 12px', whiteSpace: 'nowrap', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                    >
                      <Plus size={13} />
                      <span>Novo</span>
                    </button>
                  </div>

                  {editingCustomerManual && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 8, marginTop: 4 }}>
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Nome *"
                        value={orderForm.customer_name}
                        onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                        style={{ fontSize: '0.75rem' }}
                        required
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="CPF / CNPJ"
                        value={orderForm.customer_document || ''}
                        onChange={(e) => setOrderForm({ ...orderForm, customer_document: e.target.value })}
                        style={{ fontSize: '0.75rem' }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        placeholder="Telefone"
                        value={orderForm.customer_phone}
                        onChange={(e) => setOrderForm({ ...orderForm, customer_phone: e.target.value })}
                        style={{ fontSize: '0.75rem' }}
                      />
                      <input
                        type="email"
                        className="form-control"
                        placeholder="E-mail"
                        value={orderForm.customer_email}
                        onChange={(e) => setOrderForm({ ...orderForm, customer_email: e.target.value })}
                        style={{ fontSize: '0.75rem' }}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* 2. SEÇÃO PRODUTOS */}
            <div style={{
              background: '#0d1726',
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Package size={14} color="#00bcd4" />
                  <span style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    PRODUTOS
                  </span>
                  <span style={{
                    background: 'rgba(0, 188, 212, 0.15)',
                    color: '#00e5ff',
                    fontSize: '0.6875rem',
                    fontWeight: 700,
                    padding: '1px 6px',
                    borderRadius: 9999
                  }}>
                    {orderForm.items.length}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedProductIds([]);
                    setProductSearch('');
                    setAddProductsModalOpen(true);
                  }}
                  style={{
                    background: 'rgba(0, 188, 212, 0.12)',
                    border: '1px solid rgba(0, 188, 212, 0.3)',
                    color: '#00e5ff',
                    padding: '5px 12px',
                    borderRadius: 6,
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Plus size={13} />
                  <span>Adicionar</span>
                </button>
              </div>

              {/* Items List */}
              {orderForm.items.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#09121d',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-color)',
                  color: 'var(--text-muted)',
                  fontSize: '0.8125rem'
                }}>
                  Nenhum produto adicionado. Clique no botão <strong>+ Adicionar</strong> acima para selecionar itens.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orderForm.items.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        background: '#09121d',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-color)',
                        gap: 12
                      }}
                    >
                      {/* Left: Thumbnail & Name/Price */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 0 }}>
                        {renderProductThumb(item.image_url, item.name, 38)}
                        <div style={{ minWidth: 0 }}>
                          <div style={{
                            fontWeight: 700,
                            fontSize: '0.8125rem',
                            color: 'var(--text-primary)',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis'
                          }}>
                            {item.name}
                          </div>
                          <div style={{ fontSize: '0.6875rem', color: '#10b981', fontWeight: 600 }}>
                            {formatCurrency(item.unitPrice)} /un.
                          </div>
                        </div>
                      </div>

                      {/* Right: Quantity controls, Total & Trash */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                        {/* Qty +/- */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4, background: '#0d1726', padding: '2px 4px', borderRadius: 6, border: '1px solid var(--border-color)' }}>
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(1, (item.qty || 1) - 1);
                              setOrderForm({
                                ...orderForm,
                                items: orderForm.items.map((it, i) => i === idx ? { ...it, qty: newQty } : it)
                              });
                            }}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontWeight: 800,
                              fontSize: '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            -
                          </button>
                          <span style={{ minWidth: 20, textAlign: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                            {item.qty || 1}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = (item.qty || 1) + 1;
                              setOrderForm({
                                ...orderForm,
                                items: orderForm.items.map((it, i) => i === idx ? { ...it, qty: newQty } : it)
                              });
                            }}
                            style={{
                              width: 22,
                              height: 22,
                              borderRadius: 4,
                              background: 'transparent',
                              border: 'none',
                              color: 'var(--text-secondary)',
                              cursor: 'pointer',
                              fontWeight: 800,
                              fontSize: '0.875rem',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total */}
                        <div style={{
                          fontWeight: 700,
                          fontSize: '0.875rem',
                          color: '#10b981',
                          fontFamily: 'var(--font-mono)',
                          minWidth: 70,
                          textAlign: 'right'
                        }}>
                          {formatCurrency((item.unitPrice || 0) * (item.qty || 1))}
                        </div>

                        {/* Trash */}
                        <button
                          type="button"
                          onClick={() => {
                            setOrderForm({
                              ...orderForm,
                              items: orderForm.items.filter((_, i) => i !== idx)
                            });
                          }}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 4,
                            background: 'transparent',
                            border: 'none',
                            color: '#f87171',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          title="Remover produto"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}

                  {/* Subtotal */}
                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: 8,
                    paddingTop: 8,
                    fontSize: '0.8125rem'
                  }}>
                    <span style={{ color: 'var(--text-muted)' }}>Subtotal:</span>
                    <span style={{ fontWeight: 800, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                      {formatCurrency(subtotal)}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* 3. SEÇÃO ESTIMATIVA DE PRODUÇÃO */}
            {orderForm.items.length > 0 && (
              <div style={{
                background: '#0d1726',
                padding: '14px 16px',
                borderRadius: 'var(--radius-lg)',
                border: '1px solid rgba(0, 188, 212, 0.25)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                  <Layers size={14} color="#a855f7" />
                  <span>ESTIMATIVA DE PRODUÇÃO</span>
                </div>

                {/* 3 Metrics Cards */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr',
                  gap: 10,
                  marginBottom: 10
                }}>
                  {/* Material */}
                  <div style={{ background: '#09121d', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', fontWeight: 700 }}>
                      <span>⚖</span>
                      <span>MATERIAL</span>
                    </div>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                      {productionEstimate.totalWeightG >= 1000
                        ? `${(productionEstimate.totalWeightG / 1000).toFixed(2)}kg`
                        : `${Math.round(productionEstimate.totalWeightG)}g`}
                    </div>
                  </div>

                  {/* Tempo */}
                  <div style={{ background: '#09121d', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', fontWeight: 700 }}>
                      <Clock size={11} />
                      <span>TEMPO</span>
                    </div>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#ffffff', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                      {productionEstimate.totalTimeMin < 60
                        ? `${Math.round(productionEstimate.totalTimeMin)}min`
                        : `${Math.floor(productionEstimate.totalTimeMin / 60)}h ${Math.round(productionEstimate.totalTimeMin % 60)}min`}
                    </div>
                  </div>

                  {/* Custo */}
                  <div style={{ background: '#09121d', padding: '10px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 4, textTransform: 'uppercase', fontWeight: 700 }}>
                      <span>$</span>
                      <span>CUSTO</span>
                    </div>
                    <div style={{ fontSize: '1.0625rem', fontWeight: 800, color: '#10b981', fontFamily: 'var(--font-mono)', marginTop: 4 }}>
                      {formatCurrency(productionEstimate.totalProductionCost)}
                    </div>
                  </div>
                </div>

                {/* Filaments details accordion */}
                {productionEstimate.filamentsList.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <button
                      type="button"
                      onClick={() => setShowFilamentsDetails(!showFilamentsDetails)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#a855f7',
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: 0,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4
                      }}
                    >
                      <span>
                        {showFilamentsDetails
                          ? `Ocultar filamentos necessários (${productionEstimate.filamentsList.length})`
                          : `Ver filamentos necessários (${productionEstimate.filamentsList.length})`}
                      </span>
                      {showFilamentsDetails ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </button>

                    {showFilamentsDetails && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, paddingLeft: 4 }}>
                        {productionEstimate.filamentsList.map((f, i) => (
                          <div
                            key={i}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              fontSize: '0.75rem',
                              color: 'var(--text-secondary)'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <span style={{
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                backgroundColor: f.color_hex || '#10b981',
                                display: 'inline-block',
                                flexShrink: 0
                              }} />
                              <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                {f.name || f.type || 'PLA'}
                              </span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                              <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                                {Math.round(f.grams)}g
                              </span>
                              <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, color: 'var(--text-primary)', minWidth: 60, textAlign: 'right' }}>
                                {formatCurrency(f.cost)}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 4. SEÇÃO DESCONTO */}
            <div style={{
              background: '#0d1726',
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                <Tag size={14} color="#f59e0b" />
                <span>DESCONTO</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.6875rem' }}>PORCENTAGEM</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      className="form-control"
                      value={orderForm.discount_pct || 0}
                      onChange={(e) => {
                        const pct = parseFloat(e.target.value) || 0;
                        const val = subtotal > 0 ? (subtotal * (pct / 100)) : 0;
                        setOrderForm({
                          ...orderForm,
                          discount_pct: pct,
                          discount_value: parseFloat(val.toFixed(2))
                        });
                      }}
                      style={{ fontSize: '0.8125rem', paddingRight: 28 }}
                    />
                    <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>%</span>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.6875rem' }}>VALOR (R$)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.75rem' }}>R$</span>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      className="form-control"
                      value={orderForm.discount_value || 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        const pct = subtotal > 0 ? (val / subtotal) * 100 : 0;
                        setOrderForm({
                          ...orderForm,
                          discount_value: val,
                          discount_pct: parseFloat(pct.toFixed(2))
                        });
                      }}
                      style={{ fontSize: '0.8125rem', paddingLeft: 30 }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 5. SEÇÃO PRAZOS & PAGAMENTO */}
            <div style={{
              background: '#0d1726',
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                <Clock size={14} color="#00bcd4" />
                <span>PRAZOS & PAGAMENTO</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                {/* Previsão de Conclusão */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.6875rem' }}>PREVISÃO DE CONCLUSÃO</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      <Calendar size={14} />
                    </div>
                    <input
                      type="date"
                      className="form-control"
                      value={orderForm.due_date || ''}
                      onChange={(e) => setOrderForm({ ...orderForm, due_date: e.target.value })}
                      style={{ paddingLeft: 36, fontSize: '0.8125rem' }}
                    />
                  </div>
                </div>

                {/* Validade da Proposta */}
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label" style={{ fontSize: '0.6875rem' }}>VALIDADE DA PROPOSTA</label>
                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                      <Calendar size={14} />
                    </div>
                    <input
                      type="date"
                      className="form-control"
                      value={orderForm.validity_date || ''}
                      onChange={(e) => setOrderForm({ ...orderForm, validity_date: e.target.value })}
                      style={{ paddingLeft: 36, fontSize: '0.8125rem' }}
                    />
                  </div>
                </div>
              </div>

              {/* Forma de Pagamento */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: '0.6875rem' }}>FORMA DE PAGAMENTO</label>
                <select
                  className="form-control"
                  value={orderForm.payment_method || 'PIX'}
                  onChange={(e) => setOrderForm({ ...orderForm, payment_method: e.target.value })}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Dinheiro">Dinheiro</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Transferência Bancária">Transferência Bancária</option>
                  <option value="A combinar">A combinar</option>
                </select>
              </div>
            </div>

            {/* 6. SEÇÃO ENTREGA */}
            <div style={{
              background: '#0d1726',
              padding: '14px 16px',
              borderRadius: 'var(--radius-lg)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                <Truck size={14} color="#00bcd4" />
                <span>ENTREGA</span>
              </div>

              {/* 3 Delivery Options Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: orderForm.delivery_method === 'Entrega' ? 12 : 0 }}>
                {/* 1. Retirada */}
                <button
                  type="button"
                  onClick={() => setOrderForm({ ...orderForm, delivery_method: 'Retirada' })}
                  style={{
                    background: orderForm.delivery_method === 'Retirada' ? 'rgba(0, 188, 212, 0.12)' : '#09121d',
                    border: orderForm.delivery_method === 'Retirada' ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <MapPin size={18} color={orderForm.delivery_method === 'Retirada' ? '#00e5ff' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: orderForm.delivery_method === 'Retirada' ? '#00e5ff' : 'var(--text-primary)' }}>
                    Retirada
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                    Cliente retira no local
                  </span>
                </button>

                {/* 2. A combinar */}
                <button
                  type="button"
                  onClick={() => setOrderForm({ ...orderForm, delivery_method: 'A combinar' })}
                  style={{
                    background: orderForm.delivery_method === 'A combinar' ? 'rgba(0, 188, 212, 0.12)' : '#09121d',
                    border: orderForm.delivery_method === 'A combinar' ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Clock size={18} color={orderForm.delivery_method === 'A combinar' ? '#00e5ff' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: orderForm.delivery_method === 'A combinar' ? '#00e5ff' : 'var(--text-primary)' }}>
                    A combinar
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                    Definir posteriormente
                  </span>
                </button>

                {/* 3. Entrega */}
                <button
                  type="button"
                  onClick={() => setOrderForm({ ...orderForm, delivery_method: 'Entrega' })}
                  style={{
                    background: orderForm.delivery_method === 'Entrega' ? 'rgba(0, 188, 212, 0.12)' : '#09121d',
                    border: orderForm.delivery_method === 'Entrega' ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                    borderRadius: 'var(--radius-md)',
                    padding: '12px 10px',
                    textAlign: 'center',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease'
                  }}
                >
                  <Truck size={18} color={orderForm.delivery_method === 'Entrega' ? '#00e5ff' : 'var(--text-muted)'} />
                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: orderForm.delivery_method === 'Entrega' ? '#00e5ff' : 'var(--text-primary)' }}>
                    Entrega
                  </span>
                  <span style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', lineHeight: 1.2 }}>
                    Envio ou entrega local
                  </span>
                </button>
              </div>

              {/* Sub-fields for Entrega */}
              {orderForm.delivery_method === 'Entrega' && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 4 }}>
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label" style={{ fontSize: '0.6875rem' }}>FORMA DE ENVIO</label>
                    <input
                      type="text"
                      className="form-control"
                      placeholder="Ex: Correios, Motoboy..."
                      value={orderForm.shipping_carrier || ''}
                      onChange={(e) => setOrderForm({ ...orderForm, shipping_carrier: e.target.value })}
                      style={{ fontSize: '0.8125rem' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <button
                      type="button"
                      onClick={() => setOrderForm({ ...orderForm, is_free_shipping: !orderForm.is_free_shipping })}
                      style={{
                        padding: '4px 10px',
                        borderRadius: 6,
                        fontSize: '0.75rem',
                        fontWeight: 700,
                        border: orderForm.is_free_shipping ? '1px solid #10b981' : '1px solid var(--border-color)',
                        background: orderForm.is_free_shipping ? 'rgba(16, 185, 129, 0.2)' : 'transparent',
                        color: orderForm.is_free_shipping ? '#10b981' : 'var(--text-muted)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6
                      }}
                    >
                      <Check size={12} />
                      <span>Frete grátis</span>
                    </button>

                    {!orderForm.is_free_shipping && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flex: 1 }}>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Valor: R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          className="form-control"
                          placeholder="0,00"
                          value={orderForm.shipping_cost !== undefined && orderForm.shipping_cost !== null ? orderForm.shipping_cost : ''}
                          onChange={(e) => setOrderForm({ ...orderForm, shipping_cost: e.target.value === '' ? 0 : parseFloat(e.target.value) || 0 })}
                          style={{ fontSize: '0.8125rem', width: 90 }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Observations / Notes */}
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label" style={{ fontSize: '0.6875rem', textTransform: 'uppercase' }}>
                Observações do Pedido
              </label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Detalhes sobre cores, acabamento ou prazos acordados..."
                value={orderForm.notes || ''}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                style={{ fontSize: '0.8125rem' }}
              />
            </div>

            {/* Footer / Summary Action Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 8,
              borderTop: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: 12
            }}>
              {/* Summary totals */}
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                  {orderForm.items.reduce((acc, i) => acc + (i.qty || 1), 0)} un. • {orderForm.items.length} prod. • {formatCurrency(subtotal)}
                </span>
                <span style={{
                  fontSize: '1.25rem',
                  fontWeight: 800,
                  color: '#10b981',
                  fontFamily: 'var(--font-mono)'
                }}>
                  {formatCurrency(total)}
                </span>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {activeOrder && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(activeOrder.id)}
                    className="btn btn-danger"
                    style={{ padding: '8px 14px', fontSize: '0.8125rem' }}
                  >
                    <Trash2 size={14} />
                    <span>Excluir</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setOrderModalOpen(false)}
                  className="btn btn-secondary"
                  style={{ padding: '8px 16px', fontSize: '0.8125rem' }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '8px 20px', fontSize: '0.8125rem', fontWeight: 700 }}
                >
                  {activeOrder ? 'Salvar Pedido' : '+ Criar Pedido'}
                </button>
              </div>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: ADICIONAR PRODUTOS (Matches 192756.png reference) */}
      {/* ========================================================================= */}
      {addProductsModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setAddProductsModalOpen(false)}
          title={
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 32,
                height: 32,
                borderRadius: 'var(--radius-md)',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Package size={18} />
              </div>
              <span style={{ fontSize: '1.0625rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Adicionar produtos
              </span>
            </div>
          }
          maxWidth="640px"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Search Input */}
            <div style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
                <Search size={15} />
              </div>
              <input
                type="text"
                className="form-control"
                placeholder="Buscar produtos..."
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                style={{ paddingLeft: 36, fontSize: '0.875rem' }}
                autoFocus
              />
            </div>

            {/* Products Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))',
              gap: 12,
              maxHeight: '360px',
              overflowY: 'auto',
              padding: '2px'
            }}>
              {availableProducts
                .filter(p => !productSearch.trim() ||
                  (p.name || '').toLowerCase().includes(productSearch.toLowerCase()) ||
                  (p.category || '').toLowerCase().includes(productSearch.toLowerCase())
                )
                .map(product => {
                  const isSelected = selectedProductIds.includes(product.id);
                  const isAlreadyInOrder = orderForm.items.some(it => it.productId === product.id);

                  return (
                    <div
                      key={product.id}
                      onClick={() => {
                        setSelectedProductIds(prev =>
                          prev.includes(product.id)
                            ? prev.filter(id => id !== product.id)
                            : [...prev, product.id]
                        );
                      }}
                      style={{
                        background: '#0d1726',
                        border: isSelected ? '1.5px solid #00bcd4' : '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-lg)',
                        padding: '10px',
                        cursor: 'pointer',
                        display: 'flex',
                        flexDirection: 'column',
                        position: 'relative',
                        transition: 'all 0.15s ease',
                        boxShadow: isSelected ? '0 0 12px rgba(0, 188, 212, 0.25)' : 'none'
                      }}
                    >
                      {/* Checkbox indicator top-right */}
                      <div style={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        background: isSelected ? '#00bcd4' : 'rgba(255, 255, 255, 0.08)',
                        border: isSelected ? '1px solid #00bcd4' : '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff',
                        zIndex: 2
                      }}>
                        {isSelected && <Check size={12} strokeWidth={3} />}
                      </div>

                      {/* Product Thumbnail Center */}
                      <div style={{
                        height: '84px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 8,
                        borderRadius: 'var(--radius-md)',
                        background: '#09121d',
                        overflow: 'hidden'
                      }}>
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            style={{ maxHeight: '76px', maxWidth: '100%', objectFit: 'contain' }}
                          />
                        ) : (
                          <div style={{
                            width: '100%',
                            height: '100%',
                            background: 'radial-gradient(circle, rgba(16, 185, 129, 0.25) 0%, rgba(9, 18, 29, 0.95) 80%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#10b981'
                          }}>
                            <Box size={36} />
                          </div>
                        )}
                      </div>

                      {/* Product Name */}
                      <div style={{
                        fontSize: '0.8125rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        marginBottom: 4
                      }} title={product.name}>
                        {product.name}
                      </div>

                      {/* Price & In-Order indicator */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginTop: 'auto',
                        fontSize: '0.75rem'
                      }}>
                        <span style={{ color: '#10b981', fontWeight: 800, fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(product.sale_price)}
                        </span>

                        {isAlreadyInOrder && (
                          <span style={{ color: '#38bdf8', fontSize: '0.6875rem', fontWeight: 600 }}>
                            No pedido
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>

            {availableProducts.length === 0 && (
              <div style={{ textAlign: 'center', padding: '24px', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                Nenhum produto cadastrado. Crie e precifique produtos na Calculadora.
              </div>
            )}

            {/* Bottom Actions */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              paddingTop: 12,
              borderTop: '1px solid var(--border-color)'
            }}>
              <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                {selectedProductIds.length === 0
                  ? 'Selecione produtos para adicionar'
                  : `${selectedProductIds.length} produto(s) selecionado(s)`}
              </span>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setAddProductsModalOpen(false)}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmAddProducts}
                  disabled={selectedProductIds.length === 0}
                >
                  Adicionar ({selectedProductIds.length})
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Printable Quote Modal */}
      {printQuote && (
        <Modal
          isOpen={true}
          onClose={() => setPrintQuote(null)}
          title="Proposta Comercial - Visualização e Impressão"
          maxWidth="860px"
        >
          {/* Printable Stylesheet */}
          <style>{`
            @media print {
              html, body {
                background: #ffffff !important;
                color: #000000 !important;
                margin: 0 !important;
                padding: 0 !important;
                overflow: visible !important;
              }
              body * {
                visibility: hidden;
              }
              .modal-overlay, .modal-content {
                position: static !important;
                background: transparent !important;
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                margin: 0 !important;
                overflow: visible !important;
                max-height: none !important;
              }
              #commercial-proposal-sheet, #commercial-proposal-sheet * {
                visibility: visible;
              }
              #commercial-proposal-sheet {
                position: absolute;
                left: 0;
                top: 0;
                width: 100% !important;
                max-width: 100% !important;
                padding: 0 !important;
                margin: 0 !important;
                box-shadow: none !important;
                background: #ffffff !important;
                color: #000000 !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Action Bar */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
              <button
                type="button"
                onClick={handleOpenPrintTab}
                className="btn btn-secondary"
                style={{ padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem' }}
                title="Abrir proposta em uma nova aba"
              >
                <ExternalLink size={14} />
                <span>Abrir em Nova Aba</span>
              </button>
              <button
                type="button"
                onClick={handlePrintProposal}
                className="btn btn-primary"
                style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <Printer size={16} />
                <span>Imprimir / Salvar PDF</span>
              </button>
            </div>

            {/* A4 Sheet Simulation */}
            <div
              id="commercial-proposal-sheet"
              style={{
                background: '#ffffff',
                color: '#1e293b',
                padding: '44px 48px',
                borderRadius: '4px',
                fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
                boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
                position: 'relative',
                minHeight: '760px',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
            >
              <div>
                {/* Header: Company Logo & Details */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                  <div>
                    {companySettings?.company_logo ? (
                      <img
                        src={companySettings.company_logo}
                        alt="Logo"
                        style={{ maxHeight: 68, maxWidth: 180, objectFit: 'contain' }}
                      />
                    ) : (
                      <div style={{
                        width: 58,
                        height: 58,
                        borderRadius: 10,
                        background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#ffffff'
                      }}>
                        <Package size={34} />
                      </div>
                    )}
                  </div>

                  <div style={{ textAlign: 'right', fontSize: '11px', color: '#334155', lineHeight: '1.45' }}>
                    <div style={{ fontWeight: 800, fontSize: '13px', textTransform: 'uppercase', color: '#0f172a', marginBottom: 2 }}>
                      {companySettings?.company_name || 'EMPRESA'}
                    </div>
                    <div>
                      {[
                        companySettings?.company_address,
                        companySettings?.company_cep,
                        (companySettings?.company_city && companySettings?.company_state)
                          ? `${companySettings.company_city} - ${companySettings.company_state}`
                          : (companySettings?.company_city || companySettings?.company_state)
                      ].filter(Boolean).join(', ') || 'Rua Principal, 100, Cidade - SP'}
                    </div>
                    <div>Telefone: {companySettings?.company_phone || '(55) 97799-7979'}</div>
                    {(() => {
                      const doc = companySettings?.company_cnpj || '123.456.789-01';
                      const isCpf = doc.replace(/\D/g, '').length <= 11;
                      return <div>{isCpf ? 'CPF' : 'CNPJ'}: {doc}</div>;
                    })()}
                  </div>
                </div>

                {/* Divider Line */}
                <div style={{ borderBottom: '1px solid #cbd5e1', marginBottom: 24 }} />

                {/* Proposal Title */}
                <h1 style={{
                  textAlign: 'center',
                  fontSize: '22px',
                  fontWeight: 800,
                  color: '#0f172a',
                  margin: '0 0 26px',
                  letterSpacing: '-0.3px'
                }}>
                  Proposta Comercial
                </h1>

                {/* Customer Block & Dates Grid */}
                <div style={{ display: 'flex', gap: 20, alignItems: 'stretch', marginBottom: 28 }}>
                  {/* Para: Client Card */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: '12px', color: '#0f172a', marginBottom: 6 }}>
                      Para
                    </div>
                    <div style={{
                      border: '1px solid #cbd5e1',
                      padding: '12px 14px',
                      borderRadius: 3,
                      fontSize: '11.5px',
                      lineHeight: '1.6',
                      color: '#1e293b',
                      minHeight: '88px',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '12.5px' }}>
                        {printQuote.customer_name || 'Consumidor Final'}
                      </div>
                      {(() => {
                        const doc = printQuote.customer_document || '000.000.000-00';
                        const isCpf = doc.replace(/\D/g, '').length <= 11;
                        return <div>{isCpf ? 'CPF' : 'CNPJ'}: {doc}</div>;
                      })()}
                      <div>Celular: {printQuote.customer_phone || '(55) 9999-9999'}</div>
                      <div>{printQuote.customer_email || 'contato@cliente.com'}</div>
                    </div>
                  </div>

                  {/* Date & Validity Table */}
                  <div style={{ width: '220px', display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '11.5px' }}>
                      <tbody>
                        <tr style={{ borderBottom: '1px solid #cbd5e1' }}>
                          <td style={{ padding: '7px 10px', background: '#f8fafc', fontWeight: 600, color: '#0f172a', borderRight: '1px solid #cbd5e1', width: '45%' }}>
                            Data
                          </td>
                          <td style={{ padding: '7px 10px', color: '#1e293b', textAlign: 'center' }}>
                            {new Date().toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                        <tr>
                          <td style={{ padding: '7px 10px', background: '#f8fafc', fontWeight: 600, color: '#0f172a', borderRight: '1px solid #cbd5e1' }}>
                            Validade
                          </td>
                          <td style={{ padding: '7px 10px', color: '#1e293b', textAlign: 'center' }}>
                            {printQuote.validity_date
                              ? new Date(printQuote.validity_date + 'T12:00:00').toLocaleDateString('pt-BR')
                              : new Date(Date.now() + (printQuote.validity_days || 30) * 86400000).toLocaleDateString('pt-BR')}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Items Section */}
                <div style={{ marginBottom: 28 }}>
                  <div style={{ fontWeight: 700, fontSize: '13px', color: '#0f172a', marginBottom: 8 }}>
                    Itens da proposta comercial
                  </div>

                  {/* Items Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '11.5px', marginBottom: 12 }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1', textAlign: 'left' }}>
                        <th style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                          Descrição do produto/serviço
                        </th>
                        <th style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 700, textAlign: 'center', width: '70px', borderRight: '1px solid #cbd5e1' }}>
                          Qtd.
                        </th>
                        <th style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 700, textAlign: 'right', width: '110px', borderRight: '1px solid #cbd5e1' }}>
                          Preço unit.
                        </th>
                        <th style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 700, textAlign: 'right', width: '110px' }}>
                          Preço total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {printQuote.items?.map((it, i) => (
                        <tr key={i} style={{ borderBottom: '1px solid #cbd5e1' }}>
                          <td style={{ padding: '8px 12px', color: '#1e293b', borderRight: '1px solid #cbd5e1' }}>
                            {it.name}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#1e293b', textAlign: 'center', borderRight: '1px solid #cbd5e1' }}>
                            {it.qty}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#1e293b', textAlign: 'right', borderRight: '1px solid #cbd5e1' }}>
                            {formatCurrency(it.unitPrice)}
                          </td>
                          <td style={{ padding: '8px 12px', color: '#1e293b', textAlign: 'right', fontWeight: 600 }}>
                            {formatCurrency(it.unitPrice * it.qty)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {/* Summary Totals Table */}
                  <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #cbd5e1', fontSize: '11px', textAlign: 'center' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc', borderBottom: '1px solid #cbd5e1' }}>
                        <th style={{ padding: '7px 8px', color: '#0f172a', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                          N° de Itens
                        </th>
                        <th style={{ padding: '7px 8px', color: '#0f172a', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                          Soma das Qtdes
                        </th>
                        <th style={{ padding: '7px 8px', color: '#0f172a', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                          Total dos itens
                        </th>
                        <th style={{ padding: '7px 8px', color: '#0f172a', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                          Frete
                        </th>
                        <th style={{ padding: '7px 8px', color: '#0f172a', fontWeight: 700, borderRight: '1px solid #cbd5e1' }}>
                          Desconto total
                        </th>
                        <th style={{ padding: '7px 8px', color: '#0f172a', fontWeight: 700 }}>
                          Total da proposta
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                          {printQuote.items?.length || 0}
                        </td>
                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                          {printQuote.items?.reduce((acc, i) => acc + (i.qty || 1), 0) || 0}
                        </td>
                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                          {formatCurrency(printQuote.subtotal || printQuote.total)}
                        </td>
                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                          {printQuote.delivery_method === 'Entrega' && !printQuote.is_free_shipping && Number(printQuote.shipping_cost) > 0
                            ? formatCurrency(printQuote.shipping_cost)
                            : 'Grátis'}
                        </td>
                        <td style={{ padding: '8px', borderRight: '1px solid #cbd5e1' }}>
                          {formatCurrency(printQuote.discount_value || 0)}
                        </td>
                        <td style={{ padding: '8px', fontWeight: 700, color: '#0f172a' }}>
                          {formatCurrency(printQuote.total)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Protocol Row */}
                  <div style={{ textAlign: 'right', fontSize: '10.5px', color: '#94a3b8', marginTop: '8px' }}>
                    Protocolo: {printQuote.code || `PED-${Date.now().toString().slice(-12)}`}
                  </div>
                </div>

                {/* Payment & Delivery conditions */}
                {(printQuote.payment_method || printQuote.delivery_method || printQuote.notes) && (
                  <div style={{
                    border: '1px dashed #cbd5e1',
                    borderRadius: 4,
                    padding: '10px 14px',
                    fontSize: '11px',
                    color: '#475569',
                    marginBottom: 20
                  }}>
                    {printQuote.payment_method && (
                      <div style={{ marginBottom: 4 }}>
                        <strong>Pagamento:</strong> {printQuote.payment_method}
                      </div>
                    )}
                    {printQuote.delivery_method && (
                      <div style={{ marginBottom: printQuote.notes ? 4 : 0 }}>
                        <strong>Entrega:</strong>{' '}
                        {printQuote.delivery_method === 'Entrega' ? (
                          <span>
                            Entrega
                            {printQuote.shipping_carrier ? ` via ${printQuote.shipping_carrier}` : ''}
                            {printQuote.is_free_shipping
                              ? ' — Frete Grátis'
                              : Number(printQuote.shipping_cost) > 0
                              ? ` — Frete: ${formatCurrency(printQuote.shipping_cost)}`
                              : ''}
                          </span>
                        ) : (
                          <span>{printQuote.delivery_method}</span>
                        )}
                      </div>
                    )}
                    {printQuote.notes && (
                      <div style={{ marginTop: 4 }}>
                        <strong>Observações:</strong> {printQuote.notes}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Bottom Footer (Company Details & Page) */}
              <div style={{
                borderTop: '1px solid #cbd5e1',
                paddingTop: '12px',
                marginTop: '32px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                fontSize: '10.5px',
                color: '#64748b'
              }}>
                <div>
                  {[
                    companySettings?.company_name || 'Empresa',
                    companySettings?.company_phone || '55977997979',
                    companySettings?.company_email || 'contato@gmail.com'
                  ].filter(Boolean).join(' | ')}
                </div>
                <div>Página 1 de 1</div>
              </div>
            </div>
          </div>
        </Modal>
      )}

      {/* Quick-add New Customer Modal */}
      {newCustomerModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setNewCustomerModalOpen(false)}
          title="Novo Cliente"
          maxWidth="480px"
        >
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!newCustomerForm.name.trim()) return;
              try {
                setSavingNewCustomer(true);
                const created = await api.createCustomer({
                  name: newCustomerForm.name.trim(),
                  phone: newCustomerForm.phone,
                  email: newCustomerForm.email,
                  document: newCustomerForm.document
                });
                // Refresh customer list
                const custs = await api.getCustomers();
                setCustomers(custs || []);
                // Auto-populate order form with the new customer
                setOrderForm(prev => ({
                  ...prev,
                  customer_name: created.name || newCustomerForm.name,
                  customer_phone: created.phone || newCustomerForm.phone,
                  customer_email: created.email || newCustomerForm.email,
                  customer_document: created.document || newCustomerForm.document
                }));
                setNewCustomerModalOpen(false);
              } catch (err) {
                alert(err.message || 'Erro ao criar cliente.');
              } finally {
                setSavingNewCustomer(false);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <div className="form-group">
              <label className="form-label">Nome *</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nome completo ou empresa"
                value={newCustomerForm.name}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, name: e.target.value })}
                required
                autoFocus
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Telefone / WhatsApp</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="(00) 00000-0000"
                  value={newCustomerForm.phone}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, phone: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label className="form-label">CPF / CNPJ</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="000.000.000-00"
                  value={newCustomerForm.document}
                  onChange={(e) => setNewCustomerForm({ ...newCustomerForm, document: e.target.value })}
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">E-mail</label>
              <input
                type="email"
                className="form-control"
                placeholder="cliente@email.com"
                value={newCustomerForm.email}
                onChange={(e) => setNewCustomerForm({ ...newCustomerForm, email: e.target.value })}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 4 }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setNewCustomerModalOpen(false)}
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
                disabled={savingNewCustomer}
              >
                {savingNewCustomer ? 'Salvando...' : 'Criar Cliente'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
