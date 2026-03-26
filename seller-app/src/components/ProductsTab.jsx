import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';
import ProductModal from './ProductModal';
import { useAuth } from '../contexts/AuthContext';

const COLOR_MAP = {
    'White': '#FFFFFF', 'Off White': '#FAF7F0', 'Cream': '#FEF3C7', 'Beige': '#E8D5B7',
    'Black': '#1a1a1a', 'Charcoal': '#374151', 'Grey': '#6B7280', 'Silver': '#D1D5DB',
    'Red': '#EF4444', 'Maroon': '#7F1D1D', 'Dark Red': '#991B1B', 'Pink': '#EC4899',
    'Baby Pink': '#FBCFE8', 'Hot Pink': '#F472B6', 'Orange': '#F97316', 'Peach': '#FDBA74',
    'Yellow': '#EAB308', 'Gold': '#D97706', 'Mustard': '#CA8A04', 'Green': '#22C55E',
    'Olive': '#65A30D', 'Dark Green': '#15803D', 'Teal': '#0D9488', 'Mint': '#A7F3D0',
    'Cyan': '#06B6D4', 'Sky Blue': '#38BDF8', 'Blue': '#3B82F6', 'Navy': '#1E3A8A',
    'Royal Blue': '#2563EB', 'Purple': '#A855F7', 'Lavender': '#C4B5FD', 'Violet': '#7C3AED',
    'Brown': '#92400E', 'Tan': '#B45309', 'Copper': '#B87333',
};

const Badge = ({ label, color = '#4f46e5', bg = '#e0e7ff' }) => (
    <span style={{
        display: 'inline-block', padding: '2px 10px', borderRadius: 999,
        fontSize: 11, fontWeight: 700, background: bg, color, lineHeight: '20px'
    }}>{label}</span>
);

const DetailRow = ({ icon, label, value }) => {
    if (!value && value !== 0) return null;
    const display = Array.isArray(value) ? value.join(', ') : value;
    if (!display && display !== 0) return null;
    return (
        <div style={{ display: 'flex', gap: 6, alignItems: 'flex-start', fontSize: 13 }}>
            <span style={{ minWidth: 18, textAlign: 'center' }}>{icon}</span>
            <span style={{ color: '#64748b', minWidth: 100, flexShrink: 0 }}>{label}:</span>
            <span style={{ color: '#1e293b', fontWeight: 500, flexShrink: 1 }}>{String(display)}</span>
        </div>
    );
};

const ProductsTab = () => {
    const { seller } = useAuth();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editProduct, setEditProduct] = useState(null);
    const [activeTab, setActiveTab] = useState('All Products');
    const [expandedId, setExpandedId] = useState(null);
    const [activeImageIdx, setActiveImageIdx] = useState({});

    useEffect(() => {
        if (seller?._id) fetchProducts();
    }, [seller?._id]);

    const fetchProducts = async () => {
        if (!seller?._id) return;
        try {
            const res = await api.get(`/products?sellerId=${seller._id}&limit=200`);
            if (res.data.success) setProducts(res.data.data);
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
                if (expandedId === productId) setExpandedId(null);
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete product');
        }
    };

    const toggleExpand = (id) => {
        setExpandedId(prev => (prev === id ? null : id));
    };

    const filteredProducts = activeTab === 'All Products'
        ? products
        : products.filter(p => p.stock === 0);

    return (
        <div className="products-tab">
            {/* Header */}
            <div className="section-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
                <div>
                    <h2>Product Catalog</h2>
                    <p>Manage the items available in your shop</p>
                </div>
                <button
                    className="btn-primary"
                    onClick={() => setShowAddModal(true)}
                    style={{ padding: '10px 20px', borderRadius: 8 }}
                >
                    + Add New Product
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', gap: 8, paddingBottom: 16, marginBottom: 16, borderBottom: '1px solid #e2e8f0' }}>
                {['All Products', 'Out of Stock'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            padding: '8px 16px', borderRadius: 20, fontSize: 14, fontWeight: 600, border: 'none', cursor: 'pointer',
                            background: activeTab === tab ? '#1e293b' : '#f1f5f9',
                            color: activeTab === tab ? '#fff' : '#64748b'
                        }}
                    >
                        {tab} ({tab === 'All Products' ? products.length : products.filter(p => p.stock === 0).length})
                    </button>
                ))}
            </div>

            {/* Content */}
            {loading ? (
                <div className="loading"><div className="spinner" style={{ borderTopColor: '#4f46e5' }}></div></div>
            ) : products.length === 0 ? (
                <div className="temp-placeholder">
                    <span style={{ fontSize: 48, margin: '0 0 16px', display: 'block' }}>👕</span>
                    <h3>No products listed</h3>
                    <p>Start adding products to your shop so customers can buy from you.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {filteredProducts.map(product => {
                        const isExpanded = expandedId === product._id;
                        const imgIdx = activeImageIdx[product._id] || 0;
                        const images = product.images || [];
                        const currentImg = images[imgIdx] || images[0];

                        const discount = product.mrpPrice && product.sellingPrice && product.mrpPrice > product.sellingPrice
                            ? Math.round(((product.mrpPrice - product.sellingPrice) / product.mrpPrice) * 100)
                            : null;

                        return (
                            <div key={product._id} style={{
                                background: 'white', borderRadius: 14, border: `1.5px solid ${isExpanded ? '#c7d2fe' : '#e2e8f0'}`,
                                overflow: 'hidden', boxShadow: isExpanded ? '0 4px 20px rgba(99,102,241,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
                                transition: 'all 0.2s'
                            }}>

                                {/* ── Summary Row (always visible) ── */}
                                <div
                                    onClick={() => toggleExpand(product._id)}
                                    style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', cursor: 'pointer', flexWrap: 'wrap' }}
                                >
                                    {/* Image */}
                                    <div style={{ position: 'relative', flexShrink: 0 }}>
                                        <img
                                            src={getImageUrl(images[0])}
                                            alt={product.name}
                                            style={{ width: 64, height: 64, borderRadius: 10, objectFit: 'cover', border: '1.5px solid #e2e8f0' }}
                                            onError={e => e.target.style.display = 'none'}
                                        />
                                        {images.length > 1 && (
                                            <span style={{ position: 'absolute', bottom: 2, right: 2, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: 9, borderRadius: 4, padding: '1px 4px', fontWeight: 700 }}>
                                                +{images.length - 1}
                                            </span>
                                        )}
                                    </div>

                                    {/* Name + meta */}
                                    <div style={{ flex: 1, minWidth: 140 }}>
                                        <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 15 }}>{product.name}</div>
                                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                                            {[product.brand, product.category?.name, product.gender].filter(Boolean).join(' · ')}
                                        </div>
                                        {product.productCode && (
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>SKU: {product.productCode}</div>
                                        )}
                                    </div>

                                    {/* Price */}
                                    <div style={{ textAlign: 'right', minWidth: 90 }}>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: '#1e293b' }}>₹{product.sellingPrice || 0}</div>
                                        {product.mrpPrice && product.mrpPrice > product.sellingPrice && (
                                            <div style={{ fontSize: 12, color: '#94a3b8', textDecoration: 'line-through' }}>₹{product.mrpPrice}</div>
                                        )}
                                        {discount && <Badge label={`${discount}% OFF`} color="#dc2626" bg="#fee2e2" />}
                                    </div>

                                    {/* Stock */}
                                    <div style={{ minWidth: 60, textAlign: 'center' }}>
                                        <div style={{ fontWeight: 700, fontSize: 16, color: product.stock < 10 ? '#ef4444' : '#10b981' }}>{product.stock}</div>
                                        <div style={{ fontSize: 11, color: '#94a3b8' }}>in stock</div>
                                    </div>

                                    {/* Status toggle */}
                                    <button
                                        onClick={e => { e.stopPropagation(); toggleStatus(product._id); }}
                                        title={product.isActive ? 'Click to deactivate' : 'Click to activate'}
                                        style={{
                                            padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer',
                                            background: product.isActive ? '#dcfce7' : '#f1f5f9',
                                            color: product.isActive ? '#16a34a' : '#64748b'
                                        }}
                                    >
                                        {product.isActive ? '🟢 Active' : '⚪ Inactive'}
                                    </button>

                                    {/* Actions */}
                                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                                        <button onClick={() => setEditProduct(product)} style={{ background: '#e0e7ff', color: '#4f46e5', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Edit</button>
                                        <button onClick={() => deleteProduct(product._id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>Delete</button>
                                    </div>

                                    {/* Expand chevron */}
                                    <span style={{ fontSize: 18, color: '#94a3b8', transition: 'transform 0.2s', transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', flexShrink: 0 }}>⌄</span>
                                </div>

                                {/* ── Expanded Detail Panel ── */}
                                {isExpanded && (
                                    <div style={{ borderTop: '1.5px solid #f1f5f9', padding: '20px 20px 24px', background: '#fafbff' }}>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 24 }}>

                                            {/* Left: Image Gallery */}
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>📸 Product Images</div>
                                                {images.length > 0 ? (
                                                    <>
                                                        <img
                                                            src={getImageUrl(currentImg)}
                                                            alt={product.name}
                                                            style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc' }}
                                                            onError={e => e.target.style.display = 'none'}
                                                        />
                                                        {images.length > 1 && (
                                                            <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
                                                                {images.map((img, i) => (
                                                                    <img
                                                                        key={i}
                                                                        src={getImageUrl(img)}
                                                                        alt={`${product.name} ${i + 1}`}
                                                                        onClick={() => setActiveImageIdx(prev => ({ ...prev, [product._id]: i }))}
                                                                        style={{
                                                                            width: 44, height: 44, objectFit: 'cover', borderRadius: 6,
                                                                            border: `2px solid ${imgIdx === i ? '#6366f1' : '#e2e8f0'}`,
                                                                            cursor: 'pointer', transition: 'border-color 0.15s'
                                                                        }}
                                                                        onError={e => e.target.style.display = 'none'}
                                                                    />
                                                                ))}
                                                            </div>
                                                        )}
                                                    </>
                                                ) : (
                                                    <div style={{ textAlign: 'center', color: '#94a3b8', padding: '20px 0', fontSize: 13 }}>No images</div>
                                                )}
                                            </div>

                                            {/* Middle: Core Details */}
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>📋 Product Details</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                                    <DetailRow icon="🏷️" label="Name" value={product.name} />
                                                    <DetailRow icon="🔖" label="SKU / Code" value={product.productCode} />
                                                    <DetailRow icon="🏢" label="Brand" value={product.brand} />
                                                    <DetailRow icon="👤" label="Gender" value={product.gender} />
                                                    <DetailRow icon="📂" label="Category" value={product.category?.name} />
                                                    <DetailRow icon="📁" label="Subcategory" value={
                                                        Array.isArray(product.subcategory)
                                                            ? product.subcategory.map(s => s?.name || s).filter(Boolean)
                                                            : undefined
                                                    } />
                                                    <DetailRow icon="📝" label="Description" value={product.description} />
                                                </div>
                                            </div>

                                            {/* Right: Fabric & Style */}
                                            <div>
                                                <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 10 }}>🧵 Fabric & Style</div>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                                                    <DetailRow icon="🧶" label="Fabric" value={product.fabric} />
                                                    <DetailRow icon="🎨" label="Pattern" value={product.pattern} />
                                                    <DetailRow icon="👗" label="Fit" value={product.fit} />
                                                    <DetailRow icon="💪" label="Sleeve" value={product.sleeve} />
                                                    <DetailRow icon="👕" label="Neck" value={product.neck} />
                                                    <DetailRow icon="🎉" label="Occasion" value={product.occasion} />
                                                </div>

                                                {/* Sizes */}
                                                {product.sizes?.length > 0 && (
                                                    <div style={{ marginBottom: 12 }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>📐 Available Sizes</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                                                            {product.sizes.map(s => (
                                                                <span key={s} style={{ padding: '3px 10px', background: '#e0e7ff', borderRadius: 6, fontSize: 12, fontWeight: 600, color: '#4f46e5' }}>{s}</span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Colors */}
                                                {product.colors?.length > 0 && (
                                                    <div style={{ marginBottom: 12 }}>
                                                        <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 6 }}>🎨 Available Colors</div>
                                                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                            {product.colors.map(c => (
                                                                <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px 3px 7px', background: '#f1f5f9', borderRadius: 999, fontSize: 12, fontWeight: 600, color: '#374151', border: '1px solid #e2e8f0' }}>
                                                                    <span style={{ width: 12, height: 12, borderRadius: '50%', background: COLOR_MAP[c] || '#ddd', border: '1px solid rgba(0,0,0,0.15)', flexShrink: 0 }} />
                                                                    {c}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Bottom: Pricing, Return Policy, Tags */}
                                        <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>

                                            {/* Pricing */}
                                            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', border: '1px solid #bbf7d0' }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#166534', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>💰 Pricing</div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                    <span style={{ color: '#64748b' }}>MRP</span>
                                                    <span style={{ fontWeight: 600, color: '#374151' }}>₹{product.mrpPrice || '—'}</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
                                                    <span style={{ color: '#64748b' }}>Selling Price</span>
                                                    <span style={{ fontWeight: 700, color: '#16a34a', fontSize: 15 }}>₹{product.sellingPrice || 0}</span>
                                                </div>
                                                {discount && (
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                                                        <span style={{ color: '#64748b' }}>Discount</span>
                                                        <span style={{ fontWeight: 700, color: '#dc2626' }}>{discount}% off</span>
                                                    </div>
                                                )}
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, borderTop: '1px solid #86efac', paddingTop: 6, marginTop: 4 }}>
                                                    <span style={{ color: '#64748b' }}>Stock</span>
                                                    <span style={{ fontWeight: 700, color: product.stock < 10 ? '#ef4444' : '#16a34a' }}>{product.stock} units</span>
                                                </div>
                                            </div>

                                            {/* Return Policy */}
                                            <div style={{ background: '#fffbeb', borderRadius: 10, padding: '14px 16px', border: '1px solid #fde68a' }}>
                                                <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>↩️ Return Policy</div>
                                                <div style={{ fontSize: 14, fontWeight: 600, color: product.returnPolicy === 'No Returns' ? '#dc2626' : '#059669' }}>
                                                    {product.returnPolicy || 'No Returns'}
                                                </div>
                                            </div>

                                            {/* Tags */}
                                            {(product.featured || product.trending || product.newArrival || product.bestSeller) && (
                                                <div style={{ background: '#f5f3ff', borderRadius: 10, padding: '14px 16px', border: '1px solid #c4b5fd' }}>
                                                    <div style={{ fontSize: 11, fontWeight: 700, color: '#5b21b6', textTransform: 'uppercase', letterSpacing: '0.4px', marginBottom: 8 }}>🏷️ Tags</div>
                                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                                        {product.featured && <Badge label="⭐ Featured" color="#7c3aed" bg="#ede9fe" />}
                                                        {product.trending && <Badge label="🔥 Trending" color="#c2410c" bg="#ffedd5" />}
                                                        {product.newArrival && <Badge label="🆕 New Arrival" color="#0369a1" bg="#e0f2fe" />}
                                                        {product.bestSeller && <Badge label="🏆 Best Seller" color="#b45309" bg="#fef3c7" />}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
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
