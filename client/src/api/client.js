const API_BASE = '/api';

function getAuthHeader() {
  const token = localStorage.getItem('precifica3d_token');
  return token ? { 'Authorization': `Bearer ${token}` } : {};
}

async function request(endpoint, options = {}) {
  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  // If body is not FormData, set application/json
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const contentType = res.headers.get('content-type') || '';
  let data = null;

  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : 'Erro na requisição.');
    throw new Error(errorMsg);
  }

  return data;
}

export const api = {
  // Auth
  login: (email, password) => request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  }),
  getMe: () => request('/auth/me'),

  // Settings & Insumos
  getSettings: () => request('/settings'),
  updateSettings: (settings) => request('/settings', {
    method: 'PUT',
    body: JSON.stringify(settings)
  }),

  createPrinter: (printer) => request('/settings/printers', {
    method: 'POST',
    body: JSON.stringify(printer)
  }),
  updatePrinter: (id, printer) => request(`/settings/printers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(printer)
  }),
  deletePrinter: (id) => request(`/settings/printers/${id}`, { method: 'DELETE' }),

  createFilament: (filament) => request('/settings/filaments', {
    method: 'POST',
    body: JSON.stringify(filament)
  }),
  updateFilament: (id, filament) => request(`/settings/filaments/${id}`, {
    method: 'PUT',
    body: JSON.stringify(filament)
  }),
  deleteFilament: (id) => request(`/settings/filaments/${id}`, { method: 'DELETE' }),

  createAdditionalCost: (item) => request('/settings/additional-costs', {
    method: 'POST',
    body: JSON.stringify(item)
  }),
  updateAdditionalCost: (id, item) => request(`/settings/additional-costs/${id}`, {
    method: 'PUT',
    body: JSON.stringify(item)
  }),
  deleteAdditionalCost: (id) => request(`/settings/additional-costs/${id}`, { method: 'DELETE' }),

  createSlicerProfile: (profile) => request('/settings/slicer-profiles', {
    method: 'POST',
    body: JSON.stringify(profile)
  }),
  deleteSlicerProfile: (id) => request(`/settings/slicer-profiles/${id}`, { method: 'DELETE' }),

  // Calculator
  analyzeFile: (formData) => request('/calculator/analyze', {
    method: 'POST',
    body: formData
  }),
  calculatePricing: (payload) => request('/calculator/pricing', {
    method: 'POST',
    body: JSON.stringify(payload)
  }),

  // Products
  getProducts: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/products${q ? `?${q}` : ''}`);
  },
  getProduct: (id) => request(`/products/${id}`),
  createProduct: (product) => request('/products', {
    method: 'POST',
    body: JSON.stringify(product)
  }),
  updateProduct: (id, product) => request(`/products/${id}`, {
    method: 'PUT',
    body: JSON.stringify(product)
  }),
  deleteProduct: (id) => request(`/products/${id}`, { method: 'DELETE' }),
  uploadProductImage: (formData) => request('/products/upload-image', {
    method: 'POST',
    body: formData
  }),
  toggleProductCatalog: (id) => request(`/products/${id}/toggle-catalog`, {
    method: 'PATCH'
  }),

  // Orders & Kanban
  getOrders: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return request(`/orders${q ? `?${q}` : ''}`);
  },
  getOrder: (id) => request(`/orders/${id}`),
  createOrder: (order) => request('/orders', {
    method: 'POST',
    body: JSON.stringify(order)
  }),
  updateOrder: (id, order) => request(`/orders/${id}`, {
    method: 'PUT',
    body: JSON.stringify(order)
  }),
  updateOrderStatus: (id, status) => request(`/orders/${id}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status })
  }),
  deleteOrder: (id) => request(`/orders/${id}`, { method: 'DELETE' }),

  // Customers
  getCustomers: (search) => request(`/customers${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  getCustomer: (id) => request(`/customers/${id}`),
  createCustomer: (customer) => request('/customers', {
    method: 'POST',
    body: JSON.stringify(customer)
  }),
  updateCustomer: (id, customer) => request(`/customers/${id}`, {
    method: 'PUT',
    body: JSON.stringify(customer)
  }),
  deleteCustomer: (id) => request(`/customers/${id}`, { method: 'DELETE' }),

  // User Profile
  updateProfile: (profile) => request('/auth/profile', {
    method: 'PUT',
    body: JSON.stringify(profile)
  }),

  // Financial Dashboard
  getFinancialDashboard: (period = '30') => request(`/financial/dashboard?period=${period}`),

  // Backup
  exportBackupUrl: `${API_BASE}/backup/export`,
  importBackup: (data) => request('/backup/import', {
    method: 'POST',
    body: JSON.stringify({ data })
  })
};
