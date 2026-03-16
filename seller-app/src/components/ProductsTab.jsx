import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';
import ProductModal from './ProductModal';

const ProductsTab = () => {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);

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

    return (
        <div className="products-tab">
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
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

            {loading ? (
                <div className="loading"><div className="spinner" style={{borderTopColor: '#4f46e5'}}></div></div>
            ) : products.length === 0 ? (
                <div className="temp-placeholder">
                    <span style={{ fontSize: '48px', margin: '0 0 16px', display: 'block' }}>👕</span>
                    <h3>No products listed</h3>
                    <p>Start adding products to your shop so customers can buy from you.</p>
                </div>
            ) : (
                <div className="table-wrapper" style={{ background: 'white', borderRadius: '12px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Image</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Name</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Price</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Stock</th>
                                <th style={{ padding: '16px', fontSize: '13px', color: '#64748b', fontWeight: 600 }}>Status</th>
                            </tr>
                        </thead>
                        <tbody>
                            {products.map(product => (
                                <tr key={product._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <img src={getImageUrl(product.images[0])} alt={product.name} style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover' }} onError={(e) => e.target.style.display = 'none'} />
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ fontWeight: 500, color: '#1e293b' }}>{product.name}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b' }}>{product.category?.name || 'Uncategorized'}</div>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontWeight: 500 }}>₹{product.price}</td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ color: product.stock < 10 ? '#ef4444' : '#10b981', fontWeight: 600 }}>
                                            {product.stock}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ padding: '4px 8px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, background: product.isActive ? '#dcfce7' : '#f1f5f9', color: product.isActive ? '#16a34a' : '#64748b' }}>
                                            {product.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {showAddModal && (
                <ProductModal 
                    onClose={() => setShowAddModal(false)}
                    onSuccess={() => {
                        setShowAddModal(false);
                        fetchProducts();
                    }}
                />
            )}
        </div>
    );
};

export default ProductsTab;
