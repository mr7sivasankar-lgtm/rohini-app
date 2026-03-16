import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import OrdersTab from '../../components/OrdersTab';
import ProductsTab from '../../components/ProductsTab';
import ProfileTab from '../../components/ProfileTab';
import './Dashboard.css';

const Dashboard = () => {
    const { seller, logout } = useAuth();
    const [activeTab, setActiveTab] = useState('orders');

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
                        {activeTab === 'orders' ? 'Order Management' : 
                         activeTab === 'products' ? 'Product Catalog' : 'Shop Profile'}
                    </h1>
                </header>

                <div className="dashboard-content">
                    {activeTab === 'orders' && <OrdersTab />}
                    {activeTab === 'products' && <ProductsTab />}
                    {activeTab === 'profile' && <ProfileTab seller={seller} />}
                </div>
            </main>
        </div>
    );
};

export default Dashboard;
