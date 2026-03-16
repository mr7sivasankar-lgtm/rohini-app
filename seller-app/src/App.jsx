import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Login from './pages/Auth/Login';
import Register from './pages/Auth/Register';
import Dashboard from './pages/Dashboard/Dashboard';

// Protected Route Wrapper
const ProtectedRoute = ({ children }) => {
  const { seller, loading } = useAuth();
  
  if (loading) {
    return <div className="loading-screen">Loading...</div>;
  }
  
  if (!seller) {
    return <Navigate to="/login" replace />;
  }

  // If seller is registered but not approved yet
  if (seller.status === 'Pending') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '60px 40px', maxWidth: '460px', width: '100%', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>⏳</div>
          <h2 style={{ color: '#1e293b', fontSize: '24px', margin: '0 0 12px' }}>Pending Admin Approval</h2>
          <p style={{ color: '#64748b', lineHeight: '1.6', margin: '0 0 8px' }}>
            Your shop <strong style={{ color: '#4f46e5' }}>{seller.shopName}</strong> has been submitted and is currently under review.
          </p>
          <p style={{ color: '#94a3b8', fontSize: '14px', margin: '0 0 32px' }}>
            You'll receive an SMS once your account is approved. This usually takes 24-48 hours.
          </p>
          <div style={{ background: '#fffbeb', border: '1px solid #fcd34d', borderRadius: '12px', padding: '14px 20px', marginBottom: '32px', fontSize: '14px', color: '#92400e' }}>
            📋 Status: <strong>Pending Approval</strong>
          </div>
          <button
            onClick={() => { localStorage.removeItem('sellerToken'); window.location.href = '/login'; }}
            style={{ background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', width: '100%' }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (seller.status === 'Rejected') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '60px 40px', maxWidth: '460px', width: '100%', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>❌</div>
          <h2 style={{ color: '#dc2626', fontSize: '24px', margin: '0 0 12px' }}>Application Rejected</h2>
          <p style={{ color: '#64748b', lineHeight: '1.6', margin: '0 0 32px' }}>
            Unfortunately, your shop <strong>{seller.shopName}</strong> was not approved. Please contact support for more details.
          </p>
          <button
            onClick={() => { localStorage.removeItem('sellerToken'); window.location.href = '/login'; }}
            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', width: '100%' }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  if (seller.status === 'Suspended') {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)', fontFamily: 'Inter, system-ui, sans-serif' }}>
        <div style={{ background: 'white', borderRadius: '24px', padding: '60px 40px', maxWidth: '460px', width: '100%', textAlign: 'center', boxShadow: '0 10px 40px rgba(0,0,0,0.08)' }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🚫</div>
          <h2 style={{ color: '#d97706', fontSize: '24px', margin: '0 0 12px' }}>Account Suspended</h2>
          <p style={{ color: '#64748b', lineHeight: '1.6', margin: '0 0 32px' }}>
            Your shop <strong>{seller.shopName}</strong> has been suspended by the administrator. Please contact support for more information.
          </p>
          <button
            onClick={() => { localStorage.removeItem('sellerToken'); window.location.href = '/login'; }}
            style={{ background: '#d97706', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '12px', fontSize: '15px', fontWeight: '600', cursor: 'pointer', width: '100%' }}
          >
            Logout
          </button>
        </div>
      </div>
    );
  }

  return children;

};

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          } />

          {/* Fallback to dashboard or login */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

export default App;
