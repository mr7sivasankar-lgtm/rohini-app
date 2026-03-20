import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';
import ProductModal from './ProductModal';

const ProductsTab = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [activeTab, setActiveTab] = useState('All Products');

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            // Fetch products specifically for this logged in seller
            const res = await api.get('/products/seller');
            if (res.data.success) {
                setProducts(res.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch products:', error);
        } finally {
            setLoading(false);
        }
    };

    const toggleStatus = async (productId) => {
        try {
            const res = await api.put(`/products/${productId}/toggle`);
            if (res.data.success) {
                setProducts(products.map(p => p._id === productId ? { ...p, isActive: !p.isActive } : p));
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update product status');
        }
    };

    const deleteProduct = async (productId) => {
        if (!window.confirm('Are you sure you want to delete this product? It will be removed permanently.')) return;
        try {
            const res = await api.delete(`/products/${productId}`);
            if (res.data.success) {
                setProducts(products.filter(p => p._id !== productId));
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete product');
        }
    };

    const filteredProducts = activeTab === 'All Products' 
        ? products 
        : products.filter(p => p.stock === 0);

    return (
        <div className="products-tab">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
                <div>
                    <h2>Product Catalog</h2>
                    <p>Manage the items available in your shop</p>
                </div>
                <button 
                    className="btn-primary" 
                    onClick={() => setShowAddModal(true)}
                    style={{ padding: '10px 20px', borderRadius: '8px' }}
                >
                    + Add New Product
                </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1px solid #e2e8f0' }}>
                {['All Products', 'Out of Stock'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '8px 16px', borderRadius: '20px', fontSize: '14px', fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: activeTab === tab ? '#1e293b' : '#f1f5f9',
                            color: activeTab === tab ? '#fff' : '#64748b'
                        }}
                    >
                        {tab} ({
                            tab === 'All Products' ? products.length : products.filter(p => p.stock === 0).length
                        })
                    </button>
                ))}
            </div>

            {loading ? (
                <div className="loading"><div className="spinner" style={{borderTopColor: '#4f46e5'}}></div></div>
            ) : products.length === 0 ? (
                <div className="temp-placeholder">
                    <span style={{ fontSize: '48px', margin: '0 0 16px', display: 'block' }}>👕</span>
                    <h3>No products listed</h3>
                    <p>Start adding products to your shop so customers can buy from you.</p>
                </div>
            ) : (
                <div className="table-wrapper" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '700px' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Image</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Name</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Price</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Stock</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.map(product => (
                                <tr key={product._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <img src={getImageUrl(product.images[0])} alt={product.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{product.name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{product.category?.name || 'Uncategorized'}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>₹{product.sellingPrice || 0}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ color: product.stock < 10 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <button onClick={() => toggleStatus(product._id)} title={product.isActive ? "Click to deactivate" : "Click to activate"} style={{ padding: '4px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, border: 'none', cursor: 'pointer', background: product.isActive ? '#dcfce7' : '#f1f5f9', color: product.isActive ? '#16a34a' : '#64748b' }}>
                                            {product.isActive ? '🟢 Active' : '⚪ Inactive'}
                                        </button>
                                    </td>
                                    <td style={{ padding: '12px 16px', display: 'flex', gap: '8px' }}>
                                        <button onClick={() => setEditProduct(product)} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Edit</button>
                                        <button onClick={() => deleteProduct(product._id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Delete</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(showAddModal || editProduct) && (
                <ProductModal
                    product={editProduct || null}
                    onClose={() => { setShowAddModal(false); setEditProduct(null); }}
                    onSuccess={() => {
                        setShowAddModal(false);
                        setEditProduct(null);
                        fetchProducts();
                    }}
                />
            )}
        </div>
    );
};

export default ProductsTab;
