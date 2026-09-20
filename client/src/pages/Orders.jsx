import React, { useState, useEffect } from 'react';
import {
  Search,
  Plus,
  Calendar,
  User,
  Package,
  Printer,
  ChevronDown,
  Trash2,
  CheckCircle,
  Clock,
  Send,
  FileText,
  DollarSign,
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { api } from '../api/client.js';
import { Modal } from '../components/common/Modal.jsx';
import { Badge } from '../components/common/Badge.jsx';
import { formatCurrency, formatDate, formatPercent } from '../utils/formatters.js';

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

  // New Customer Quick-add Modal
  const [newCustomerModalOpen, setNewCustomerModalOpen] = useState(false);
  const [newCustomerForm, setNewCustomerForm] = useState({ name: '', phone: '', email: '', document: '' });
  const [savingNewCustomer, setSavingNewCustomer] = useState(false);

  // Order Form
  const [orderForm, setOrderForm] = useState({
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
    delivery_method: 'A combinar',
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

  const openNewOrderWithProduct = (product) => {
    setOrderForm({
      customer_name: '',
      customer_phone: '',
      customer_email: '',
      notes: '',
      status: 'proposta',
      payment_status: 'pendente',
      payment_method: 'PIX',
      validity_days: 30,
      delivery_method: 'A combinar',
      discount_pct: 0,
      discount_value: 0,
      items: [
        {
          productId: product.id || null,
          name: product.name,
          qty: product.qty || 1,
          unitPrice: product.sale_price || 0,
          unitCost: product.unit_cost || 0,
          discount: 0
        }
      ]
    });
    setActiveOrder(null);
    setOrderModalOpen(true);
  };

  const handleOpenEditOrder = (order) => {
    setActiveOrder(order);
    setOrderForm({
      id: order.id,
      code: order.code,
      customer_name: order.customer_name || '',
      customer_phone: order.customer_phone || '',
      customer_email: order.customer_email || '',
      notes: order.notes || '',
      status: order.status || 'proposta',
      payment_status: order.payment_status || 'pendente',
      payment_method: order.payment_method || 'PIX',
      validity_days: order.validity_days || 30,
      delivery_method: order.delivery_method || 'A combinar',
      discount_pct: order.discount_pct || 0,
      discount_value: order.discount_value || 0,
      items: order.items || []
    });
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
    const total = Math.max(0, subtotal - generalDiscount);
    const netProfit = total - cost;

    return { subtotal, total, cost, netProfit };
  };

  const { subtotal, total, cost, netProfit } = calculateTotals();

  const handleSaveOrder = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        ...orderForm,
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
            qty: 1,
            unitPrice: product.sale_price,
            unitCost: product.unit_cost,
            discount: 0
          }
        ]
      });
    }
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
              customer_name: '',
              customer_phone: '',
              customer_email: '',
              notes: '',
              status: 'proposta',
              payment_status: 'pendente',
              payment_method: 'PIX',
              validity_days: 30,
              delivery_method: 'A combinar',
              discount_pct: 0,
              discount_value: 0,
              items: []
            });
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
                        <Badge status={order.status} />
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

      {/* Order Create / Edit Modal */}
      {orderModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setOrderModalOpen(false)}
          title={activeOrder ? `Pedido ${activeOrder.code}` : 'Novo Pedido / Proposta'}
          maxWidth="900px"
        >
          <form onSubmit={handleSaveOrder} style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Top Status and Print Bar */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              background: 'var(--bg-input)',
              padding: '10px 16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)',
              flexWrap: 'wrap',
              gap: 10
            }}>
              {/* Status Radio Buttons */}
              <div style={{ display: 'flex', gap: 8 }}>
                {columns.map(c => (
                  <button
                    key={c.key}
                    type="button"
                    onClick={() => setOrderForm({ ...orderForm, status: c.key })}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 'var(--radius-md)',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      border: orderForm.status === c.key ? `1px solid ${c.color}` : '1px solid transparent',
                      background: orderForm.status === c.key ? `${c.color}20` : 'transparent',
                      color: orderForm.status === c.key ? c.color : 'var(--text-muted)',
                      cursor: 'pointer'
                    }}
                  >
                    {c.label}
                  </button>
                ))}
              </div>

              {/* PDF / Print Quote Button */}
              <button
                type="button"
                onClick={() => setPrintQuote({ ...orderForm, total, subtotal, cost, netProfit })}
                className="btn btn-secondary"
                style={{ fontSize: '0.75rem', padding: '6px 12px' }}
              >
                <Printer size={14} />
                <span>Imprimir Orçamento</span>
              </button>
            </div>

            {/* Customer Section */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  DADOS DO CLIENTE
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: '0.75rem', color: '#00bcd4' }}>Preencher com:</span>
                  <select
                    className="form-control"
                    style={{ fontSize: '0.75rem', padding: '4px 8px', width: 'auto' }}
                    onChange={(e) => {
                      const custId = parseInt(e.target.value, 10);
                      const c = customers.find(x => x.id === custId);
                      if (c) {
                        setOrderForm({
                          ...orderForm,
                          customer_name: c.name || '',
                          customer_document: c.document || '',
                          customer_phone: c.phone || '',
                          customer_email: c.email || '',
                          customer_address: [c.address, c.city, c.state].filter(Boolean).join(' - ')
                        });
                      }
                    }}
                  >
                    <option value="">Selecione um cliente cadastrado...</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ''} {c.document ? `• ${c.document}` : ''}
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
                    style={{ fontSize: '0.75rem', padding: '4px 10px', whiteSpace: 'nowrap', color: '#10b981', borderColor: 'rgba(16, 185, 129, 0.3)' }}
                  >
                    <Plus size={13} />
                    <span>Novo</span>
                  </button>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: 12 }}>
                <div className="form-group">
                  <label className="form-label">Nome do Cliente</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nome completo ou empresa"
                    value={orderForm.customer_name}
                    onChange={(e) => setOrderForm({ ...orderForm, customer_name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">CPF / CNPJ</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="000.000.000-00"
                    value={orderForm.customer_document || ''}
                    onChange={(e) => setOrderForm({ ...orderForm, customer_document: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="(00) 00000-0000"
                    value={orderForm.customer_phone}
                    onChange={(e) => setOrderForm({ ...orderForm, customer_phone: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">E-mail</label>
                  <input
                    type="email"
                    className="form-control"
                    placeholder="cliente@email.com"
                    value={orderForm.customer_email}
                    onChange={(e) => setOrderForm({ ...orderForm, customer_email: e.target.value })}
                  />
                </div>
              </div>
            </div>

            {/* Order Items */}
            <div style={{
              background: 'var(--bg-input)',
              padding: '16px',
              borderRadius: 'var(--radius-md)',
              border: '1px solid var(--border-color)'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                  ITENS DO PEDIDO ({orderForm.items.length})
                </div>

                {/* Add product dropdown */}
                {availableProducts.length > 0 && (
                  <select
                    className="form-control"
                    style={{ width: 'auto', fontSize: '0.75rem', padding: '4px 10px' }}
                    onChange={(e) => {
                      const prodId = parseInt(e.target.value, 10);
                      const p = availableProducts.find(x => x.id === prodId);
                      if (p) handleAddItemFromCatalog(p);
                      e.target.value = '';
                    }}
                  >
                    <option value="">+ Adicionar produto do catálogo...</option>
                    {availableProducts.map(p => (
                      <option key={p.id} value={p.id}>{p.name} ({formatCurrency(p.sale_price)})</option>
                    ))}
                  </select>
                )}
              </div>

              {orderForm.items.length === 0 ? (
                <div style={{ color: 'var(--text-muted)', fontSize: '0.8125rem', textAlign: 'center', padding: '16px' }}>
                  Nenhum produto adicionado. Selecione acima ou crie produtos na Calculadora.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {orderForm.items.map((item, idx) => (
                    <div key={idx} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '10px 12px',
                      background: 'var(--bg-card)',
                      borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--border-color)'
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{item.name}</div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          Unitário: {formatCurrency(item.unitPrice)}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        {/* Qty controls */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => {
                              const newQty = Math.max(1, (item.qty || 1) - 1);
                              setOrderForm({
                                ...orderForm,
                                items: orderForm.items.map((it, i) => i === idx ? { ...it, qty: newQty } : it)
                              });
                            }}
                            className="btn btn-secondary btn-icon"
                            style={{ width: 26, height: 26 }}
                          >
                            -
                          </button>
                          <span style={{ fontWeight: 700, fontSize: '0.875rem', minWidth: '24px', textAlign: 'center' }}>
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
                            className="btn btn-secondary btn-icon"
                            style={{ width: 26, height: 26 }}
                          >
                            +
                          </button>
                        </div>

                        {/* Item Total */}
                        <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#00e5ff', minWidth: '90px', textAlign: 'right' }}>
                          {formatCurrency((item.unitPrice || 0) * (item.qty || 1))}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setOrderForm({
                              ...orderForm,
                              items: orderForm.items.filter((_, i) => i !== idx)
                            });
                          }}
                          className="btn btn-danger btn-icon"
                          style={{ width: 28, height: 28 }}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Commercial Conditions & Payment */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Forma de Pagamento</label>
                <select
                  className="form-control"
                  value={orderForm.payment_method}
                  onChange={(e) => setOrderForm({ ...orderForm, payment_method: e.target.value })}
                >
                  <option value="PIX">PIX</option>
                  <option value="Cartão de Crédito">Cartão de Crédito</option>
                  <option value="Cartão de Débito">Cartão de Débito</option>
                  <option value="Boleto">Boleto</option>
                  <option value="Dinheiro">Dinheiro</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Status do Pagamento</label>
                <select
                  className="form-control"
                  value={orderForm.payment_status}
                  onChange={(e) => setOrderForm({ ...orderForm, payment_status: e.target.value })}
                >
                  <option value="pendente">Pendente</option>
                  <option value="pago">Pago</option>
                  <option value="vencido">Vencido</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Método de Entrega</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex: A combinar, Sedex, Retirada..."
                  value={orderForm.delivery_method}
                  onChange={(e) => setOrderForm({ ...orderForm, delivery_method: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Desconto Geral (R$)</label>
                <input
                  type="number"
                  step="0.5"
                  min="0"
                  className="form-control"
                  value={orderForm.discount_value}
                  onChange={(e) => setOrderForm({ ...orderForm, discount_value: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="form-group">
              <label className="form-label">Observações do Pedido</label>
              <textarea
                className="form-control"
                rows={2}
                placeholder="Detalhes sobre cores, acabamento ou prazos de entrega..."
                value={orderForm.notes}
                onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
              />
            </div>

            {/* Financial Summary & Save */}
            <div style={{
              background: 'linear-gradient(135deg, rgba(0, 188, 212, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)',
              border: '1px solid rgba(0, 188, 212, 0.3)',
              borderRadius: 'var(--radius-lg)',
              padding: '16px 20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 16
            }}>
              <div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Total a Cobrar do Cliente
                </div>
                <div style={{ fontSize: '1.75rem', fontWeight: 800, color: '#00e5ff', fontFamily: 'var(--font-mono)' }}>
                  {formatCurrency(total)}
                </div>
                {!clientMode && (
                  <div style={{ fontSize: '0.8125rem', color: '#10b981', fontWeight: 600 }}>
                    Lucro líquido estimado: {formatCurrency(netProfit)}
                  </div>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {activeOrder && (
                  <button
                    type="button"
                    onClick={() => handleDeleteOrder(activeOrder.id)}
                    className="btn btn-danger"
                  >
                    <Trash2 size={16} />
                    <span>Excluir</span>
                  </button>
                )}

                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: '10px 24px' }}
                >
                  Salvar Pedido
                </button>
              </div>
            </div>
          </form>
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
                            {new Date(Date.now() + (printQuote.validity_days || 30) * 86400000).toLocaleDateString('pt-BR')}
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
                          R$ 0,00
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
                    {printQuote.payment_method && <div><strong>Pagamento:</strong> {printQuote.payment_method}</div>}
                    {printQuote.delivery_method && <div><strong>Entrega:</strong> {printQuote.delivery_method}</div>}
                    {printQuote.notes && <div style={{ marginTop: 4 }}><strong>Observações:</strong> {printQuote.notes}</div>}
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
