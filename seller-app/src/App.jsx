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
      <div className="pending-approval-screen">
        <h2>Account Pending Approval</h2>
        <p>Your shop ({seller.shopName}) is currently under review by the administrator.</p>
        <p>You will be able to access the dashboard once approved.</p>
        <button onClick={() => {localStorage.removeItem('sellerToken'); window.location.reload();}}>Logout</button>
      </div>
    );
  }

  if (seller.status === 'Suspended') {
    return (
      <div className="pending-approval-screen">
        <h2>Account Suspended</h2>
        <p>Your shop has been suspended by the administrator.</p>
        <p>Please contact support for more information.</p>
        <button onClick={() => {localStorage.removeItem('sellerToken'); window.location.reload();}}>Logout</button>
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
