import React, { useState, useEffect } from 'react';
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  X,
  Check,
  Send,
  Building2,
  ArrowLeft,
  Package,
  Layers,
  Phone,
  User,
  MapPin,
  MessageSquare
} from 'lucide-react';
import { api } from '../api/client.js';
import { formatCurrency } from '../utils/formatters.js';

export function Catalog({ onBackToDashboard, isEmbedded = false }) {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState(['Todos']);
  const [selectedCategory, setSelectedCategory] = useState('Todos');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Store & Settings
  const [storeSettings, setStoreSettings] = useState({
    company_name: 'Minha Companhia',
    company_logo: '',
    company_phone: '',
    company_email: '',
    catalog_settings_json: null
  });

  // Cart State (stored in localStorage for returning customers)
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem('precifica3d_public_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [cartOpen, setCartOpen] = useState(false);
  const [orderSent, setOrderSent] = useState(false);

  // Customer Checkout Form
  const [customerForm, setCustomerForm] = useState({
    name: '',
    phone: '',
    address: '',
    notes: ''
  });

  useEffect(() => {
    loadCatalogData();
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('precifica3d_public_cart', JSON.stringify(cart));
    } catch {}
  }, [cart]);

  const loadCatalogData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load products for catalog and store profile
      const [prodRes, settingsRes] = await Promise.all([
        api.getProducts({ catalog_only: true }).catch(() => ({ products: [], categories: ['Todos'] })),
        api.getSettings().catch(() => ({ settings: {} }))
      ]);

      setProducts(prodRes.products || []);
      setCategories(prodRes.categories || ['Todos']);

      if (settingsRes?.settings) {
        setStoreSettings(prev => ({
          ...prev,
          ...settingsRes.settings
        }));
      }
    } catch (err) {
      console.error('Erro ao carregar catálogo:', err);
      setError('Não foi possível carregar os produtos do catálogo.');
    } finally {
      setLoading(false);
    }
  };

  // Cart Operations
  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, qty: item.qty + 1 } : item
        );
      }
      return [...prev, {
        id: product.id,
        name: product.name,
        image_url: product.image_url,
        sale_price: product.sale_price || 0,
        qty: 1
      }];
    });
  };

  const updateCartQty = (productId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const nextQty = item.qty + delta;
          return nextQty > 0 ? { ...item, qty: nextQty } : null;
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  const totalCartCount = cart.reduce((acc, i) => acc + i.qty, 0);
  const totalCartValue = cart.reduce((acc, i) => acc + (i.sale_price * i.qty), 0);

  // Filter products by search and category
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'Todos' || p.category === selectedCategory;
    const q = search.toLowerCase().trim();
    const matchesSearch = !q ||
      (p.name || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  // Handle Checkout via WhatsApp
  const handleCheckoutWhatsApp = () => {
    if (cart.length === 0) return;

    let phone = storeSettings.company_phone || '';
    phone = phone.replace(/\D/g, '');
    if (phone.length === 10 || phone.length === 11) {
      phone = `55${phone}`;
    }

    const itemsText = cart.map(i => `• ${i.qty}x *${i.name}* - ${formatCurrency(i.sale_price * i.qty)}`).join('\n');
    const customerInfo = [];
    if (customerForm.name) customerInfo.push(`*Nome:* ${customerForm.name}`);
    if (customerForm.phone) customerInfo.push(`*Telefone:* ${customerForm.phone}`);
    if (customerForm.address) customerInfo.push(`*Endereço:* ${customerForm.address}`);
    if (customerForm.notes) customerInfo.push(`*Observações:* ${customerForm.notes}`);

    const message = [
      `🛒 *NOVO PEDIDO DO CATÁLOGO*`,
      `Olá, *${storeSettings.company_name || 'Loja 3D'}*! Gostaria de fazer este pedido:`,
      ``,
      itemsText,
      ``,
      `💰 *Total:* ${formatCurrency(totalCartValue)}`,
      customerInfo.length > 0 ? `\n📋 *Dados do Cliente:*\n${customerInfo.join('\n')}` : '',
      ``,
      `_Enviado através do Catálogo Precifica 3D_`
    ].join('\n');

    const whatsappUrl = phone
      ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
      : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, '_blank');
    setOrderSent(true);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      color: '#0f172a',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      position: 'relative'
    }}>
      {/* Top Header Bar (Identical to reference screenshot 014442.png) */}
      <header style={{
        background: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        padding: '16px 24px',
        position: 'sticky',
        top: 0,
        zIndex: 50,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          maxWidth: '1200px',
          margin: '0 auto',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16
        }}>
          {/* Brand / Company Info */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            {onBackToDashboard && (
              <button
                type="button"
                onClick={onBackToDashboard}
                style={{
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  borderRadius: '50%',
                  width: 38,
                  height: 38,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#475569',
                  cursor: 'pointer',
                  marginRight: 4
                }}
                title="Voltar ao Painel"
              >
                <ArrowLeft size={18} />
              </button>
            )}

            {storeSettings.company_logo ? (
              <img
                src={storeSettings.company_logo}
                alt={storeSettings.company_name}
                style={{ width: 44, height: 44, borderRadius: 10, objectFit: 'contain' }}
              />
            ) : (
              <div style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'linear-gradient(135deg, #00bcd4 0%, #0284c7 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.25rem',
                fontWeight: 800,
                boxShadow: '0 4px 10px rgba(0, 188, 212, 0.3)'
              }}>
                {(storeSettings.company_name || 'M').charAt(0).toUpperCase()}
              </div>
            )}

            <div>
              <h1 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                {storeSettings.company_name || 'Minha Companhia'}
              </h1>
              <p style={{ fontSize: '0.75rem', color: '#64748b', margin: 0 }}>
                Catálogo de Impressão 3D & Produtos
              </p>
            </div>
          </div>

          {/* Cart Header Button */}
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              background: '#00bcd4',
              color: '#ffffff',
              border: 'none',
              padding: '8px 16px',
              borderRadius: 24,
              fontSize: '0.875rem',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0, 188, 212, 0.3)',
              transition: 'transform 0.15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.03)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
          >
            <ShoppingCart size={16} />
            <span>Carrinho</span>
            {totalCartCount > 0 && (
              <span style={{
                background: '#ffffff',
                color: '#00bcd4',
                fontSize: '0.75rem',
                fontWeight: 800,
                padding: '1px 7px',
                borderRadius: 12
              }}>
                {totalCartCount}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Main Catalog Body */}
      <main style={{ maxWidth: '1200px', margin: '0 auto', padding: '24px 20px 80px' }}>
        {/* Search Bar (Matches reference screenshot 014442.png) */}
        <div style={{ maxWidth: '600px', margin: '0 auto 24px' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            background: '#ffffff',
            border: '1px solid #cbd5e1',
            borderRadius: 30,
            padding: '6px 16px',
            boxShadow: '0 2px 6px rgba(0,0,0,0.04)',
            transition: 'border-color 0.2s'
          }}>
            <Search size={18} color="#94a3b8" style={{ marginRight: 10, flexShrink: 0 }} />
            <input
              type="text"
              placeholder="Buscar produto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                border: 'none',
                outline: 'none',
                width: '100%',
                fontSize: '0.9375rem',
                color: '#0f172a',
                background: 'transparent'
              }}
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer' }}
              >
                <X size={16} />
              </button>
            )}
          </div>
        </div>

        {/* Category Pills */}
        {categories.length > 1 && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            flexWrap: 'wrap',
            marginBottom: 28
          }}>
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                style={{
                  padding: '6px 16px',
                  borderRadius: 20,
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  border: selectedCategory === cat ? '1px solid #00bcd4' : '1px solid #e2e8f0',
                  background: selectedCategory === cat ? 'rgba(0, 188, 212, 0.1)' : '#ffffff',
                  color: selectedCategory === cat ? '#008ba3' : '#64748b',
                  cursor: 'pointer',
                  transition: 'all 0.15s'
                }}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* Products Grid */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b', fontSize: '0.9375rem' }}>
            Carregando catálogo de produtos...
          </div>
        ) : error ? (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#ef4444', fontSize: '0.9375rem' }}>
            {error}
          </div>
        ) : filteredProducts.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            background: '#ffffff',
            borderRadius: 16,
            border: '1px dashed #cbd5e1',
            maxWidth: '500px',
            margin: '0 auto'
          }}>
            <Package size={48} color="#94a3b8" style={{ margin: '0 auto 14px' }} />
            <h3 style={{ fontSize: '1.125rem', fontWeight: 700, color: '#1e293b', marginBottom: 6 }}>
              Nenhum produto encontrado
            </h3>
            <p style={{ fontSize: '0.875rem', color: '#64748b', maxWidth: '340px', margin: '0 auto' }}>
              {search
                ? `Nenhum resultado para "${search}". Tente buscar por outros termos.`
                : 'Nenhum produto está ativo no catálogo público no momento. Ative produtos na tela de Produtos.'}
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))',
            gap: 20
          }}>
            {filteredProducts.map(prod => {
              const inCartItem = cart.find(i => i.id === prod.id);

              return (
                <div
                  key={prod.id}
                  style={{
                    background: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRadius: 16,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.03)',
                    transition: 'all 0.2s',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'translateY(-3px)';
                    e.currentTarget.style.boxShadow = '0 10px 25px rgba(0,0,0,0.08)';
                    e.currentTarget.style.borderColor = '#00bcd4';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = 'translateY(0)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.03)';
                    e.currentTarget.style.borderColor = '#e2e8f0';
                  }}
                >
                  {/* Product Image Box */}
                  <div style={{
                    height: 220,
                    background: '#f8fafc',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                    padding: 16,
                    position: 'relative'
                  }}>
                    {prod.image_url ? (
                      <img
                        src={prod.image_url}
                        alt={prod.name}
                        style={{ maxHeight: '100%', maxWidth: '100%', objectFit: 'contain' }}
                        onError={(e) => {
                          if (!e.currentTarget.dataset.retried && prod.image_url.startsWith('/uploads')) {
                            e.currentTarget.dataset.retried = 'true';
                            e.currentTarget.src = `http://localhost:5172${prod.image_url}`;
                          } else {
                            e.currentTarget.style.display = 'none';
                          }
                        }}
                      />
                    ) : (
                      <div style={{ textAlign: 'center', color: '#94a3b8' }}>
                        <Layers size={36} />
                        <div style={{ fontSize: '0.6875rem', marginTop: 4 }}>Sem imagem</div>
                      </div>
                    )}

                    {prod.category && prod.category !== 'Geral' && (
                      <span style={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        background: 'rgba(255,255,255,0.9)',
                        backdropFilter: 'blur(4px)',
                        padding: '3px 8px',
                        borderRadius: 6,
                        fontSize: '0.6875rem',
                        fontWeight: 700,
                        color: '#0284c7'
                      }}>
                        {prod.category}
                      </span>
                    )}
                  </div>

                  {/* Card Content */}
                  <div style={{ padding: '16px', display: 'flex', flexDirection: 'column', flex: 1 }}>
                    <h2 style={{
                      fontSize: '0.9375rem',
                      fontWeight: 700,
                      color: '#0f172a',
                      marginBottom: 6,
                      lineHeight: 1.3
                    }}>
                      {prod.name}
                    </h2>

                    {prod.description && (
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#64748b',
                        marginBottom: 14,
                        lineHeight: 1.4,
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                      }}>
                        {prod.description}
                      </p>
                    )}

                    {/* Price & Action Button (Matches reference screenshot 014442.png) */}
                    <div style={{
                      marginTop: 'auto',
                      paddingTop: 12,
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 8
                    }}>
                      <div>
                        <span style={{
                          fontSize: '1.125rem',
                          fontWeight: 800,
                          color: '#00bcd4',
                          fontFamily: 'var(--font-mono, monospace)'
                        }}>
                          {formatCurrency(prod.sale_price || 0)}
                        </span>
                      </div>

                      {inCartItem ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <button
                            type="button"
                            onClick={() => updateCartQty(prod.id, -1)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: '#f1f5f9',
                              border: '1px solid #cbd5e1',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#0f172a'
                            }}
                          >
                            <Minus size={13} />
                          </button>
                          <span style={{ fontSize: '0.8125rem', fontWeight: 800, minWidth: 16, textAlign: 'center' }}>
                            {inCartItem.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateCartQty(prod.id, 1)}
                            style={{
                              width: 28,
                              height: 28,
                              borderRadius: 6,
                              background: '#00bcd4',
                              border: 'none',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer',
                              color: '#ffffff'
                            }}
                          >
                            <Plus size={13} />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => addToCart(prod)}
                          style={{
                            background: '#00bcd4',
                            color: '#ffffff',
                            border: 'none',
                            padding: '7px 14px',
                            borderRadius: 8,
                            fontSize: '0.8125rem',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: 6,
                            cursor: 'pointer',
                            transition: 'background-color 0.15s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#00acc1'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#00bcd4'}
                        >
                          <ShoppingCart size={14} />
                          <span>Adicionar</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Cart Button (Bottom Right - Exactly matches reference screenshot 014442.png) */}
      <div style={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        zIndex: 100
      }}>
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            background: '#00bcd4',
            color: '#ffffff',
            border: 'none',
            padding: '12px 22px',
            borderRadius: 30,
            fontSize: '0.9375rem',
            fontWeight: 800,
            boxShadow: '0 8px 24px rgba(0, 188, 212, 0.45)',
            cursor: 'pointer',
            transition: 'transform 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
        >
          <ShoppingCart size={18} />
          <span>Carrinho</span>
          <span style={{
            background: '#ffffff',
            color: '#00bcd4',
            borderRadius: 12,
            padding: '2px 8px',
            fontSize: '0.8125rem',
            fontWeight: 900
          }}>
            {totalCartCount}
          </span>
        </button>
      </div>

      {/* Cart Drawer / Modal */}
      {cartOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(15, 23, 42, 0.6)',
          backdropFilter: 'blur(4px)',
          zIndex: 9999,
          display: 'flex',
          justifyContent: 'flex-end',
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            width: '100%',
            maxWidth: '460px',
            height: '100vh',
            background: '#ffffff',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-10px 0 30px rgba(0,0,0,0.15)'
          }}>
            {/* Drawer Header */}
            <div style={{
              padding: '20px 24px',
              borderBottom: '1px solid #e2e8f0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <ShoppingCart size={20} color="#00bcd4" />
                <h3 style={{ fontSize: '1.125rem', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                  Seu Carrinho ({totalCartCount})
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setCartOpen(false)}
                style={{
                  background: '#f1f5f9',
                  border: 'none',
                  borderRadius: '50%',
                  width: 32,
                  height: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  color: '#64748b'
                }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Drawer Items Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
              {cart.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                  <ShoppingCart size={48} style={{ margin: '0 auto 12px', opacity: 0.4 }} />
                  <p style={{ fontWeight: 600 }}>Seu carrinho está vazio.</p>
                  <p style={{ fontSize: '0.8125rem' }}>Adicione produtos do catálogo para finalizar um pedido.</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {cart.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px',
                        background: '#f8fafc',
                        borderRadius: 12,
                        border: '1px solid #e2e8f0'
                      }}
                    >
                      <div style={{
                        width: 50,
                        height: 50,
                        borderRadius: 8,
                        background: '#ffffff',
                        border: '1px solid #cbd5e1',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        overflow: 'hidden',
                        flexShrink: 0
                      }}>
                        {item.image_url ? (
                          <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                        ) : (
                          <Layers size={20} color="#94a3b8" />
                        )}
                      </div>

                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.875rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.name}
                        </div>
                        <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#00bcd4' }}>
                          {formatCurrency(item.sale_price * item.qty)}
                        </div>
                      </div>

                      {/* Qty controls */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, -1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: '#ffffff',
                            border: '1px solid #cbd5e1',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Minus size={12} />
                        </button>
                        <span style={{ fontSize: '0.8125rem', fontWeight: 800, minWidth: 16, textAlign: 'center' }}>
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateCartQty(item.id, 1)}
                          style={{
                            width: 26,
                            height: 26,
                            borderRadius: 6,
                            background: '#00bcd4',
                            border: 'none',
                            color: '#ffffff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer'
                          }}
                        >
                          <Plus size={12} />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#ef4444',
                          cursor: 'pointer',
                          padding: 4
                        }}
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))}

                  {/* Customer Information Form */}
                  <div style={{
                    marginTop: 16,
                    padding: '16px',
                    background: '#f1f5f9',
                    borderRadius: 12,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 10
                  }}>
                    <div style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#334155', display: 'flex', alignItems: 'center', gap: 6 }}>
                      <User size={14} color="#00bcd4" />
                      <span>Seus dados para o pedido:</span>
                    </div>

                    <input
                      type="text"
                      placeholder="Seu nome completo"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8125rem',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    />

                    <input
                      type="text"
                      placeholder="Telefone / WhatsApp"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm({ ...customerForm, phone: e.target.value })}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8125rem',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    />

                    <input
                      type="text"
                      placeholder="Endereço de entrega (opcional)"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm({ ...customerForm, address: e.target.value })}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8125rem',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    />

                    <input
                      type="text"
                      placeholder="Observações adicionais"
                      value={customerForm.notes}
                      onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                      style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        border: '1px solid #cbd5e1',
                        fontSize: '0.8125rem',
                        outline: 'none',
                        background: '#ffffff'
                      }}
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer & Checkout Action */}
            {cart.length > 0 && (
              <div style={{
                padding: '20px 24px',
                borderTop: '1px solid #e2e8f0',
                background: '#ffffff'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 16
                }}>
                  <span style={{ fontSize: '0.9375rem', fontWeight: 600, color: '#64748b' }}>
                    Total do Pedido:
                  </span>
                  <span style={{
                    fontSize: '1.375rem',
                    fontWeight: 900,
                    color: '#00bcd4',
                    fontFamily: 'var(--font-mono, monospace)'
                  }}>
                    {formatCurrency(totalCartValue)}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleCheckoutWhatsApp}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: 10,
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    fontSize: '0.9375rem',
                    fontWeight: 800,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                  }}
                >
                  <MessageSquare size={18} />
                  <span>Enviar Pedido pelo WhatsApp</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
