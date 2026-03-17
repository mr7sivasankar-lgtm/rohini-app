import React, { useState, useEffect } from 'react';
import api from '../utils/api';

const TopRatedShops = () => {
    const [sellers, setSellers] = useState([]);
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);
    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerImage, setBannerImage] = useState(null);
    const [uploadingBanner, setUploadingBanner] = useState(false);

    const fetchSellersAndBanners = async () => {
        try {
            setLoading(true);
            const [sellersRes, bannersRes] = await Promise.all([
                api.get('/sellers/admin/all'),
                api.get('/banners')
            ]);
            
            if (sellersRes.data.success) {
                setSellers(sellersRes.data.data.filter(s => s.status === 'Approved'));
            }
            if (bannersRes.data.success) {
                setBanners(bannersRes.data.data);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchSellersAndBanners();
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

    const handleUploadBanner = async (e) => {
        e.preventDefault();
        if (!bannerImage) return alert('Please select an image first.');
        
        const formData = new FormData();
        formData.append('image', bannerImage);
        if (bannerTitle) formData.append('title', bannerTitle);

        try {
            setUploadingBanner(true);
            const res = await api.post('/banners', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                setBanners(prev => [res.data.data, ...prev]);
                setBannerImage(null);
                setBannerTitle('');
                e.target.reset();
            }
        } catch (error) {
            console.error('Error uploading banner:', error);
            alert('Failed to upload banner');
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleDeleteBanner = async (id) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;
        try {
            const res = await api.delete(`/banners/${id}`);
            if (res.data.success) {
                setBanners(prev => prev.filter(b => b._id !== id));
            }
        } catch (error) {
            console.error('Error deleting banner:', error);
            alert('Failed to delete banner');
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

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
                <h1>⭐ Top Rated Shops & Promotions</h1>
                <p>Manage Customer App Top Picks slider and Add Promotional Banners.</p>
            </div>

            {/* Promotion Banners Section */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>🖼️ Promotion Banners (Top Picks Slide View)</h3>
                
                <form onSubmit={handleUploadBanner} style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Banner Title (Optional)</label>
                        <input 
                            type="text" 
                            className="input"
                            placeholder="e.g. Diwali Sale" 
                            value={bannerTitle}
                            onChange={e => setBannerTitle(e.target.value)}
                        />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Banner Image (Required)</label>
                        <input 
                            type="file" 
                            accept="image/*"
                            className="input"
                            onChange={e => setBannerImage(e.target.files[0])}
                            required
                        />
                    </div>
                    <button type="submit" disabled={uploadingBanner} className="btn btn-primary" style={{ height: '42px', padding: '0 24px' }}>
                        {uploadingBanner ? 'Uploading...' : '+ Add Banner'}
                    </button>
                </form>

                {banners.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '16px' }}>
                        {banners.map(banner => (
                            <div key={banner._id} style={{ position: 'relative', borderRadius: '12px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff' }}>
                                <img src={api.defaults.baseURL.replace('/api', '') + banner.image} alt="Banner" style={{ width: '100%', height: '120px', objectFit: 'cover', display: 'block' }} />
                                <div style={{ padding: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontWeight: 600, fontSize: '14px', color: '#334155' }}>{banner.title || 'Untitled Banner'}</span>
                                    <button onClick={() => handleDeleteBanner(banner._id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}>Delete</button>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '24px', color: '#94a3b8', fontSize: '14px', background: '#f8fafc', borderRadius: '8px' }}>
                        No promotional banners added yet.
                    </div>
                )}
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
                                        <select 
                                            value="Select Action"
                                            onChange={(e) => {
                                                if (e.target.value === 'remove') {
                                                    toggleFeatured(shop._id, shop.is_featured);
                                                }
                                                e.target.value = "Select Action";
                                            }}
                                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontWeight: 500, fontSize: '13px', color: '#334155', width: '100%' }}
                                        >
                                            <option value="Select Action" disabled hidden>Select Action</option>
                                            <option value="remove">Remove ( can Remove from Top Rated )</option>
                                        </select>
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
                                        <select 
                                            value="Select Action"
                                            onChange={(e) => {
                                                if (e.target.value === 'add') {
                                                    toggleFeatured(shop._id, shop.is_featured);
                                                }
                                                e.target.value = "Select Action";
                                            }}
                                            style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontWeight: 500, fontSize: '13px', color: '#334155', width: '100%' }}
                                        >
                                            <option value="Select Action" disabled hidden>Select Action</option>
                                            <option value="add">Add to Top Rated (Add to Top Rated)</option>
                                        </select>
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
