import { useState, useEffect, useRef, useCallback } from 'react';
import api, { getImageUrl } from './utils/api';
import ProductForm from './components/ProductForm';
import ServiceAreas from './components/ServiceAreas';
import Users from './components/Users';
import './index.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('dashboard');

  // Login state
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  // Dashboard state
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);

  // Product Form State
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Notification state
  const [newOrderCount, setNewOrderCount] = useState(0);
  const lastOrderCountRef = useRef(0);
  const notificationAudioRef = useRef(null);
  const [notifDismissed, setNotifDismissed] = useState(false);

  // Mobile Menu State
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Request Notification Permission on Load
  useEffect(() => {
    if ('Notification' in window && Notification.permission !== 'denied') {
      Notification.requestPermission();
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem('adminToken');
    if (token) {
      setIsAuthenticated(true);
      fetchDashboardData();
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      if (activeTab === 'dashboard' || activeTab === 'orders') {
        fetchOrders();
      } else if (activeTab === 'products') {
        fetchProducts();
        fetchCategories();
      }
    }
  }, [activeTab, isAuthenticated]);

  // Poll for new orders every 15 seconds
  useEffect(() => {
    if (!isAuthenticated) return;

    const pollNewOrders = async () => {
      try {
        const response = await api.get('/orders/admin/all');
        if (response.data.success) {
          const placedCount = response.data.stats?.placed || 0;

          // If new orders arrived, play notification sound and show Push Notification
          if (placedCount > lastOrderCountRef.current && lastOrderCountRef.current > 0) {
            playNotificationSound();

            // Show Native Browser Push Notification
            if ('Notification' in window && Notification.permission === 'granted') {
              const diff = placedCount - lastOrderCountRef.current;
              const notif = new Notification('🛍️ New Order Received!', {
                body: `You have ${diff} new order(s) waiting for acceptance.`,
                icon: '/favicon.ico',
                vibrate: [200, 100, 200]
              });

              notif.onclick = () => {
                window.focus();
                setActiveTab('orders');
                notif.close();
              };
            }
          }
          lastOrderCountRef.current = placedCount;
          setNewOrderCount(placedCount);
        }
      } catch (error) {
        // Silently fail for polling
      }
    };

    pollNewOrders();
    const interval = setInterval(pollNewOrders, 15000);
    return () => clearInterval(interval);
  }, [isAuthenticated]);

  const playNotificationSound = useCallback(() => {
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
      oscillator.start(audioCtx.currentTime);
      oscillator.stop(audioCtx.currentTime + 0.5);
    } catch (e) {
      // Audio not supported
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');

    try {
      const response = await api.post('/auth/admin-login', { phone, password });
      if (response.data.success) {
        localStorage.setItem('adminToken', response.data.data.token);
        setIsAuthenticated(true);
        fetchDashboardData();
      }
    } catch (error) {
      setLoginError(error.response?.data?.message || 'Login failed');
    }
  };

  const fetchDashboardData = async () => {
    await Promise.all([fetchOrders()]);
  };

  const fetchOrders = async () => {
    try {
      const response = await api.get('/orders/admin/all');
      if (response.data.success) {
        setOrders(response.data.data);
        setStats(response.data.stats);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?limit=100');
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await api.get('/categories');
      if (response.data.success) {
        setCategories(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const updateOrderStatus = async (orderId, newStatus) => {
    try {
      await api.put(`/orders/admin/${orderId}/status`, { status: newStatus });
      fetchOrders();
      alert('Order status updated!');
    } catch (error) {
      alert('Failed to update order status');
    }
  };

  const deleteOrder = async (id) => {
    if (!window.confirm('Delete this order permanently?')) return;
    try {
      await api.delete(`/orders/admin/${id}`);
      fetchOrders();
    } catch (error) {
      alert('Failed to delete order');
    }
  };

  const handleDeleteProduct = async (id) => {
    if (window.confirm('Are you sure you want to delete this product?')) {
      try {
        await api.delete(`/products/${id}`);
        fetchProducts();
      } catch (error) {
        alert('Failed to delete product');
      }
    }
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleAddNewProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleProductSaved = () => {
    fetchProducts();
    setShowProductForm(false);
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setIsAuthenticated(false);
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSidebarOpen(false); // Close sidebar on mobile
  };

  if (loading) {
    return <div className="loading"><div className="spinner"></div></div>;
  }

  if (!isAuthenticated) {
    return (
      <div className="login-page">
        <div className="login-card">
          <h1>Admin Login</h1>
          {loginError && <div style={{ color: 'red', marginBottom: 16 }}>{loginError}</div>}
          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label>Phone</label>
              <input
                type="text"
                className="input"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+919999999999"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input
                type="password"
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="admin123"
              />
            </div>
            <button type="submit" className="btn btn-primary" style={{ width: '100%' }}>
              Login
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      {/* Mobile Top Header */}
      <div className="mobile-header">
        <button className="mobile-menu-btn" onClick={() => setSidebarOpen(true)}>
          ☰
        </button>
        <h2>Admin Panel</h2>
      </div>

      {/* Sidebar Overlay for Mobile */}
      {sidebarOpen && <div className="sidebar-overlay" onClick={() => setSidebarOpen(false)}></div>}

      <div className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <h2 className="sidebar-title">📦 Admin Panel</h2>
        <div className={`menu-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => handleTabChange('dashboard')}>
          Dashboard
        </div>
        <div className={`menu-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => handleTabChange('orders')}>
          Orders
          {newOrderCount > 0 && <span style={{
            background: '#ff4444',
            color: 'white',
            borderRadius: '50%',
            padding: '2px 7px',
            fontSize: '11px',
            fontWeight: 'bold',
            marginLeft: '8px',
            animation: 'pulse 2s infinite'
          }}>{newOrderCount}</span>}
        </div>
        <div className={`menu-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => handleTabChange('products')}>
          Products
        </div>
        <div className={`menu-item ${activeTab === 'service-areas' ? 'active' : ''}`} onClick={() => handleTabChange('service-areas')}>
          📍 Service Areas
        </div>
        <div className={`menu-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => handleTabChange('users')}>
          👥 Users
        </div>
        <div className="menu-item" onClick={handleLogout}>
          Logout
        </div>
      </div>

      <div className="main-content">
        {/* New Order Notification Bar */}
        {newOrderCount > 0 && !notifDismissed && (
          <div style={{
            background: 'linear-gradient(135deg, #ff6b6b, #ee5a24)',
            color: 'white',
            padding: '12px 20px',
            borderRadius: '10px',
            margin: '0 0 16px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 10px rgba(238,90,36,0.3)',
            animation: 'slideDown 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>🔔</span>
              <span style={{ fontWeight: '600' }}>
                {newOrderCount} new order{newOrderCount > 1 ? 's' : ''} waiting for acceptance!
              </span>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                background: 'white',
                color: '#ee5a24',
                border: 'none',
                padding: '6px 16px',
                borderRadius: '6px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '13px'
              }}
            >
              View Orders →
            </button>
            <button
              onClick={() => setNotifDismissed(true)}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255,255,255,0.8)',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '0 4px',
                marginLeft: '8px'
              }}
            >
              ✕
            </button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div>
            <div className="page-header">
              <h1>Dashboard</h1>
              <p>Welcome to the admin panel</p>
            </div>

            {stats && (
              <div className="stats-grid">
                <div className="stat-card">
                  <h3>Total Orders</h3>
                  <div className="value">{stats.total}</div>
                </div>
                <div className="stat-card">
                  <h3>Pending</h3>
                  <div className="value" style={{ color: 'var(--warning)' }}>{stats.placed}</div>
                </div>
                <div className="stat-card">
                  <h3>Out for Delivery</h3>
                  <div className="value" style={{ color: 'var(--primary)' }}>{stats.outForDelivery}</div>
                </div>
                <div className="stat-card">
                  <h3>Delivered</h3>
                  <div className="value" style={{ color: 'var(--success)' }}>{stats.delivered}</div>
                </div>
              </div>
            )}

            <div className="card">
              <h2 style={{ marginBottom: 20 }}>Recent Orders</h2>
              <div className="table-responsive">
                <OrdersTable orders={orders.slice(0, 10)} updateStatus={updateOrderStatus} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'orders' && (
          <div>
            <div className="page-header">
              <h1>Order Management</h1>
              <p>Manage all customer orders</p>
            </div>

            <div className="card">
              <div className="table-responsive">
                <OrdersTable orders={orders} updateStatus={updateOrderStatus} deleteOrder={deleteOrder} />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'products' && (
          <div>
            <div className="page-header">
              <h1>Product Management</h1>
              <p>Manage your product catalog</p>
            </div>

            <div className="card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h3>Products ({products.length})</h3>
                <button className="btn btn-primary" onClick={handleAddNewProduct}>+ Add Product</button>
              </div>

              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Image</th>
                      <th>Name</th>
                      <th>Brand</th>
                      <th>Gender</th>
                      <th>Price</th>
                      <th>Stock</th>
                      <th>Category</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map(product => (
                      <tr key={product._id}>
                        <td>
                          <img
                            src={getImageUrl(product.images[0])}
                            alt={product.name}
                            style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 8 }}
                            onError={(e) => e.target.style.display = 'none'}
                          />
                        </td>
                        <td>
                          <div style={{ fontWeight: 500 }}>{product.name}</div>
                          <div style={{ fontSize: 12, color: '#666' }}>{product.description?.substring(0, 30)}...</div>
                        </td>
                        <td>{product.brand || '-'}</td>
                        <td>{product.gender || '-'}</td>
                        <td>${product.price}</td>
                        <td>
                          <span style={{ color: product.stock < 10 ? 'red' : 'green' }}>
                            {product.stock}
                          </span>
                        </td>
                        <td>{product.category?.name || 'N/A'}</td>
                        <td>
                          <div className="action-buttons">
                            <button className="btn btn-secondary" style={{ marginRight: 8, padding: '4px 8px', fontSize: 12 }} onClick={() => handleEditProduct(product)}>Edit</button>
                            <button className="btn btn-danger" style={{ padding: '4px 8px', fontSize: 12, backgroundColor: '#ff4444', color: 'white', border: 'none', borderRadius: 4 }} onClick={() => handleDeleteProduct(product._id)}>Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {showProductForm && (
              <ProductForm
                product={editingProduct}
                categories={categories}
                onClose={() => setShowProductForm(false)}
                onSave={handleProductSaved}
              />
            )}
          </div>
        )}

        {activeTab === 'service-areas' && (
          <div>
            <div className="page-header">
              <h1>Service Areas</h1>
              <p>Manage serviceable locations</p>
            </div>
            <div className="card">
              <ServiceAreas />
            </div>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <div className="page-header">
              <h1>User Management</h1>
              <p>View and manage registered users</p>
            </div>
            <div className="card">
              <Users />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const OrdersTable = ({ orders, updateStatus, deleteOrder }) => {
  const statusOptions = ['Placed', 'Accepted', 'Packed', 'Out for Delivery', 'Delivered'];

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Customer</th>
          <th>Items Received</th>
          <th>Quantity</th>
          <th>Delivery Address</th>
          <th>Total</th>
          <th>Status</th>
          <th>Date</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => (
          <tr key={order._id}>
            <td>#{order.orderId}</td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: '#e2e8f0', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                  👤
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>{order.user?.name || 'N/A'}</div>
                  <div style={{ fontSize: '0.85em', color: '#666' }}>{order.contactInfo?.phone}</div>
                </div>
              </div>
            </td>
            <td>
              <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {order.items.map((item, idx) => (
                  <li key={idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9em' }}>
                    {item.image && (
                      <img
                        src={getImageUrl(item.image)}
                        alt={item.name}
                        style={{ width: '36px', height: '36px', objectFit: 'cover', borderRadius: '4px', border: '1px solid #e2e8f0' }}
                        onError={(e) => { e.target.style.display = 'none'; }}
                      />
                    )}
                    <div>
                      <div>{item.name} <strong>(x{item.quantity})</strong></div>
                      {(item.size || item.color) && (
                        <div style={{ fontSize: '0.9em', color: '#64748b' }}>
                          {item.size ? `Size: ${item.size}` : ''}
                          {item.size && item.color ? ' | ' : ''}
                          {item.color ? `Color: ${item.color}` : ''}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </td>
            <td style={{ fontWeight: 600, textAlign: 'center', fontSize: '1.1em' }}>
              {order.items.reduce((total, item) => total + item.quantity, 0)}
            </td>
            <td style={{ maxWidth: '250px', fontSize: '0.9em' }}>
              <div style={{ fontWeight: 500 }}>{order.shippingAddress?.fullAddress}</div>
              {order.shippingAddress?.city && <div>{order.shippingAddress.city}, {order.shippingAddress.pincode}</div>}
              {order.shippingAddress?.district && <div>{order.shippingAddress.district}</div>}
              {order.shippingAddress?.latitude && order.shippingAddress?.longitude && (
                <a
                  href={`https://www.google.com/maps?q=${order.shippingAddress.latitude},${order.shippingAddress.longitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    marginTop: '8px',
                    padding: '4px 8px',
                    background: '#e0f2fe',
                    color: '#0369a1',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    fontSize: '0.85em',
                    fontWeight: 600
                  }}
                >
                  📍 View on Map
                </a>
              )}
            </td>
            <td style={{ fontWeight: 600 }}>₹{order.total.toFixed(2)}</td>
            <td>
              <span className={`status-badge status-${order.status.toLowerCase().replace(' ', '-')}`}>
                {order.status}
              </span>
            </td>
            <td>
              <div>{new Date(order.createdAt).toLocaleDateString('en-IN')}</div>
              <div style={{ fontSize: '0.85em', color: '#666' }}>{new Date(order.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</div>
            </td>
            <td>
              <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <select
                  className="input"
                  style={{ padding: 6, fontSize: 13 }}
                  value={order.status}
                  onChange={(e) => updateStatus(order._id, e.target.value)}
                >
                  {statusOptions.map(status => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
                {deleteOrder && (
                  <button
                    onClick={() => deleteOrder(order._id)}
                    style={{
                      padding: '4px 8px',
                      background: '#fee2e2',
                      color: '#dc2626',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 11,
                      fontWeight: 600
                    }}
                  >
                    🗑
                  </button>
                )}
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

export default App;
