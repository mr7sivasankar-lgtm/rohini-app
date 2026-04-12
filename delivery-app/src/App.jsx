import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from './contexts/AuthContext';
import SplashScreen from './components/SplashScreen/SplashScreen';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import OrderDetail from './pages/OrderDetail';
import Profile from './pages/Profile';
import History from './pages/History';
import Wallet from './pages/Wallet';

import BottomNav from './components/BottomNav';
import OrderBroadcastOverlay from './components/OrderBroadcastOverlay';

const PrivateRoute = ({ children }) => {
    const { partner, loading } = useAuth();
    if (loading) return <div className="splash"><div className="spinner"></div></div>;
    return partner ? (
        <>
            {children}
            <BottomNav />
            <OrderBroadcastOverlay />
        </>
    ) : <Navigate to="/login" replace />;
};

export default function App() {
    const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashShown'));

    return (
        <>
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
            <BrowserRouter>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
                    <Route path="/order/:id" element={<PrivateRoute><OrderDetail /></PrivateRoute>} />
                    <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                    <Route path="/history" element={<PrivateRoute><History /></PrivateRoute>} />
                    <Route path="/wallet" element={<PrivateRoute><Wallet /></PrivateRoute>} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </BrowserRouter>
        </>
    );
}
