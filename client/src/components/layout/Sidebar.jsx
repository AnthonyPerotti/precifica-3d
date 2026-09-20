import React from 'react';
import {
  Calculator,
  Package,
  ClipboardList,
  BarChart3,
  Settings,
  Eye,
  EyeOff,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Box,
  ShoppingBag
} from 'lucide-react';

export function Sidebar({
  activeTab,
  setActiveTab,
  clientMode,
  setClientMode,
  collapsed,
  setCollapsed,
  user,
  onLogout
}) {
  const menuItems = [
    { id: 'calculator', label: 'Calculadora', icon: Calculator, hideInClientMode: false },
    { id: 'products', label: 'Produtos', icon: Package, hideInClientMode: false },
    { id: 'catalog', label: 'Catálogo', icon: ShoppingBag, hideInClientMode: false },
    { id: 'orders', label: 'Pedidos', icon: ClipboardList, hideInClientMode: false },
    { id: 'financial', label: 'Financeiro', icon: BarChart3, hideInClientMode: true },
    { id: 'settings', label: 'Configurações', icon: Settings, hideInClientMode: true }
  ];

  const filteredItems = clientMode ? menuItems.filter(item => !item.hideInClientMode) : menuItems;

  return (
    <aside style={{
      width: collapsed ? '72px' : '240px',
      backgroundColor: 'var(--bg-sidebar)',
      borderRight: '1px solid var(--border-color)',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      transition: 'width 0.2s ease',
      flexShrink: 0,
      zIndex: 100,
      userSelect: 'none'
    }}>
      {/* Top Header */}
      <div>
        <div style={{
          padding: collapsed ? '20px 14px' : '20px 20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '1px solid var(--border-color)'
        }}>
          <div style={{
            width: 34,
            height: 34,
            borderRadius: 8,
            background: 'linear-gradient(135deg, #00bcd4 0%, #008ba3 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            boxShadow: '0 2px 10px rgba(0, 188, 212, 0.4)',
            flexShrink: 0
          }}>
            <Box size={20} />
          </div>

          {!collapsed && (
            <div>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: '#fff', letterSpacing: '-0.01em' }}>
                Precifica <span style={{ color: '#00bcd4' }}>3D</span>
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)' }}>
                {clientMode ? 'Modo Apresentação' : 'Gestão & Custos'}
              </div>
            </div>
          )}
        </div>

        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          style={{
            width: '100%',
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            padding: collapsed ? '12px 0' : '10px 20px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            background: 'transparent',
            border: 'none',
            color: 'var(--text-muted)',
            fontSize: '0.75rem',
            cursor: 'pointer',
            borderBottom: '1px solid var(--border-color)'
          }}
          title={collapsed ? 'Expandir menu' : 'Recolher menu'}
        >
          {collapsed ? <ChevronRight size={16} /> : (
            <>
              <ChevronLeft size={16} />
              <span>Recolher menu</span>
            </>
          )}
        </button>

        {/* Menu Items */}
        <nav style={{ padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 4 }}>
          {filteredItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  width: '100%',
                  padding: collapsed ? '10px 0' : '10px 14px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  borderRadius: 'var(--radius-md)',
                  background: isActive ? 'rgba(0, 188, 212, 0.12)' : 'transparent',
                  color: isActive ? '#00e5ff' : 'var(--text-secondary)',
                  border: isActive ? '1px solid rgba(0, 188, 212, 0.3)' : '1px solid transparent',
                  fontWeight: isActive ? 600 : 500,
                  fontSize: '0.875rem',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={collapsed ? item.label : undefined}
              >
                <Icon size={18} color={isActive ? '#00e5ff' : 'currentColor'} />
                {!collapsed && <span>{item.label}</span>}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Controls */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {/* Client Mode Toggle */}
        <button
          onClick={() => setClientMode(!clientMode)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            width: '100%',
            padding: collapsed ? '10px 0' : '9px 12px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            borderRadius: 'var(--radius-md)',
            background: clientMode ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
            color: clientMode ? '#10b981' : 'var(--text-muted)',
            border: clientMode ? '1px solid rgba(16, 185, 129, 0.4)' : '1px solid transparent',
            fontSize: '0.8125rem',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
          title={clientMode ? 'Sair do Modo Cliente' : 'Ativar Modo Cliente'}
        >
          {clientMode ? <EyeOff size={16} /> : <Eye size={16} />}
          {!collapsed && (
            <span>{clientMode ? 'Sair Modo Cliente' : 'Modo Cliente'}</span>
          )}
        </button>

        {/* User / Logout */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'space-between',
          padding: collapsed ? '8px 0' : '8px 12px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md)'
        }}>
          {!collapsed && (
            <div style={{ minWidth: 0, overflow: 'hidden' }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.name || 'Administrador'}
              </div>
              <div style={{ fontSize: '0.6875rem', color: 'var(--text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {user?.email || 'admin@precifica3d'}
              </div>
            </div>
          )}

          <button
            onClick={onLogout}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center'
            }}
            title="Sair da conta"
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
