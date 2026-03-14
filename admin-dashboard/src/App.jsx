import { useState, useEffect, useRef, useCallback } from 'react';
import api, { getImageUrl } from './utils/api';
import ProductForm from './components/ProductForm';
import ServiceAreas from './components/ServiceAreas';
import { DashboardCharts } from './components/DashboardCharts';
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
  const [chartsData, setChartsData] = useState(null);

  // Product Form State
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Notification state
  const [newOrderCount, setNewOrderCount] = useState(0);
  const [newCancelledCount, setNewCancelledCount] = useState(0); // Added for cancelled alerts
  const lastOrderCountRef = useRef(0);
  const lastReturnCountRef = useRef(0);
  const lastExchangeCountRef = useRef(0);
  const lastCancelledCountRef = useRef(0);
  const notificationAudioRef = useRef(null);
  const [notifDismissed, setNotifDismissed] = useState(false);
  const [cancelNotifDismissed, setCancelNotifDismissed] = useState(false);

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
          const returnCount = response.data.stats?.returnRequests || 0;
          const exchangeCount = response.data.stats?.exchangeRequests || 0;

          let shouldAlert = false;
          let notifBody = [];

          if (placedCount > lastOrderCountRef.current && lastOrderCountRef.current > 0) {
            shouldAlert = true;
            notifBody.push(`${placedCount - lastOrderCountRef.current} new order(s)`);
          }
          if (returnCount > lastReturnCountRef.current && lastReturnCountRef.current > 0) {
            shouldAlert = true;
            notifBody.push(`${returnCount - lastReturnCountRef.current} new return request(s)`);
          }
          if (exchangeCount > lastExchangeCountRef.current && lastExchangeCountRef.current > 0) {
            shouldAlert = true;
            notifBody.push(`${exchangeCount - lastExchangeCountRef.current} new exchange request(s)`);
          }
          
          const cancelledCount = response.data.stats?.cancelled || 0;
          if (cancelledCount > lastCancelledCountRef.current && lastCancelledCountRef.current > 0) {
            shouldAlert = true;
            notifBody.push(`${cancelledCount - lastCancelledCountRef.current} order(s) cancelled`);
            setCancelNotifDismissed(false); // reset banner dismiss
          }

          if (shouldAlert) {
            playNotificationSound();

            if ('Notification' in window && Notification.permission === 'granted') {
              const notif = new Notification('🔔 New Activity Detected!', {
                body: `You have ${notifBody.join(', ')} waiting for review.`,
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
          lastReturnCountRef.current = returnCount;
          lastExchangeCountRef.current = exchangeCount;
          lastCancelledCountRef.current = cancelledCount;
          setNewOrderCount(placedCount);
          setNewCancelledCount(cancelledCount);
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
        if (response.data.charts) {
          setChartsData(response.data.charts);
        }
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

  const handleUpdateItemStatus = async (orderId, itemId, status) => {
    let actionStr = 'Confirm this action?';
    if (status === 'Returned') actionStr = 'Approve this return? Stock will be refunded.';
    else if (status === 'Exchanged') actionStr = 'Approve this exchange?';
    else if (status.includes('Rejected')) actionStr = 'Reject this request? The customer will be denied.';

    if (!window.confirm(actionStr)) return;

    try {
      await api.put(`/orders/admin/${orderId}/item-status`, { itemId, status });
      fetchOrders();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update item status');
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

        {/* Cancelled Order Notification Bar */}
        {newCancelledCount > 0 && !cancelNotifDismissed && (
          <div style={{
            background: '#fee2e2',
            color: '#b91c1c',
            border: '1px solid #fca5a5',
            padding: '12px 20px',
            borderRadius: '10px',
            margin: '0 0 16px 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 10px rgba(185, 28, 28, 0.1)',
            animation: 'slideDown 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚠️</span>
              <span style={{ fontWeight: '600' }}>
                {newCancelledCount} Order{newCancelledCount > 1 ? 's' : ''} Cancelled
              </span>
            </div>
            <button
              onClick={() => setActiveTab('orders')}
              style={{
                background: '#b91c1c',
                color: 'white',
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
              onClick={() => setCancelNotifDismissed(true)}
              style={{
                background: 'none',
                border: 'none',
                color: '#b91c1c',
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
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Section Helper */}
                {(() => {
                  const SectionLabel = ({ icon, label }) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '18px' }}>{icon}</span>
                      <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#334155', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</h2>
                    </div>
                  );

                  const Card = ({ label, value, color, borderColor, prefix = '' }) => (
                    <div className="stat-card" style={{ borderTop: `4px solid ${borderColor}` }}>
                      <h3>{label}</h3>
                      <div className="value" style={{ color }}>{prefix}{value}</div>
                    </div>
                  );

                  return (
                    <>
                      {/* Today's Snapshot */}
                      <div>
                        <SectionLabel icon="📅" label="Today's Snapshot" />
                        <div className="stats-grid">
                          <Card label="Orders Today" value={stats.ordersToday || 0} color="#1d4ed8" borderColor="#3b82f6" />
                          <Card label="Revenue Today" value={`₹${(stats.revenueToday || 0).toFixed(0)}`} color="#047857" borderColor="#10b981" />
                          <Card label="Pending Orders" value={stats.pending || 0} color="#b45309" borderColor="#f59e0b" />
                          <Card label="Out for Delivery" value={stats.outForDelivery || 0} color="#0e7490" borderColor="#06b6d4" />
                          <Card label="Delivered Today" value={stats.deliveredToday || 0} color="#16a34a" borderColor="#22c55e" />
                          <Card label="Cancelled Today" value={stats.cancelledToday || 0} color="#dc2626" borderColor="#ef4444" />
                          <Card label="Return Requests" value={stats.returnRequests || 0} color="#c2410c" borderColor="#f97316" />
                          <Card label="Exchange Requests" value={stats.exchangeRequests || 0} color="#6d28d9" borderColor="#8b5cf6" />
                        </div>
                      </div>

                      {/* Totals Overview */}
                      <div>
                        <SectionLabel icon="📦" label="Order Totals" />
                        <div className="stats-grid">
                          <Card label="Total Orders" value={stats.total || 0} color="#1e293b" borderColor="#64748b" />
                          <Card label="Total Cancelled" value={stats.totalCancelled || 0} color="#dc2626" borderColor="#ef4444" />
                          <Card label="Total Returned" value={stats.totalReturned || 0} color="#92400e" borderColor="#f97316" />
                          <Card label="Total Exchanged" value={stats.totalExchanged || 0} color="#4c1d95" borderColor="#8b5cf6" />
                        </div>
                      </div>

                      {/* Business Performance */}
                      <div>
                        <SectionLabel icon="💰" label="Business Performance" />
                        <div className="stats-grid">
                          <Card label="Today's Revenue" value={`₹${(stats.revenueToday || 0).toFixed(0)}`} color="#047857" borderColor="#10b981" />
                          <Card label="This Week's Revenue" value={`₹${(stats.revenueThisWeek || 0).toFixed(0)}`} color="#1d4ed8" borderColor="#3b82f6" />
                          <Card label="Total Revenue" value={`₹${(stats.totalRevenue || 0).toFixed(0)}`} color="#7c3aed" borderColor="#a78bfa" />
                          <Card label="Avg Order Value" value={`₹${(stats.avgOrderValue || 0).toFixed(0)}`} color="#0e7490" borderColor="#06b6d4" />
                        </div>
                      </div>

                      {/* Product Insights */}
                      <div>
                        <SectionLabel icon="🏷️" label="Product Insights" />
                        <div className="stats-grid">
                          <Card label="Total Products" value={stats.totalProducts || 0} color="#1e293b" borderColor="#64748b" />
                          <Card label="Active Products" value={stats.activeProducts || 0} color="#16a34a" borderColor="#22c55e" />
                          <Card label="Low Stock (≤5)" value={stats.lowStock || 0} color="#b45309" borderColor="#f59e0b" />
                          <Card label="Out of Stock" value={stats.outOfStock || 0} color="#dc2626" borderColor="#ef4444" />
                        </div>
                      </div>

                      {/* Customer Insights */}
                      <div>
                        <SectionLabel icon="👥" label="Customer Insights" />
                        <div className="stats-grid">
                          <Card label="Total Users" value={stats.totalUsers || 0} color="#1e293b" borderColor="#64748b" />
                          <Card label="New Users Today" value={stats.newUsersToday || 0} color="#047857" borderColor="#10b981" />
                          <Card label="Repeat Customers" value={stats.repeatCustomers || 0} color="#1d4ed8" borderColor="#3b82f6" />
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}

            <DashboardCharts chartsData={chartsData} />
          </div>
        )}


        {activeTab === 'orders' && (
          <OrderManagementTab
            orders={orders}
            updateOrderStatus={updateOrderStatus}
            deleteOrder={deleteOrder}
            handleUpdateItemStatus={handleUpdateItemStatus}
          />
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

const ORDER_FILTER_TABS = [
  { label: 'All Orders', value: 'all' },
  { label: 'New', value: 'Placed' },
  { label: 'Accepted', value: 'Accepted' },
  { label: 'Packed', value: 'Packed' },
  { label: 'Out for Delivery', value: 'Out for Delivery' },
  { label: 'Delivered', value: 'Delivered' },
  { label: 'Cancelled', value: 'Cancelled' },
  { label: 'Returns', value: 'return' },
  { label: 'Exchanges', value: 'exchange' },
];

const OrderManagementTab = ({ orders, updateOrderStatus, deleteOrder, handleUpdateItemStatus }) => {
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredOrders = orders.filter(order => {
    // Check filter tab
    let tabMatch = true;
    if (activeFilter === 'return') {
      tabMatch = order.items.some(i => i.status?.toLowerCase().includes('return'));
    } else if (activeFilter === 'exchange') {
      tabMatch = order.status === 'Exchange Requested' || order.items.some(i => i.status?.toLowerCase().includes('exchange'));
    } else if (activeFilter !== 'all') {
      tabMatch = order.status === activeFilter;
    }

    if (!tabMatch) return false;

    // Check search query
    if (!searchQuery.trim()) return true;
    const q = searchQuery.trim().toLowerCase();
    const matchId = order.orderId?.toLowerCase().includes(q);
    const matchPhone = order.contactInfo?.phone?.includes(q) || order.user?.phone?.includes(q);
    const matchCode = order.items.some(i => i.productCode?.toLowerCase().includes(q));
    return matchId || matchPhone || matchCode;
  });

  return (
    <div>
      <div className="page-header">
        <h1>Order Management</h1>
        <p>Manage all customer orders</p>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ position: 'relative', maxWidth: '480px' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by Order ID, Phone, or Product Code…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 42px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}
            >✕</button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px', borderBottom: '2px solid #f1f5f9', paddingBottom: '8px' }}>
        {ORDER_FILTER_TABS.map(tab => (
          <button
            key={tab.value}
            onClick={() => setActiveFilter(tab.value)}
            style={{
              padding: '6px 14px',
              border: 'none',
              borderRadius: '20px',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
              background: activeFilter === tab.value ? '#f97316' : '#f1f5f9',
              color: activeFilter === tab.value ? '#fff' : '#475569',
              boxShadow: activeFilter === tab.value ? '0 2px 6px rgba(249,115,22,0.3)' : 'none'
            }}
          >
            {tab.label}
          </button>
        ))}
        <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center' }}>
          Showing {filteredOrders.length} of {orders.length} orders
        </span>
      </div>

      {/* Orders Table */}
      <div className="card" style={{ marginBottom: 0 }}>
        {filteredOrders.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#94a3b8' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontWeight: 600, fontSize: '16px' }}>No orders found</div>
            <div style={{ fontSize: '14px', marginTop: '4px' }}>Try adjusting your search or filter</div>
          </div>
        ) : (
          <div className="table-responsive">
            <OrdersTable orders={filteredOrders} updateStatus={updateOrderStatus} deleteOrder={deleteOrder} handleUpdateItemStatus={handleUpdateItemStatus} />
          </div>
        )}
      </div>
    </div>
  );
};

const ITEM_NEXT_STATES = {
  'Active':                     [],
  'Return Requested':           ['Return Accepted', 'Return Rejected'],
  'Return Accepted':            ['Out for Pickup'],
  'Out for Pickup':             ['Return Picked Up'],
  'Return Picked Up':           ['Returned'],
  'Returned':                   [],
  'Return Rejected':            [],
  'Exchange Requested':         ['Exchange Accepted', 'Exchange Rejected'],
  'Exchange Accepted':          ['Out for Delivery (Exchange)'],
  'Out for Delivery (Exchange)':['Exchanged'],
  'Exchanged':                  [],
  'Exchange Rejected':          [],
  'Cancelled':                  [],
};

const OrdersTable = ({ orders, updateStatus, deleteOrder, handleUpdateItemStatus }) => {
  const [expandedOrders, setExpandedOrders] = useState({});
  const toggleHistory = (id) => setExpandedOrders(p => ({ ...p, [id]: !p[id] }));

  const statusOptions = ['Placed', 'Accepted', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'];

  return (
    <table className="table">
      <thead>
        <tr>
          <th>Order ID</th>
          <th>Customer</th>
          <th>Items Received</th>
          <th>Product Code</th>
          <th>Quantity</th>
          <th>Delivery Address</th>
          <th>Total</th>
          <th>Status</th>
          <th>Date</th>
          <th>Action</th>
          <th>Item Logistics</th>
        </tr>
      </thead>
      <tbody>
        {orders.map(order => {
          const isCancelled = order.status === 'Cancelled' || order.items.every(i => i.status === 'Cancelled');
          const isExchangeRequested = order.status === 'Exchange Requested';
          
          let rowClass = '';
          if (isCancelled) rowClass = 'cancelled-row';
          if (isExchangeRequested) rowClass = 'exchange-row';

          return (
          <>
          <tr key={order._id} className={rowClass}>
            <td style={{ minWidth: '30px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <span style={{ fontSize: '12px', fontWeight: 600 }}>#{order.orderId?.slice(-6)}</span>
                <button
                  onClick={() => toggleHistory(order._id)}
                  title="Show order history"
                  style={{ background: 'none', border: '1px solid #e2e8f0', borderRadius: '4px', cursor: 'pointer', fontSize: '13px', padding: '1px 4px', color: '#64748b' }}
                >{expandedOrders[order._id] ? '▲' : '▼'}</button>
              </div>
            </td>
            <td>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ background: '#e2e8f0', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>
                  👤
                </div>
                <div>
                  <div style={{ fontWeight: 600 }}>
                    {order.user?.name !== 'User' && order.user?.name ? order.user.name : (order.shippingAddress?.fullName || 'Customer')}
                  </div>
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
                      {/* Item Level Status Flag */}
                      {item.status && item.status !== 'Active' && (
                        <div style={{
                          marginTop: '4px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          fontSize: '0.8em',
                          fontWeight: 700,
                          backgroundColor: item.status.includes('Requested') ? '#ffedd5' : item.status.includes('Rejected') ? '#fef2f2' : item.status === 'Returned' || item.status === 'Exchanged' ? '#dcfce7' : '#e0f2fe',
                          color: item.status.includes('Requested') ? '#c2410c' : item.status.includes('Rejected') ? '#991b1b' : item.status === 'Returned' || item.status === 'Exchanged' ? '#15803d' : '#0369a1',
                          border: `1px solid ${item.status.includes('Requested') ? '#fdba74' : item.status.includes('Rejected') ? '#fecaca' : item.status === 'Returned' || item.status === 'Exchanged' ? '#86efac' : '#bae6fd'}`
                        }}>
                          {item.status}
                        </div>
                      )}
                      {/* Customer Reason Note & Cancellation Info */}
                      {(item.actionReason || item.status === 'Cancelled' || item.status === 'Exchange Requested') && (
                        <div className="item-note-container" style={{ marginTop: '6px', padding: '8px', background: item.status === 'Cancelled' ? '#fef2f2' : (item.status === 'Exchange Requested' ? '#fff7ed' : '#f8fafc'), borderLeft: item.status === 'Cancelled' ? '3px solid #ef4444' : (item.status === 'Exchange Requested' ? '3px solid #f97316' : '3px solid #cbd5e1'), borderRadius: '4px' }}>
                          {item.status === 'Cancelled' && (
                            <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#dc2626', marginBottom: '4px' }}>
                              <span>Cancelled by: {item.cancelledBy || 'System/Admin'}</span>
                              <span style={{ margin: '0 6px', color: '#fca5a5' }}>|</span>
                              <span>Time: {item.cancelledAt ? new Date(item.cancelledAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }) : new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          )}
                          {item.status === 'Exchange Requested' && (
                            <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#ea580c', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                               <span>🔄 Exchange Requested</span>
                            </div>
                          )}
                          {(item.status === 'Exchange Requested') && (item.exchangeSize || item.exchangeColor) && (
                            <div style={{ fontSize: '0.85em', fontWeight: 600, color: '#ea580c', marginBottom: '4px' }}>
                              Requested:{' '}
                              {item.exchangeSize && `Size ${item.size} → ${item.exchangeSize}`}
                              {item.exchangeSize && item.exchangeColor && ', '}
                              {item.exchangeColor && `Color ${item.color} → ${item.exchangeColor}`}
                            </div>
                          )}
                          {item.actionReason && (
                            <div style={{ fontSize: '0.85em', color: '#475569', fontStyle: 'italic' }}>
                              <span style={{ fontWeight: 600 }}>Reason:</span> {item.actionReason}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </td>
            <td>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', paddingTop: '4px' }}>
                {order.items.map((item, idx) => (
                  <div key={idx} style={{ 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    minHeight: '36px', fontSize: '0.9em', color: '#3730a3', fontWeight: 600,
                    background: '#e0e7ff', borderRadius: '6px', padding: '2px 8px', width: 'fit-content', margin: '0 auto' 
                  }}>
                    {item.productCode || 'N/A'}
                  </div>
                ))}
              </div>
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
              <span className={`status-badge status-${order.status.toLowerCase().replace(/ /g, '-')}`}>
                {order.status === 'Cancelled' ? '❌ Cancelled' : (order.status === 'Exchange Requested' ? '🔄 Exchange Requested' : order.status)}
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
                  style={{ padding: '6px 24px 6px 8px', fontSize: 13, minWidth: '130px', cursor: 'pointer' }}
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
            <td>
              <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '10px', minWidth: '200px' }}>
                {order.items.map((item, idx) => {
                  const nextStates = ITEM_NEXT_STATES[item.status] || [];
                  const fmt = (d) => d ? new Date(d).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: true }) : null;

                  const terminalChips = {
                    'Returned':         { bg: '#dcfce7', color: '#15803d', border: '#86efac', icon: '✅', label: 'Return Completed', ts: item.returnCompletedAt },
                    'Exchanged':        { bg: '#ede9fe', color: '#6d28d9', border: '#c4b5fd', icon: '✅', label: 'Exchange Completed', ts: item.exchangeCompletedAt },
                    'Return Rejected':  { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: '❌', label: 'Return Rejected', ts: item.returnRejectedAt },
                    'Exchange Rejected':{ bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: '❌', label: 'Exchange Rejected', ts: item.exchangeRejectedAt },
                    'Cancelled':        { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', icon: '❌', label: 'Cancelled', ts: item.cancelledAt },
                  };
                  const chip = terminalChips[item.status];

                  const inProgressTs = {
                    'Return Requested':           item.returnRequestedAt,
                    'Return Accepted':            item.returnAcceptedAt,
                    'Out for Pickup':             item.outForPickupAt,
                    'Return Picked Up':           item.returnPickedUpAt,
                    'Exchange Requested':         item.exchangeRequestedAt,
                    'Exchange Accepted':          item.exchangeAcceptedAt,
                    'Out for Delivery (Exchange)':item.exchangeAcceptedAt,
                  }[item.status];

                  const pref = item.exchangeSize || item.exchangeColor ? (
                    <div style={{ fontSize: '11px', color: '#6d28d9', fontWeight: 600, marginBottom: '4px' }}>
                      Prefers: {item.exchangeSize && `Size ${item.exchangeSize}`} {item.exchangeColor && `Color ${item.exchangeColor}`}
                    </div>
                  ) : null;

                  return (
                    <li key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
                      {pref}
                      {chip ? (
                        <>
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', background: chip.bg, color: chip.color, border: `1px solid ${chip.border}`, borderRadius: '6px', padding: '5px 10px', fontSize: '12px', fontWeight: 700 }}>
                            {chip.icon} {chip.label}
                          </div>
                          {chip.ts && <div style={{ fontSize: '10px', color: '#94a3b8' }}>🕐 {fmt(chip.ts)}</div>}
                        </>
                      ) : nextStates.length > 0 ? (
                        <>
                          <div style={{ fontSize: '11px', color: '#64748b', fontWeight: 600, marginBottom: '2px' }}>
                            Current: <span style={{ color: '#f97316' }}>{item.status}</span>
                          </div>
                          {inProgressTs && <div style={{ fontSize: '10px', color: '#94a3b8', marginBottom: '4px' }}>🕐 {fmt(inProgressTs)}</div>}
                          <select
                            defaultValue=""
                            onChange={(e) => { if (e.target.value) handleUpdateItemStatus(order._id, item._id, e.target.value); }}
                            style={{ padding: '5px 8px', fontSize: '12px', borderRadius: '6px', border: '1.5px solid #e2e8f0', cursor: 'pointer', background: '#f8fafc', fontWeight: 600, color: '#1e293b', width: '100%' }}
                          >
                            <option value="">— Move to… —</option>
                            {nextStates.map(s => <option key={s} value={s}>{s}</option>)}
                          </select>
                        </>
                      ) : item.status === 'Active' ? (
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>— No action —</span>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            </td>
          </tr>
          {/* Expandable History Row */}
          {expandedOrders[order._id] && (
            <tr key={`hist-${order._id}`}>
              <td colSpan={11} style={{ background: '#f8fafc', padding: '0 12px 12px 40px', borderBottom: '2px solid #e2e8f0' }}>
                <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap', paddingTop: '12px' }}>
                  {/* Order Status Timeline */}
                  <div style={{ minWidth: '220px' }}>
                    <div style={{ fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '8px' }}>📦 Order Status History</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      {(order.statusHistory || []).map((h, i) => (
                        <div key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'flex-start' }}>
                          <span style={{ color: '#f97316', fontSize: '16px', lineHeight: 1.2 }}>●</span>
                          <div>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{h.status}</span>
                            <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                              {h.timestamp ? new Date(h.timestamp).toLocaleString('en-IN', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit', hour12:true }) : ''}
                            </div>
                            {h.note && <div style={{ color: '#64748b', fontStyle: 'italic', fontSize: '11px' }}>{h.note}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Per-item timeline */}
                  {order.items.map((item, idx) => {
                    const fmtDt = (d) => d ? new Date(d).toLocaleString('en-IN', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit', hour12:true }) : null;
                    const steps = [
                      { label: 'Return Requested',  ts: item.returnRequestedAt },
                      { label: 'Return Accepted',   ts: item.returnAcceptedAt },
                      { label: 'Out for Pickup',    ts: item.outForPickupAt },
                      { label: 'Return Picked Up',  ts: item.returnPickedUpAt },
                      { label: 'Return Completed',  ts: item.returnCompletedAt },
                      { label: 'Return Rejected',   ts: item.returnRejectedAt },
                      { label: 'Exchange Requested',ts: item.exchangeRequestedAt },
                      { label: 'Exchange Accepted', ts: item.exchangeAcceptedAt },
                      { label: 'Exchange Completed',ts: item.exchangeCompletedAt },
                      { label: 'Exchange Rejected', ts: item.exchangeRejectedAt },
                      { label: 'Cancelled',         ts: item.cancelledAt },
                    ].filter(s => s.ts);
                    if (steps.length === 0) return null;
                    return (
                      <div key={idx} style={{ minWidth: '180px' }}>
                        <div style={{ fontWeight: 700, fontSize: '13px', color: '#334155', marginBottom: '8px' }}>🏷 {item.name} History</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {steps.map((s, si) => (
                            <div key={si} style={{ display: 'flex', gap: '8px', fontSize: '12px', alignItems: 'flex-start' }}>
                              <span style={{ color: '#3b82f6', fontSize: '16px', lineHeight: 1.2 }}>●</span>
                              <div>
                                <span style={{ fontWeight: 600, color: '#1e293b' }}>{s.label}</span>
                                <div style={{ color: '#94a3b8', fontSize: '11px' }}>🕐 {fmtDt(s.ts)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </td>
            </tr>
          )}
        </>);
        })}
      </tbody>
    </table>
  );
};

export default App;
