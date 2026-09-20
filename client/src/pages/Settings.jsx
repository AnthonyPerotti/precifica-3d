import React, { useState, useEffect } from 'react';
import {
  User,
  Building2,
  Users,
  Disc,
  Settings as SettingsIcon,
  ShoppingBag,
  Link2,
  Upload,
  Plus,
  Trash2,
  Edit2,
  Check,
  AlertCircle,
  LogOut,
  HelpCircle,
  Search,
  Globe,
  Sliders,
  Sparkles,
  Download
} from 'lucide-react';
import { api } from '../api/client.js';
import { Modal } from '../components/common/Modal.jsx';
import { formatCurrency, maskCpfCnpj, maskPhone } from '../utils/formatters.js';

// Brazilian Electricity Tariffs per State (UF) - exact from reference screenshot 014028.png
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

// Printer Presets (Watts & Machine Hour Cost) - exact from reference screenshot 014023.png
const PRINTER_PRESETS = [
  { group: 'Bambu Lab', name: 'Bambu Lab A1 mini', watts: 150, hourCost: 0.25 },
  { group: 'Bambu Lab', name: 'Bambu Lab A1', watts: 150, hourCost: 0.25 },
  { group: 'Bambu Lab', name: 'Bambu Lab P1S', watts: 200, hourCost: 0.40 },
  { group: 'Bambu Lab', name: 'Bambu Lab P1P', watts: 200, hourCost: 0.40 },
  { group: 'Bambu Lab', name: 'Bambu Lab X1 Carbon', watts: 250, hourCost: 0.65 },
  { group: 'Bambu Lab', name: 'Bambu Lab X1E', watts: 250, hourCost: 0.65 },
  { group: 'Bambu Lab', name: 'Bambu Lab H2D', watts: 300, hourCost: 0.75 },
  { group: 'Prusa', name: 'Prusa MK4 / MK4S', watts: 120, hourCost: 0.65 },
  { group: 'Prusa', name: 'Prusa CORE One', watts: 180, hourCost: 0.70 },
  { group: 'Creality', name: 'Creality K1 / K1 Max', watts: 200, hourCost: 0.40 },
  { group: 'Creality', name: 'Creality Ender 3 (V2/V3)', watts: 180, hourCost: 0.30 },
  { group: 'Elegoo', name: 'Elegoo Neptune', watts: 180, hourCost: 0.30 }
];

// Filament Preset Brands - exact from reference screenshot 014014.png
const PRESET_BRANDS = [
  '3D LAB', '3D Prime', '3M3', 'Aura Filamentos', 'Bambu', 'Bambu Lab',
  'Creality', 'Elegoo', 'eSUN', 'F3D', 'Fornecido pelo Cliente', 'FUTUR3D',
  'Generic', 'Lambo', 'MasterPrint', 'MULTIFILA', 'PollyFlow', 'Polymaker',
  'Sunlu', 'Voolt', 'Voolt 3D', 'Voolt3D', 'XiaoZhuZi'
];

export function Settings({ onLogout }) {
  const [activeTab, setActiveTab] = useState('custos-padrao');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState(null);

  // User Profile
  const [userProfile, setUserProfile] = useState({ name: 'Usuario', email: 'admin@precifica3d.local' });
  const [editingUserName, setEditingUserName] = useState(false);
  const [tempUserName, setTempUserName] = useState('');

  // General Settings
  const [settings, setSettings] = useState({
    business_name: 'Minha Empresa 3D',
    company_name: 'Minha Companhia',
    company_cnpj: '',
    company_ie: '',
    company_cep: '',
    company_address: '',
    company_city: 'São Paulo',
    company_state: 'SP',
    company_phone: '',
    company_email: '',
    company_logo: '',
    energy_kwh_cost: 0.80,
    default_printer_power_w: 200,
    machine_hour_cost: 0.40,
    labor_hour_cost: 10.00,
    failure_margin_pct: 20.0,
    default_markup: 2.0,
    default_tax_pct: 0.0,
    default_marketplace_fee_pct: 0.0,
    selected_state_uf: 'SP',
    catalog_settings_json: '{}'
  });

  // Catalog Settings State
  const [catalogSubtab, setCatalogSubtab] = useState('aparencia');
  const [catalogConfig, setCatalogConfig] = useState({
    active: true,
    slug: 'minhaloja',
    storeName: 'Precifica 3D Store',
    description: 'Peças exclusivas impressas em 3D de alta qualidade.',
    whatsapp: '',
    primaryColor: '#06b6d4',
    accentColor: '#8b5cf6',
    bgType: 'solid', // solid or gradient
    bgColor: '#0b1118',
    font: 'system',
    bannerHeight: 'Médio', // Pequeno, Médio, Grande
    overlayStyle: 'Gradiente', // Gradiente, Sólido, Nenhum
    overlayOpacity: 40,
    logoShape: 'Arredondado', // Arredondado, Circular, Quadrado
    logoSize: 'Médio',
    showHeaderLocation: true,
    showHeaderDesc: true,
    gridCols: 4, // 2, 3, 4
    cardStyle: 'Padrão', // Padrão, Compacto, Horizontal
    cardSpacing: 'Normal', // Justo, Normal, Espaçado
    maxWidth: 'Normal', // Estreita, Normal, Larga
    showSearch: true,
    showCategories: true,
    showFooter: true,
    footerText: 'Todos os direitos reservados. Impressão 3D sob demanda.',
    showPoweredBy: true,
    instagram: '',
    facebook: '',
    tiktok: '',
    website: ''
  });

  // Filaments State
  const [filaments, setFilaments] = useState([]);
  const [filamentSearch, setFilamentSearch] = useState('');
  const [filamentModalOpen, setFilamentModalOpen] = useState(false);
  const [editingFilamentId, setEditingFilamentId] = useState(null);
  const [brandMode, setBrandMode] = useState('existing'); // 'existing' | 'new'
  const [filamentForm, setFilamentForm] = useState({
    brand: '3D LAB',
    customBrand: '',
    type: 'PLA',
    priceKg: 130.00
  });

  // Customers State
  const [customers, setCustomers] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const [customerForm, setCustomerForm] = useState({
    name: '',
    document: '',
    phone: '',
    email: '',
    address: '',
    notes: ''
  });

  // Backup data
  const [backupJson, setBackupJson] = useState('');

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    try {
      setLoading(true);
      const [settingsRes, custRes, profileRes] = await Promise.all([
        api.getSettings(),
        api.getCustomers().catch(() => []),
        api.getMe().catch(() => ({ user: { name: 'Usuario', email: 'admin@precifica3d.local' } }))
      ]);

      if (settingsRes.settings) {
        setSettings(prev => ({
          ...prev,
          ...settingsRes.settings
        }));

        if (settingsRes.settings.catalog_settings_json) {
          try {
            const parsed = typeof settingsRes.settings.catalog_settings_json === 'string'
              ? JSON.parse(settingsRes.settings.catalog_settings_json)
              : settingsRes.settings.catalog_settings_json;
            setCatalogConfig(prev => ({ ...prev, ...parsed }));
          } catch (e) {
            console.error('Error parsing catalog json:', e);
          }
        }
      }

      if (settingsRes.filaments) {
        setFilaments(settingsRes.filaments);
      }

      if (Array.isArray(custRes)) {
        setCustomers(custRes);
      }

      if (profileRes?.user) {
        setUserProfile(profileRes.user);
        setTempUserName(profileRes.user.name || 'Usuario');
      }
    } catch (err) {
      console.error('Erro ao carregar dados de configurações:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (text, type = 'success') => {
    setMessage({ text, type });
    setTimeout(() => setMessage(null), 3500);
  };

  // Save Settings Payload
  const handleSaveSettings = async (overrides = {}) => {
    try {
      const payload = {
        ...settings,
        catalog_settings_json: JSON.stringify(catalogConfig),
        ...overrides
      };
      const res = await api.updateSettings(payload);
      if (res.settings) {
        setSettings(prev => ({ ...prev, ...res.settings }));
      }
      showNotification('Configurações salvas com sucesso!');
    } catch (err) {
      showNotification(err.message || 'Falha ao salvar configurações.', 'error');
    }
  };

  // Profile update
  const handleSaveProfile = async () => {
    try {
      const res = await api.updateProfile({ name: tempUserName });
      setUserProfile(res.user);
      setEditingUserName(false);
      showNotification('Nome atualizado com sucesso!');
    } catch (err) {
      showNotification(err.message || 'Erro ao atualizar perfil.', 'error');
    }
  };

  // Preset Printer selection
  const handleSelectPrinterPreset = (e) => {
    const selected = PRINTER_PRESETS.find(p => p.name === e.target.value);
    if (selected) {
      setSettings(prev => ({
        ...prev,
        default_printer_power_w: selected.watts,
        machine_hour_cost: selected.hourCost
      }));
    }
  };

  // State tariff selection
  const handleSelectStateTariff = (e) => {
    const selected = BRAZIL_STATE_TARIFFS.find(s => s.uf === e.target.value);
    if (selected) {
      setSettings(prev => ({
        ...prev,
        energy_kwh_cost: selected.kwh,
        selected_state_uf: selected.uf
      }));
    }
  };

  // Logo upload simulation / local file reader
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      setSettings(prev => ({ ...prev, company_logo: uploadEvent.target.result }));
    };
    reader.readAsDataURL(file);
  };

  // Customers CRUD
  const handleOpenNewCustomer = () => {
    setEditingCustomerId(null);
    setCustomerForm({ name: '', document: '', phone: '', email: '', address: '', notes: '' });
    setCustomerModalOpen(true);
  };

  const handleOpenEditCustomer = (cust) => {
    setEditingCustomerId(cust.id);
    setCustomerForm({
      name: cust.name || '',
      document: cust.document || '',
      phone: cust.phone || '',
      email: cust.email || '',
      address: cust.address || '',
      notes: cust.notes || ''
    });
    setCustomerModalOpen(true);
  };

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      if (editingCustomerId) {
        await api.updateCustomer(editingCustomerId, customerForm);
        showNotification('Cliente atualizado com sucesso!');
      } else {
        await api.createCustomer(customerForm);
        showNotification('Cliente cadastrado com sucesso!');
      }
      setCustomerModalOpen(false);
      const updated = await api.getCustomers();
      setCustomers(updated);
    } catch (err) {
      alert(err.message || 'Erro ao salvar cliente.');
    }
  };

  const handleDeleteCustomer = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    try {
      await api.deleteCustomer(id);
      setCustomers(customers.filter(c => c.id !== id));
      showNotification('Cliente excluído com sucesso.');
    } catch (err) {
      alert(err.message || 'Erro ao excluir cliente.');
    }
  };

  // Filaments CRUD
  const handleOpenNewFilament = () => {
    setEditingFilamentId(null);
    setBrandMode('existing');
    setFilamentForm({ brand: '3D LAB', customBrand: '', type: 'PLA', priceKg: 130.00 });
    setFilamentModalOpen(true);
  };

  const handleOpenEditFilament = (fil) => {
    setEditingFilamentId(fil.id);
    const isPreset = PRESET_BRANDS.includes(fil.brand);
    setBrandMode(isPreset ? 'existing' : 'new');
    setFilamentForm({
      brand: isPreset ? fil.brand : '3D LAB',
      customBrand: isPreset ? '' : fil.brand,
      type: fil.type || 'PLA',
      priceKg: fil.price || 130.00
    });
    setFilamentModalOpen(true);
  };

  const handleSaveFilament = async (e) => {
    e.preventDefault();
    try {
      const finalBrand = brandMode === 'new' ? (filamentForm.customBrand.trim() || 'Genérico') : filamentForm.brand;
      const price = parseFloat(filamentForm.priceKg) || 100.0;
      const payload = {
        brand: finalBrand,
        type: filamentForm.type.trim() || 'PLA',
        name: `${finalBrand} ${filamentForm.type.trim() || 'PLA'}`,
        price: price,
        spool_weight_g: 1000,
        cost_per_gram: price / 1000,
        color_name: 'Padrão',
        color_hex: '#10b981'
      };

      if (editingFilamentId) {
        await api.updateFilament(editingFilamentId, payload);
        showNotification('Filamento atualizado com sucesso!');
      } else {
        await api.createFilament(payload);
        showNotification('Filamento cadastrado com sucesso!');
      }

      setFilamentModalOpen(false);
      const res = await api.getSettings();
      setFilaments(res.filaments || []);
    } catch (err) {
      alert(err.message || 'Erro ao salvar filamento.');
    }
  };

  const handleDeleteFilament = async (id, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm('Tem certeza que deseja excluir este filamento?')) return;
    try {
      await api.deleteFilament(id);
      setFilaments(filaments.filter(f => f.id !== id));
      showNotification('Filamento excluído com sucesso.');
    } catch (err) {
      alert(err.message || 'Erro ao excluir filamento.');
    }
  };

  // Group filaments by brand
  const filteredFilaments = filaments.filter(f => {
    if (!filamentSearch.trim()) return true;
    const q = filamentSearch.toLowerCase();
    return (f.brand || '').toLowerCase().includes(q) || (f.type || '').toLowerCase().includes(q) || (f.name || '').toLowerCase().includes(q);
  });

  const groupedFilaments = filteredFilaments.reduce((acc, fil) => {
    const brand = (fil.brand || 'Outros').toUpperCase();
    if (!acc[brand]) acc[brand] = [];
    acc[brand].push(fil);
    return acc;
  }, {});

  // Grouped customer search
  const filteredCustomers = customers.filter(c => {
    if (!customerSearch.trim()) return true;
    const q = customerSearch.toLowerCase();
    return (c.name || '').toLowerCase().includes(q) ||
      (c.document || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.phone || '').toLowerCase().includes(q);
  });

  return (
    <div className="page-wrapper animate-fade-in" style={{ paddingBottom: '60px' }}>
      {/* Top Tabs Subnavigation Bar - Exactly matches screenshot header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 6,
        background: '#0d1520',
        padding: '6px 10px',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-color)',
        marginBottom: 24,
        overflowX: 'auto'
      }}>
        {[
          { id: 'minha-conta', label: 'Minha Conta', icon: User },
          { id: 'empresa', label: 'Empresa', icon: Building2 },
          { id: 'clientes', label: 'Clientes', icon: Users },
          { id: 'filamentos', label: 'Filamentos', icon: Disc },
          { id: 'custos-padrao', label: 'Custos Padrão', icon: SettingsIcon },
          { id: 'catalogo', label: 'Catálogo', icon: ShoppingBag },
          { id: 'integracoes', label: 'Integrações', icon: Link2 }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 16px',
                borderRadius: 'var(--radius-md)',
                fontSize: '0.8125rem',
                fontWeight: 600,
                border: 'none',
                background: isActive ? 'rgba(0, 188, 212, 0.15)' : 'transparent',
                color: isActive ? '#00e5ff' : 'var(--text-secondary)',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease'
              }}
            >
              <Icon size={15} color={isActive ? '#00e5ff' : 'currentColor'} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Notification Toast */}
      {message && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: message.type === 'success' ? '#064e3b' : '#881337',
          color: message.type === 'success' ? '#34d399' : '#f43f5e',
          border: `1px solid ${message.type === 'success' ? '#10b981' : '#f43f5e'}`,
          padding: '12px 20px',
          borderRadius: 'var(--radius-md)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          boxShadow: '0 10px 25px rgba(0,0,0,0.5)',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          {message.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
          <span>{message.text}</span>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 1. MINHA CONTA (Matches 013921.png) */}
      {/* ========================================================================= */}
      {activeTab === 'minha-conta' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              Minha Conta
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Gerencie seu perfil e configurações locais
            </p>
          </div>

          {/* PERFIL */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00bcd4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={15} />
              <span>PERFIL</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
              <div style={{
                width: 68,
                height: 68,
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--text-muted)'
              }}>
                <User size={34} />
              </div>

              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                  {editingUserName ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <input
                        type="text"
                        className="form-control"
                        value={tempUserName}
                        onChange={(e) => setTempUserName(e.target.value)}
                        style={{ fontSize: '1.125rem', fontWeight: 700, padding: '4px 10px', width: '220px' }}
                      />
                      <button
                        type="button"
                        onClick={handleSaveProfile}
                        className="btn btn-primary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        Salvar
                      </button>
                      <button
                        type="button"
                        onClick={() => { setEditingUserName(false); setTempUserName(userProfile.name); }}
                        className="btn btn-secondary"
                        style={{ padding: '6px 12px', fontSize: '0.75rem' }}
                      >
                        Cancelar
                      </button>
                    </div>
                  ) : (
                    <>
                      <span style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {userProfile.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setEditingUserName(true)}
                        style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                        title="Editar nome"
                      >
                        <Edit2 size={15} />
                      </button>
                    </>
                  )}
                </div>

                <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>✉ {userProfile.email}</span>
                </div>

                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 8 }}>
                  Clique no ícone de edição para atualizar seu nome de exibição.
                </div>
              </div>
            </div>
          </div>



          {/* LAYOUT DA CALCULADORA */}
          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#00bcd4', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <span>▦</span>
              <span>LAYOUT DA CALCULADORA</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 20, flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '260px' }}>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
                  Como a calculadora se organiza
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  Em passos mostra um assunto de cada vez, com o preço numa faixa fixa. É o desenho que recebe as próximas melhorias. O clássico mostra tudo em colunas e continua funcionando como está.
                </div>
              </div>

              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: 'var(--bg-input)',
                padding: '4px',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-color)',
                gap: 4
              }}>
                <button
                  type="button"
                  onClick={() => {
                    const next = 'steps';
                    setSettings(s => ({ ...s, calculator_layout: next }));
                    localStorage.setItem('precifica3d_calculator_layout', next);
                    handleSaveSettings({ calculator_layout: next });
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: (settings.calculator_layout || localStorage.getItem('precifica3d_calculator_layout') || 'steps') === 'steps' ? '#00bcd4' : 'transparent',
                    color: (settings.calculator_layout || localStorage.getItem('precifica3d_calculator_layout') || 'steps') === 'steps' ? '#000000' : 'var(--text-muted)'
                  }}
                >
                  Em passos
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const next = 'classic';
                    setSettings(s => ({ ...s, calculator_layout: next }));
                    localStorage.setItem('precifica3d_calculator_layout', next);
                    handleSaveSettings({ calculator_layout: next });
                  }}
                  style={{
                    padding: '8px 16px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    fontWeight: 700,
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: (settings.calculator_layout || localStorage.getItem('precifica3d_calculator_layout')) === 'classic' ? '#00bcd4' : 'transparent',
                    color: (settings.calculator_layout || localStorage.getItem('precifica3d_calculator_layout')) === 'classic' ? '#000000' : 'var(--text-muted)'
                  }}
                >
                  Clássico
                </button>
              </div>
            </div>
          </div>



          {/* ZONA DE PERIGO */}
          <div className="card" style={{ padding: '24px', borderColor: 'rgba(239, 68, 68, 0.25)' }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#f87171', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <AlertCircle size={15} />
              <span>ZONA DE PERIGO</span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Sair da conta
                </div>
                <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 2 }}>
                  Você será desconectado e redirecionado para a página de login.
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (onLogout) onLogout();
                  else {
                    localStorage.removeItem('precifica3d_token');
                    window.location.reload();
                  }
                }}
                className="btn btn-danger"
                style={{ padding: '8px 18px', display: 'flex', alignItems: 'center', gap: 8 }}
              >
                <LogOut size={15} />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. EMPRESA (Matches 013925.png) */}
      {/* ========================================================================= */}
      {activeTab === 'empresa' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              Empresa
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Dados da sua empresa para notas e pedidos
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Logo da Empresa */}
            <div>
              <label className="form-label">Logo da Empresa</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                <div style={{
                  width: 90,
                  height: 90,
                  borderRadius: 'var(--radius-md)',
                  border: '2px dashed var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  background: 'var(--bg-input)',
                  overflow: 'hidden',
                  position: 'relative'
                }}>
                  {settings.company_logo ? (
                    <img src={settings.company_logo} alt="Logo" style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }} />
                  ) : (
                    <div style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.6875rem' }}>
                      <Upload size={22} style={{ margin: '0 auto 4px' }} />
                      <span>Upload</span>
                    </div>
                  )}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 10, lineHeight: 1.4 }}>
                    Recomendado: PNG ou JPG, fundo transparente, proporção quadrada (max 5MB).
                    A logo será usada na geração de orçamentos e propostas em PDF.
                  </div>
                  <label className="btn btn-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontSize: '0.8125rem' }}>
                    <Upload size={14} />
                    <span>Selecionar arquivo</span>
                    <input type="file" accept="image/*" onChange={handleLogoUpload} style={{ display: 'none' }} />
                  </label>
                  {settings.company_logo && (
                    <button
                      type="button"
                      onClick={() => setSettings(prev => ({ ...prev, company_logo: '' }))}
                      className="btn btn-secondary"
                      style={{ marginLeft: 10, fontSize: '0.75rem', color: '#f87171' }}
                    >
                      Remover
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Nome / Razão Social */}
            <div className="form-group">
              <label className="form-label">Nome / Razão Social <span style={{ color: '#f87171' }}>*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="Minha Companhia"
                value={settings.company_name}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                required
              />
            </div>

            {/* CNPJ / CPF e Inscrição Estadual */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">CNPJ / CPF</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="00.000.000/0000-00"
                  value={settings.company_cnpj}
                  onChange={(e) => setSettings({ ...settings, company_cnpj: maskCpfCnpj(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Inscrição Estadual</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Isento ou Nº"
                  value={settings.company_ie}
                  onChange={(e) => setSettings({ ...settings, company_ie: e.target.value })}
                />
              </div>
            </div>

            {/* CEP e Endereço */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">CEP</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="00000-000"
                  value={settings.company_cep}
                  onChange={(e) => setSettings({ ...settings, company_cep: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Endereço Completo</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rua Exemplo, 123 - Bairro"
                  value={settings.company_address}
                  onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
                />
              </div>
            </div>

            {/* Cidade e Estado / UF */}
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Cidade</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="São Paulo"
                  value={settings.company_city}
                  onChange={(e) => setSettings({ ...settings, company_city: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Estado / UF</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="SP"
                  maxLength="2"
                  value={settings.company_state}
                  onChange={(e) => setSettings({ ...settings, company_state: e.target.value.toUpperCase() })}
                />
              </div>
            </div>

            {/* Telefone e E-mail */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="(11) 99999-9999"
                  value={settings.company_phone}
                  onChange={(e) => setSettings({ ...settings, company_phone: maskPhone(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">E-mail</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="contato@empresa.com"
                  value={settings.company_email}
                  onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                />
              </div>
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '14px', width: '100%', marginTop: 8, fontSize: '0.9375rem', fontWeight: 700 }}
            >
              Salvar Dados da Empresa
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. CLIENTES (Matches 013930.png & 013959.png) */}
      {/* ========================================================================= */}
      {activeTab === 'clientes' && (
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                Clientes
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Gerencie sua base de clientes
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenNewCustomer}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              <span>Novo Cliente</span>
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por nome, documento, email ou telefone..."
              value={customerSearch}
              onChange={(e) => setCustomerSearch(e.target.value)}
              style={{ paddingLeft: '40px', fontSize: '0.875rem' }}
            />
          </div>

          {/* Customers List */}
          {filteredCustomers.length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Users size={28} />
              </div>
              <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                Nenhum cliente cadastrado ainda.
              </div>
              <button
                type="button"
                onClick={handleOpenNewCustomer}
                className="btn btn-secondary"
                style={{ marginTop: 8 }}
              >
                + Cadastrar primeiro cliente
              </button>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(290px, 1fr))', gap: 16 }}>
              {filteredCustomers.map(cust => (
                <div
                  key={cust.id}
                  className="card"
                  style={{
                    padding: '18px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: 14
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                      <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {cust.name}
                      </h3>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          type="button"
                          onClick={() => handleOpenEditCustomer(cust)}
                          className="btn btn-secondary btn-icon"
                          style={{ width: 28, height: 28 }}
                          title="Editar"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleDeleteCustomer(cust.id, e)}
                          className="btn btn-danger btn-icon"
                          style={{ width: 28, height: 28 }}
                          title="Excluir"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>

                    {cust.document && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: 4 }}>
                        CPF/CNPJ: {cust.document}
                      </div>
                    )}

                    <div style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 4, marginTop: 8 }}>
                      {cust.phone && <div>📞 {cust.phone}</div>}
                      {cust.email && <div>✉ {cust.email}</div>}
                    </div>
                  </div>

                  {cust.notes && (
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', background: 'var(--bg-input)', padding: '6px 10px', borderRadius: 4 }}>
                      {cust.notes}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. FILAMENTOS (Matches 013935.png, 014007.png, 014014.png) */}
      {/* ========================================================================= */}
      {activeTab === 'filamentos' && (
        <div style={{ maxWidth: '960px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
                Filamentos
              </h1>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
                Gerencie seus filamentos cadastrados no sistema
              </p>
            </div>

            <button
              type="button"
              onClick={handleOpenNewFilament}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <Plus size={16} />
              <span>Novo Filamento</span>
            </button>
          </div>

          {/* Search bar */}
          <div style={{ position: 'relative' }}>
            <div style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }}>
              <Search size={16} />
            </div>
            <input
              type="text"
              className="form-control"
              placeholder="Buscar por marca ou tipo..."
              value={filamentSearch}
              onChange={(e) => setFilamentSearch(e.target.value)}
              style={{ paddingLeft: '40px', fontSize: '0.875rem' }}
            />
          </div>

          {/* Grouped Filaments Display */}
          {Object.keys(groupedFilaments).length === 0 ? (
            <div className="card" style={{ padding: '60px 20px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: 'var(--bg-input)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
                <Disc size={28} />
              </div>
              <div style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>
                Nenhum filamento encontrado.
              </div>
              <button
                type="button"
                onClick={handleOpenNewFilament}
                className="btn btn-secondary"
                style={{ marginTop: 8 }}
              >
                + Cadastrar filamento
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {Object.entries(groupedFilaments).map(([brandName, filList]) => (
                <div key={brandName}>
                  {/* Brand Group Header: • ESUN (1) */}
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 12,
                    fontSize: '0.875rem',
                    fontWeight: 700,
                    color: '#00bcd4'
                  }}>
                    <span style={{ fontSize: '1.25rem' }}>•</span>
                    <span>{brandName}</span>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500, fontSize: '0.75rem' }}>
                      ({filList.length})
                    </span>
                  </div>

                  {/* Filament Cards in Row */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16 }}>
                    {filList.map(fil => (
                      <div
                        key={fil.id}
                        className="card"
                        style={{
                          padding: '18px 20px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          gap: 12,
                          background: 'rgba(18, 26, 36, 0.75)',
                          transition: 'all 0.15s ease'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {fil.type || 'PLA'}
                            </div>
                            {fil.color_name && fil.color_name !== 'Padrão' && (
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                                {fil.color_name}
                              </div>
                            )}
                          </div>

                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              type="button"
                              onClick={() => handleOpenEditFilament(fil)}
                              className="btn btn-secondary btn-icon"
                              style={{ width: 28, height: 28 }}
                              title="Editar filamento"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => handleDeleteFilament(fil.id, e)}
                              className="btn btn-danger btn-icon"
                              style={{ width: 28, height: 28 }}
                              title="Excluir filamento"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>

                        {/* Large Cyan Price */}
                        <div>
                          <div style={{
                            fontSize: '1.375rem',
                            fontWeight: 800,
                            color: '#00e5ff',
                            fontFamily: 'var(--font-mono)'
                          }}>
                            R$ {Number(fil.price || 0).toFixed(2)}
                            <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-muted)', marginLeft: 4 }}>
                              /kg
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div style={{ textAlign: 'right', fontSize: '0.8125rem', color: 'var(--text-muted)', marginTop: 8 }}>
                {filaments.length} filamento{filaments.length === 1 ? '' : 's'} cadastrado{filaments.length === 1 ? '' : 's'}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. CUSTOS PADRÃO (Matches 014023.png & 014028.png) */}
      {/* ========================================================================= */}
      {activeTab === 'custos-padrao' && (
        <div style={{ maxWidth: '720px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              Custos Padrão
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Configure os custos base para cálculo de preços
            </p>
          </div>

          <form onSubmit={(e) => { e.preventDefault(); handleSaveSettings(); }} className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* Minha Impressora Preset Dropdown */}
            <div className="form-group">
              <label className="form-label">Minha impressora</label>
              <select
                className="form-control"
                defaultValue=""
                onChange={handleSelectPrinterPreset}
                style={{ fontSize: '0.875rem' }}
              >
                <option value="" disabled>Escolher para preencher potência e hora-máquina...</option>
                {['Bambu Lab', 'Prusa', 'Creality', 'Elegoo'].map(group => (
                  <optgroup key={group} label={group}>
                    {PRINTER_PRESETS.filter(p => p.group === group).map(preset => (
                      <option key={preset.name} value={preset.name}>
                        {preset.name} — {preset.watts}W · R$ {preset.hourCost.toFixed(2).replace('.', ',')}/h
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Row 1: Margem de material & Custo por hora de impressão */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">
                  Margem de material <span title="Margem de perda com suportes, purgas e falhas" style={{ cursor: 'help', color: 'var(--text-muted)' }}>?</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    className="form-control"
                    value={settings.failure_margin_pct}
                    onChange={(e) => setSettings({ ...settings, failure_margin_pct: parseFloat(e.target.value) || 0 })}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    %
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Custo por hora de impressão <span title="Depreciação e manutenção da impressora" style={{ cursor: 'help', color: 'var(--text-muted)' }}>?</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.05"
                    min="0"
                    className="form-control"
                    value={settings.machine_hour_cost}
                    onChange={(e) => setSettings({ ...settings, machine_hour_cost: parseFloat(e.target.value) || 0 })}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>
              </div>
            </div>

            {/* Row 2: Potência da impressora & Custo do kWh */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div className="form-group">
                <label className="form-label">
                  Potência da impressora <span title="Consumo elétrico nominal médio" style={{ cursor: 'help', color: 'var(--text-muted)' }}>?</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="number"
                    step="10"
                    min="10"
                    className="form-control"
                    value={settings.default_printer_power_w}
                    onChange={(e) => setSettings({ ...settings, default_printer_power_w: parseFloat(e.target.value) || 0 })}
                  />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    W
                  </span>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Custo do kWh <span title="Tarifa de energia elétrica cobrada pela distribuidora" style={{ cursor: 'help', color: 'var(--text-muted)' }}>?</span>
                </label>
                <div style={{ position: 'relative', marginBottom: 8 }}>
                  <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: '0.875rem' }}>
                    R$
                  </span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    className="form-control"
                    value={settings.energy_kwh_cost}
                    onChange={(e) => setSettings({ ...settings, energy_kwh_cost: parseFloat(e.target.value) || 0 })}
                    style={{ paddingLeft: '36px' }}
                  />
                </div>

                {/* State Dropdown to Auto-Fill kWh */}
                <select
                  className="form-control"
                  value={settings.selected_state_uf || ''}
                  onChange={handleSelectStateTariff}
                  style={{ fontSize: '0.8125rem' }}
                >
                  <option value="" disabled>Não sei — usar a média do meu estado...</option>
                  {BRAZIL_STATE_TARIFFS.map(st => (
                    <option key={st.uf} value={st.uf}>
                      {st.name} — R$ {st.kwh.toFixed(2).replace('.', ',')}/kWh
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Row 3: Custo de montagem padrão */}
            <div className="form-group">
              <label className="form-label">
                Custo de montagem padrão <span title="Custo ou percentual estimado para montagem" style={{ cursor: 'help', color: 'var(--text-muted)' }}>?</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                className="form-control"
                value={settings.labor_hour_cost}
                onChange={(e) => setSettings({ ...settings, labor_hour_cost: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Row 4: Taxa de plataformas padrão */}
            <div className="form-group">
              <label className="form-label">
                Taxa de plataformas padrão <span title="Taxas de marketplace (ex: Mercado Livre, Shopee)" style={{ cursor: 'help', color: 'var(--text-muted)' }}>?</span>
              </label>
              <input
                type="number"
                step="1"
                min="0"
                className="form-control"
                value={settings.default_marketplace_fee_pct}
                onChange={(e) => setSettings({ ...settings, default_marketplace_fee_pct: parseFloat(e.target.value) || 0 })}
              />
            </div>

            {/* Row 5: Impostos padrão */}
            <div className="form-group">
              <label className="form-label">
                Impostos padrão <span title="Alíquota de imposto MEI / Simples Nacional" style={{ cursor: 'help', color: 'var(--text-muted)' }}>?</span>
              </label>
              <input
                type="number"
                step="0.5"
                min="0"
                className="form-control"
                value={settings.default_tax_pct}
                onChange={(e) => setSettings({ ...settings, default_tax_pct: parseFloat(e.target.value) || 0 })}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary"
              style={{ padding: '14px', width: '100%', marginTop: 8, fontSize: '0.9375rem', fontWeight: 700 }}
            >
              Salvar
            </button>
          </form>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. CATÁLOGO (Matches 014035.png to 014056.png) */}
      {/* ========================================================================= */}
      {activeTab === 'catalogo' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              Catálogo
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Configure seu catálogo público para compartilhar com clientes.
            </p>
          </div>

          {/* Catalog 5 Subtabs */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            background: 'var(--bg-input)',
            padding: '4px 6px',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-color)',
            overflowX: 'auto'
          }}>
            {[
              { id: 'geral', label: 'Geral', icon: SettingsIcon },
              { id: 'aparencia', label: 'Aparência', icon: Sparkles },
              { id: 'cabecalho', label: 'Cabeçalho', icon: Building2 },
              { id: 'layout', label: 'Layout', icon: Sliders },
              { id: 'rodape', label: 'Rodapé', icon: Globe }
            ].map(st => {
              const Icon = st.icon;
              const isSubActive = catalogSubtab === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setCatalogSubtab(st.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '6px 14px',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.8125rem',
                    fontWeight: 600,
                    border: 'none',
                    background: isSubActive ? 'rgba(0, 188, 212, 0.2)' : 'transparent',
                    color: isSubActive ? '#00e5ff' : 'var(--text-secondary)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                >
                  <Icon size={14} />
                  <span>{st.label}</span>
                </button>
              );
            })}
          </div>

          {/* Subtab: Geral */}
          {catalogSubtab === 'geral' && (
            <div className="card" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    Catálogo Público Ativo
                  </div>
                  <div style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>
                    Permite que clientes vejam seus produtos via link público
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={catalogConfig.active}
                  onChange={(e) => setCatalogConfig({ ...catalogConfig, active: e.target.checked })}
                  style={{ width: 18, height: 18, accentColor: '#00bcd4' }}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Identificador / Link do Catálogo</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ fontSize: '0.8125rem', color: 'var(--text-muted)' }}>http://localhost:3500/c/</span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="minhaloja"
                    value={catalogConfig.slug}
                    onChange={(e) => setCatalogConfig({ ...catalogConfig, slug: e.target.value })}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Título da Loja</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Precifica 3D Store"
                  value={catalogConfig.storeName}
                  onChange={(e) => setCatalogConfig({ ...catalogConfig, storeName: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Descrição da Loja</label>
                <textarea
                  className="form-control"
                  rows={2}
                  placeholder="Peças exclusivas impressas em 3D..."
                  value={catalogConfig.description}
                  onChange={(e) => setCatalogConfig({ ...catalogConfig, description: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">WhatsApp para Pedidos</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="(11) 99999-9999"
                  value={catalogConfig.whatsapp}
                  onChange={(e) => setCatalogConfig({ ...catalogConfig, whatsapp: maskPhone(e.target.value) })}
                />
              </div>
            </div>
          )}

          {/* Subtab: Aparência (Matches 014035.png) */}
          {catalogSubtab === 'aparencia' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Cores */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                  Cores
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Cor primária</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="color"
                        value={catalogConfig.primaryColor}
                        onChange={(e) => setCatalogConfig({ ...catalogConfig, primaryColor: e.target.value })}
                        style={{ width: 36, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        value={catalogConfig.primaryColor}
                        onChange={(e) => setCatalogConfig({ ...catalogConfig, primaryColor: e.target.value })}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="form-label" style={{ fontSize: '0.75rem' }}>Cor de destaque</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <input
                        type="color"
                        value={catalogConfig.accentColor}
                        onChange={(e) => setCatalogConfig({ ...catalogConfig, accentColor: e.target.value })}
                        style={{ width: 36, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
                      />
                      <input
                        type="text"
                        className="form-control"
                        value={catalogConfig.accentColor}
                        onChange={(e) => setCatalogConfig({ ...catalogConfig, accentColor: e.target.value })}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Fundo da página */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                  Fundo da página
                </div>
                <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
                  {['Cor sólida', 'Gradiente'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setCatalogConfig({ ...catalogConfig, bgType: mode === 'Cor sólida' ? 'solid' : 'gradient' })}
                      style={{
                        padding: '6px 14px',
                        borderRadius: 6,
                        border: (catalogConfig.bgType === 'solid' && mode === 'Cor sólida') || (catalogConfig.bgType === 'gradient' && mode === 'Gradiente')
                          ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                        background: (catalogConfig.bgType === 'solid' && mode === 'Cor sólida') || (catalogConfig.bgType === 'gradient' && mode === 'Gradiente')
                          ? 'rgba(0, 188, 212, 0.15)' : 'var(--bg-input)',
                        color: (catalogConfig.bgType === 'solid' && mode === 'Cor sólida') || (catalogConfig.bgType === 'gradient' && mode === 'Gradiente')
                          ? '#00e5ff' : 'var(--text-muted)',
                        fontSize: '0.8125rem',
                        fontWeight: 600,
                        cursor: 'pointer'
                      }}
                    >
                      {mode}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Cor de fundo</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '220px' }}>
                    <input
                      type="color"
                      value={catalogConfig.bgColor}
                      onChange={(e) => setCatalogConfig({ ...catalogConfig, bgColor: e.target.value })}
                      style={{ width: 36, height: 36, borderRadius: 6, border: 'none', cursor: 'pointer', background: 'transparent' }}
                    />
                    <input
                      type="text"
                      className="form-control"
                      value={catalogConfig.bgColor}
                      onChange={(e) => setCatalogConfig({ ...catalogConfig, bgColor: e.target.value })}
                      style={{ fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
              </div>

              {/* Tipografia */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 16 }}>
                  Tipografia
                </div>
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Fonte</label>
                  <select
                    className="form-control"
                    value={catalogConfig.font}
                    onChange={(e) => setCatalogConfig({ ...catalogConfig, font: e.target.value })}
                  >
                    <option value="system">system</option>
                    <option value="Inter">Inter</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Outfit">Outfit</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Subtab: Cabeçalho (Matches 014039.png) */}
          {catalogSubtab === 'cabecalho' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Banner */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                  Banner
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Altura do banner</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Pequeno', 'Médio', 'Grande'].map(sz => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setCatalogConfig({ ...catalogConfig, bannerHeight: sz })}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: catalogConfig.bannerHeight === sz ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                          background: catalogConfig.bannerHeight === sz ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                          color: catalogConfig.bannerHeight === sz ? '#00e5ff' : 'var(--text-muted)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Estilo do overlay</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Gradiente', 'Sólido', 'Nenhum'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setCatalogConfig({ ...catalogConfig, overlayStyle: st })}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: catalogConfig.overlayStyle === st ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                          background: catalogConfig.overlayStyle === st ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                          color: catalogConfig.overlayStyle === st ? '#00e5ff' : 'var(--text-muted)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: 6 }}>
                    <span>Opacidade do overlay: {catalogConfig.overlayOpacity}%</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={catalogConfig.overlayOpacity}
                    onChange={(e) => setCatalogConfig({ ...catalogConfig, overlayOpacity: parseInt(e.target.value, 10) })}
                    style={{ width: '100%', accentColor: '#00bcd4' }}
                  />
                </div>
              </div>

              {/* Logo */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                  Logo
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Formato</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Arredondado', 'Circular', 'Quadrado'].map(sh => (
                      <button
                        key={sh}
                        type="button"
                        onClick={() => setCatalogConfig({ ...catalogConfig, logoShape: sh })}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: catalogConfig.logoShape === sh ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                          background: catalogConfig.logoShape === sh ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                          color: catalogConfig.logoShape === sh ? '#00e5ff' : 'var(--text-muted)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {sh}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Tamanho</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Pequeno', 'Médio', 'Grande'].map(sz => (
                      <button
                        key={sz}
                        type="button"
                        onClick={() => setCatalogConfig({ ...catalogConfig, logoSize: sz })}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: catalogConfig.logoSize === sz ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                          background: catalogConfig.logoSize === sz ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                          color: catalogConfig.logoSize === sz ? '#00e5ff' : 'var(--text-muted)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Informações do cabeçalho */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                  Informações do cabeçalho
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Exibir localização</span>
                    <input
                      type="checkbox"
                      checked={catalogConfig.showHeaderLocation}
                      onChange={(e) => setCatalogConfig({ ...catalogConfig, showHeaderLocation: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#00bcd4' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Exibir descrição</span>
                    <input
                      type="checkbox"
                      checked={catalogConfig.showHeaderDesc}
                      onChange={(e) => setCatalogConfig({ ...catalogConfig, showHeaderDesc: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#00bcd4' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab: Layout (Matches 014044.png) */}
          {catalogSubtab === 'layout' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Grade de produtos */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                  Grade de produtos
                </div>
                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Colunas</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {[2, 3, 4].map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setCatalogConfig({ ...catalogConfig, gridCols: c })}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: catalogConfig.gridCols === c ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                          background: catalogConfig.gridCols === c ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                          color: catalogConfig.gridCols === c ? '#00e5ff' : 'var(--text-muted)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {c} colunas
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Estilo dos cards</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Padrão', 'Compacto', 'Horizontal'].map(st => (
                      <button
                        key={st}
                        type="button"
                        onClick={() => setCatalogConfig({ ...catalogConfig, cardStyle: st })}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: catalogConfig.cardStyle === st ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                          background: catalogConfig.cardStyle === st ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                          color: catalogConfig.cardStyle === st ? '#00e5ff' : 'var(--text-muted)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {st}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ marginBottom: 14 }}>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Espaçamento</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Justo', 'Normal', 'Espaçado'].map(sp => (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => setCatalogConfig({ ...catalogConfig, cardSpacing: sp })}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: catalogConfig.cardSpacing === sp ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                          background: catalogConfig.cardSpacing === sp ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                          color: catalogConfig.cardSpacing === sp ? '#00e5ff' : 'var(--text-muted)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {sp}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="form-label" style={{ fontSize: '0.75rem' }}>Largura máxima</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {['Estreita', 'Normal', 'Larga'].map(w => (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setCatalogConfig({ ...catalogConfig, maxWidth: w })}
                        style={{
                          padding: '6px 14px',
                          borderRadius: 6,
                          border: catalogConfig.maxWidth === w ? '1px solid #00bcd4' : '1px solid var(--border-color)',
                          background: catalogConfig.maxWidth === w ? 'rgba(0, 188, 212, 0.2)' : 'var(--bg-input)',
                          color: catalogConfig.maxWidth === w ? '#00e5ff' : 'var(--text-muted)',
                          fontSize: '0.8125rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {w}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Seções visíveis */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                  Seções visíveis
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Barra de busca</span>
                    <input
                      type="checkbox"
                      checked={catalogConfig.showSearch}
                      onChange={(e) => setCatalogConfig({ ...catalogConfig, showSearch: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#00bcd4' }}
                    />
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Filtro por categorias</span>
                    <input
                      type="checkbox"
                      checked={catalogConfig.showCategories}
                      onChange={(e) => setCatalogConfig({ ...catalogConfig, showCategories: e.target.checked })}
                      style={{ width: 18, height: 18, accentColor: '#00bcd4' }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Subtab: Rodapé (Matches 014052.png & 014056.png) */}
          {catalogSubtab === 'rodape' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              {/* Rodapé Toggle */}
              <div className="card" style={{ padding: '20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                      Rodapé
                    </div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: 2 }}>
                      Exiba informações e links no final da página.
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={catalogConfig.showFooter}
                    onChange={(e) => setCatalogConfig({ ...catalogConfig, showFooter: e.target.checked })}
                    style={{ width: 18, height: 18, accentColor: '#00bcd4' }}
                  />
                </div>
              </div>

              {catalogConfig.showFooter && (
                <>
                  {/* Texto do rodapé & Powered by */}
                  <div className="card" style={{ padding: '20px' }}>
                    <div className="form-group">
                      <label className="form-label" style={{ fontSize: '0.75rem' }}>Texto do rodapé</label>
                      <textarea
                        className="form-control"
                        rows={2}
                        maxLength="200"
                        placeholder="Ex: Todos os direitos reservados. Impressão 3D sob demanda."
                        value={catalogConfig.footerText || ''}
                        onChange={(e) => setCatalogConfig({ ...catalogConfig, footerText: e.target.value })}
                      />
                      <div style={{ textAlign: 'right', fontSize: '0.6875rem', color: 'var(--text-muted)', marginTop: 4 }}>
                        {(catalogConfig.footerText || '').length}/200
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)' }}>Exibir "Powered by"</span>
                      <input
                        type="checkbox"
                        checked={Boolean(catalogConfig.showPoweredBy)}
                        onChange={(e) => setCatalogConfig({ ...catalogConfig, showPoweredBy: e.target.checked })}
                        style={{ width: 18, height: 18, accentColor: '#00bcd4' }}
                      />
                    </div>
                  </div>

                  {/* Redes sociais */}
                  <div className="card" style={{ padding: '20px' }}>
                    <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 14 }}>
                      Redes sociais
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#e1306c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg>
                          <span>Instagram</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://instagram.com/suaempresa"
                          value={catalogConfig.instagram || ''}
                          onChange={(e) => setCatalogConfig({ ...catalogConfig, instagram: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1877f2" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
                          <span>Facebook</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://facebook.com/suaempresa"
                          value={catalogConfig.facebook || ''}
                          onChange={(e) => setCatalogConfig({ ...catalogConfig, facebook: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🎵</span>
                          <span>TikTok</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://tiktok.com/@suaempresa"
                          value={catalogConfig.tiktok || ''}
                          onChange={(e) => setCatalogConfig({ ...catalogConfig, tiktok: e.target.value })}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <Globe size={14} color="#00bcd4" />
                          <span>Website</span>
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          placeholder="https://suaempresa.com.br"
                          value={catalogConfig.website || ''}
                          onChange={(e) => setCatalogConfig({ ...catalogConfig, website: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Catalog Save Button */}
          <button
            type="button"
            onClick={() => handleSaveSettings()}
            className="btn btn-primary"
            style={{ padding: '12px 24px', fontSize: '0.875rem', fontWeight: 700, width: 'fit-content' }}
          >
            Salvar configurações
          </button>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. INTEGRAÇÕES / BACKUP */}
      {/* ========================================================================= */}
      {activeTab === 'integracoes' && (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
              Integrações & Backup
            </h1>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Exportação e importação completa de dados locais
            </p>
          </div>

          <div className="card" style={{ padding: '24px' }}>
            <div style={{ fontSize: '0.875rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>
              Backup Local do Banco de Dados
            </div>
            <p style={{ fontSize: '0.8125rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              Exporte todos os produtos, filamentos, pedidos e configurações para um arquivo JSON único.
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a
                href={api.exportBackupUrl}
                download={`precifica3d_backup_${new Date().toISOString().split('T')[0]}.json`}
                className="btn btn-primary"
                style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8 }}
              >
                <Download size={16} />
                <span>Exportar Backup Completo</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR FILAMENTO (Matches 014007.png) */}
      {/* ========================================================================= */}
      {filamentModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setFilamentModalOpen(false)}
          title={editingFilamentId ? "Editar filamento local" : "Novo filamento local"}
          maxWidth="500px"
        >
          <form onSubmit={handleSaveFilament} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Toggle: Marca existente / Nova marca */}
            <div style={{ display: 'flex', gap: 8, background: 'var(--bg-input)', padding: 4, borderRadius: 'var(--radius-md)', width: 'fit-content' }}>
              <button
                type="button"
                onClick={() => setBrandMode('existing')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: brandMode === 'existing' ? 'rgba(0, 188, 212, 0.2)' : 'transparent',
                  color: brandMode === 'existing' ? '#00e5ff' : 'var(--text-muted)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Marca existente
              </button>
              <button
                type="button"
                onClick={() => setBrandMode('new')}
                style={{
                  padding: '6px 14px',
                  borderRadius: 6,
                  border: 'none',
                  background: brandMode === 'new' ? 'rgba(0, 188, 212, 0.2)' : 'transparent',
                  color: brandMode === 'new' ? '#00e5ff' : 'var(--text-muted)',
                  fontSize: '0.8125rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Nova marca
              </button>
            </div>

            {/* Brand Input or Select */}
            <div className="form-group">
              <label className="form-label">Marca</label>
              {brandMode === 'existing' ? (
                <select
                  className="form-control"
                  value={filamentForm.brand}
                  onChange={(e) => setFilamentForm({ ...filamentForm, brand: e.target.value })}
                >
                  {PRESET_BRANDS.map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  className="form-control"
                  placeholder="Nome da nova marca"
                  value={filamentForm.customBrand}
                  onChange={(e) => setFilamentForm({ ...filamentForm, customBrand: e.target.value })}
                  required
                />
              )}
            </div>

            {/* Tipo and Custo por kg */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 14 }}>
              <div className="form-group">
                <label className="form-label">Tipo</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Ex.: PLA Basic"
                  value={filamentForm.type}
                  onChange={(e) => setFilamentForm({ ...filamentForm, type: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label className="form-label">Custo por kg (R$)</label>
                <input
                  type="number"
                  step="0.5"
                  min="1"
                  className="form-control"
                  placeholder="Ex.: 129.90"
                  value={filamentForm.priceKg}
                  onChange={(e) => setFilamentForm({ ...filamentForm, priceKg: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Tip Callout Banner */}
            <div style={{
              background: 'rgba(0, 188, 212, 0.08)',
              border: '1px solid rgba(0, 188, 212, 0.25)',
              borderRadius: 'var(--radius-md)',
              padding: '12px 14px',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
              lineHeight: 1.45
            }}>
              💡 <strong>Você não precisa cadastrar um filamento por cor.</strong> O Precifica 3D lê as cores direto do arquivo 3MF do seu fatiador. Basta cadastrar <strong>marca + tipo + preço/kg</strong> uma vez.
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 6 }}>
              <button
                type="button"
                onClick={() => setFilamentModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Salvar filamento
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ========================================================================= */}
      {/* MODAL: NOVO / EDITAR CLIENTE (Matches 013959.png) */}
      {/* ========================================================================= */}
      {customerModalOpen && (
        <Modal
          isOpen={true}
          onClose={() => setCustomerModalOpen(false)}
          title={editingCustomerId ? "Editar cliente" : "Novo cliente"}
          maxWidth="460px"
        >
          <form onSubmit={handleSaveCustomer} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="form-group">
              <label className="form-label">Nome <span style={{ color: '#f87171' }}>*</span></label>
              <input
                type="text"
                className="form-control"
                placeholder="Nome completo ou razão social"
                value={customerForm.name}
                onChange={(e) => setCustomerForm({ ...customerForm, name: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label className="form-label">CPF / CNPJ</label>
              <input
                type="text"
                className="form-control"
                placeholder="000.000.000-00"
                value={customerForm.document}
                onChange={(e) => setCustomerForm({ ...customerForm, document: maskCpfCnpj(e.target.value) })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div className="form-group">
                <label className="form-label">Telefone</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="(00) 00000-0000"
                  value={customerForm.phone}
                  onChange={(e) => setCustomerForm({ ...customerForm, phone: maskPhone(e.target.value) })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  className="form-control"
                  placeholder="email@exemplo.com"
                  value={customerForm.email}
                  onChange={(e) => setCustomerForm({ ...customerForm, email: e.target.value })}
                />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 8 }}>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="btn btn-secondary"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                {editingCustomerId ? 'Salvar' : 'Cadastrar'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
