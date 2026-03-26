import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import DashboardTab from '../../components/DashboardTab';
import OrdersTab from '../../components/OrdersTab';
import ProductsTab from '../../components/ProductsTab';
import ProfileTab from '../../components/ProfileTab';
import SalesTab from '../../components/SalesTab';
import ReviewsTab from '../../components/ReviewsTab';
import WalletTab from '../../components/WalletTab';
import './Dashboard.css';

const Dashboard = () => {
    const { seller, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('dashboard');

    return (
        <div className="seller-dashboard">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-brand">
                    <span className="brand-icon">🏪</span>
                    <div className="brand-text">
                        <h2>{seller?.shopName}</h2>
                        <span className="seller-badge">Seller Portal</span>
                    </div>
                </div>

                <nav className="sidebar-nav">
                    <button 
                        className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
                        onClick={() => setActiveTab('dashboard')}
                    >
                        📊 Dashboard
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`}
                        onClick={() => setActiveTab('orders')}
                    >
                        📦 Orders
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'products' ? 'active' : ''}`}
                        onClick={() => setActiveTab('products')}
                    >
                        👕 Products
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'sales' ? 'active' : ''}`}
                        onClick={() => setActiveTab('sales')}
                    >
                        📈 Sales & Revenue
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'wallet' ? 'active' : ''}`}
                        onClick={() => setActiveTab('wallet')}
                    >
                        💰 Wallet & Payouts
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'reviews' ? 'active' : ''}`}
                        onClick={() => setActiveTab('reviews')}
                    >
                        ⭐ Reviews
                    </button>
                    <button 
                        className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
                        onClick={() => setActiveTab('profile')}
                    >
                        ⚙️ Shop Profile
                    </button>
                </nav>

                <div className="sidebar-footer">
                    <button className="logout-btn" onClick={logout}>🚪 Logout</button>
                </div>
            </aside>

            {/* Main Content Area */}
            <main className="dashboard-main">
                <header className="dashboard-header">
                    <h1>
                        {activeTab === 'dashboard' ? 'Overview' :
                         activeTab === 'orders' ? 'Order Management' : 
                         activeTab === 'products' ? 'Product Catalog' : 
                         activeTab === 'sales' ? 'Sales Analytics' : 
                         activeTab === 'wallet' ? 'Wallet & Payouts' : 
                         activeTab === 'reviews' ? 'Customer Reviews' : 'Shop Profile'}
                    </h1>
                    <div className="mobile-header-actions">
                        <button className="mobile-logout-btn" onClick={logout} title="Logout">🚪</button>
                    </div>
                </header>

                <div className="dashboard-content">
                    {activeTab === 'dashboard' && <DashboardTab onTabChange={setActiveTab} />}
                    {activeTab === 'orders' && <OrdersTab />}
                    {activeTab === 'products' && <ProductsTab />}
                    {activeTab === 'sales' && <SalesTab />}
                    {activeTab === 'wallet' && <WalletTab />}
                    {activeTab === 'reviews' && <ReviewsTab />}
                    {activeTab === 'profile' && <ProfileTab seller={seller} />}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
