import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/layout/Sidebar.jsx';
import { Login } from './pages/Login.jsx';
import { Calculator } from './pages/Calculator.jsx';
import { Products } from './pages/Products.jsx';
import { Orders } from './pages/Orders.jsx';
import { Financial } from './pages/Financial.jsx';
import { Settings } from './pages/Settings.jsx';
import { Catalog } from './pages/Catalog.jsx';
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx';
import { api } from './api/client.js';

export function App() {
  const [user, setUser] = useState(null);
  const [authChecking, setAuthChecking] = useState(true);

  const [activeTab, setActiveTab] = useState('calculator');
  const [clientMode, setClientMode] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Cross-page product payload for direct quoting in Orders
  const [initialOrderProduct, setInitialOrderProduct] = useState(null);
  // Cross-page product for editing in Calculator
  const [editingProduct, setEditingProduct] = useState(null);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const token = localStorage.getItem('precifica3d_token');
    const savedUser = localStorage.getItem('precifica3d_user');

    if (token) {
      try {
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        }
        const res = await api.getMe();
        setUser(res.user);
      } catch (err) {
        console.warn('Sessão expirada ou inválida:', err);
        // Fallback to local admin user if offline
        if (savedUser) {
          setUser(JSON.parse(savedUser));
        } else {
          localStorage.removeItem('precifica3d_token');
          setUser(null);
        }
      }
    }
    setAuthChecking(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('precifica3d_token');
    localStorage.removeItem('precifica3d_user');
    setUser(null);
  };

  const handleGenerateOrderFromProduct = (product) => {
    setInitialOrderProduct(product);
    setActiveTab('orders');
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setActiveTab('calculator');
  };

  const isPublicCatalog = typeof window !== 'undefined' && (
    window.location.pathname.startsWith('/catalogo') ||
    window.location.pathname.startsWith('/c/') ||
    window.location.hash.includes('catalogo')
  );

  if (isPublicCatalog) {
    return <Catalog onBackToDashboard={user ? () => { window.location.hash = ''; setActiveTab('products'); } : null} />;
  }

  if (authChecking) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'var(--bg-main)',
        color: '#00bcd4',
        fontSize: '1rem',
        fontWeight: 600
      }}>
        Inicializando Precifica 3D...
      </div>
    );
  }

  if (!user) {
    return <Login onLoginSuccess={(u) => setUser(u)} />;
  }

  return (
    <div className="app-container">
      <Sidebar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'calculator') setEditingProduct(null);
          setActiveTab(tab);
        }}
        clientMode={clientMode}
        setClientMode={setClientMode}
        collapsed={sidebarCollapsed}
        setCollapsed={setSidebarCollapsed}
        user={user}
        onLogout={handleLogout}
      />

      <main className="main-content">
        <ErrorBoundary>
          {activeTab === 'calculator' && (
            <Calculator
              clientMode={clientMode}
              editingProduct={editingProduct}
              onClearEditingProduct={() => setEditingProduct(null)}
              onProductSaved={() => setEditingProduct(null)}
              onGenerateOrder={handleGenerateOrderFromProduct}
            />
          )}

          {activeTab === 'products' && (
            <Products
              clientMode={clientMode}
              onNavigateToCalculator={() => {
                setEditingProduct(null);
                setActiveTab('calculator');
              }}
              onEditProduct={handleEditProduct}
              onGenerateOrder={handleGenerateOrderFromProduct}
            />
          )}

          {activeTab === 'catalog' && (
            <Catalog
              onBackToDashboard={() => setActiveTab('products')}
              isEmbedded={true}
            />
          )}

          {activeTab === 'orders' && (
            <Orders
              clientMode={clientMode}
              initialNewOrderProduct={initialOrderProduct}
              onClearInitialProduct={() => setInitialOrderProduct(null)}
            />
          )}

          {activeTab === 'financial' && !clientMode && (
            <Financial />
          )}

          {activeTab === 'settings' && !clientMode && (
            <Settings />
          )}
        </ErrorBoundary>
      </main>
    </div>
  );
}

export default App;

