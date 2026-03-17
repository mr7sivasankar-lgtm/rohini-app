import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const TopRatedShops = () => {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);

    const fetchSellers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/sellers/admin/all');
            if (response.data.success) {
                setSellers(response.data.data.filter(s => s.status === 'Approved'));
            }
        } catch (error) {
            console.error('Error fetching sellers:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSellers();
    }, []);

    const toggleFeatured = async (sellerId, currentStatus) => {
        try {
            const resp = await api.put(`/admin/sellers/${sellerId}/featured`, { is_featured: !currentStatus });
            if (resp.data.success) {
                // Update local state to reflect change instantly
                setSellers(prev => prev.map(s => 
                    s._id === sellerId ? { ...s, is_featured: !currentStatus } : s
                ));
            }
        } catch (error) {
            console.error('Error toggling featured status:', error);
            alert('Failed to update featured status.');
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading shops...</div>;

    // Separate sellers into categories for clear display
    const featuredShops = sellers.filter(s => s.is_featured);
    const regularShops = sellers.filter(s => !s.is_featured);

    // Sort regular shops by highest rating + reviews to show who is organically top-rated
    regularShops.sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.numReviews - a.numReviews;
    });

    return (
        <div>
            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1>⭐ Top Rated Shops Configuration</h1>
                <p>Manually promote shops to appear in the Customer App Top Picks slider.</p>
            </div>

            <div className="card" style={{ marginBottom: '24px', background: '#f8fafc', borderLeft: '4px solid #3b82f6' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>How it Works</h3>
                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
                    The Customer App slider displays up to <strong>6 shops total</strong>. <br/>
                    <strong>Priority 1:</strong> Shops with "Featured" turned ON will ALWAYS be displayed first, ignoring their rating.<br/>
                    <strong>Priority 2:</strong> Any remaining slots will be filled automatically by shops with a <b>Rating ≥ 4.0</b> and <b>Reviews ≥ 5</b>.
                </p>
            </div>

            <div className="card">
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Shop Name</th>
                                <th>Rating</th>
                                <th>Total Reviews</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {/* Render Featured First */}
                            {featuredShops.map(shop => (
                                <tr key={shop._id} style={{ background: '#f0fdf4' }}>
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#166534' }}>{shop.shopName}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{shop.ownerName} • {shop.phone}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: '#fbbf24' }}>★</span>
                                            <span style={{ fontWeight: 600 }}>{shop.rating?.toFixed(1) || '0.0'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 500, color: '#475569' }}>{shop.numReviews || 0}</span>
                                    </td>
                                    <td>
                                        <span style={{ display: 'inline-block', padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
                                            Top Rated (Featured)
                                        </span>
                                    </td>
                                    <td>
                                        <button 
                                            onClick={() => toggleFeatured(shop._id, shop.is_featured)}
                                            style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                                        >
                                            Remove
                                        </button>
                                    </td>
                                </tr>
                            ))}

                            {/* Render Regular Shops below */}
                            {regularShops.map(shop => {
                                const isEligibleAuto = shop.rating >= 4.0 && shop.numReviews >= 5;
                                
                                return (
                                <tr key={shop._id}>
                                    <td>
                                        <div style={{ fontWeight: 500 }}>{shop.shopName}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{shop.ownerName} • {shop.phone}</div>
                                    </td>
                                    <td>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <span style={{ color: '#fbbf24' }}>★</span>
                                            <span style={{ fontWeight: 600, color: shop.rating >= 4.0 ? '#16a34a' : '#374151' }}>{shop.rating?.toFixed(1) || '0.0'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span style={{ fontWeight: 500, color: '#475569' }}>{shop.numReviews || 0}</span>
                                    </td>
                                    <td>
                                        {isEligibleAuto ? (
                                             <span style={{ display: 'inline-block', padding: '4px 10px', background: '#f3f4f6', color: '#4b5563', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>
                                                Top Rated (Auto)
                                             </span>
                                        ) : (
                                            <span style={{ display: 'inline-block', padding: '4px 10px', color: '#9ca3af', fontSize: '12px' }}>
                                                Normal
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <button 
                                            onClick={() => toggleFeatured(shop._id, shop.is_featured)}
                                            style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '6px 16px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600, fontSize: '13px' }}
                                        >
                                            Add to Top Rated
                                        </button>
                                    </td>
                                </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TopRatedShops;
