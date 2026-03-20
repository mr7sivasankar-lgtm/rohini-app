import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';
import { isFuzzyMatch } from '../utils/fuzzySearch';

// ─── Status / Coverage UI Helpers ──────────────────────────────────────────

const COVERAGE_CONFIG = {
    'Delivery Available': { bg: '#d1fae5', color: '#065f46', dot: '#10b981' },
    'No Delivery Coverage': { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444' }
};

const CoverageBadge = ({ status }) => {
    if (!status) return <span style={{ color: '#94a3b8', fontSize: 13 }}>Unknown</span>;
    const cfg = COVERAGE_CONFIG[status] || COVERAGE_CONFIG['No Delivery Coverage'];
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: 5,
            padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
            background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap'
        }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot, flexShrink: 0 }} />
            {status}
        </span>
    );
};

const STATUS_CONFIG = {
    'Pending': { bg: '#fef3c7', color: '#d97706' },
    'Approved': { bg: '#dcfce7', color: '#166534' },
    'Rejected': { bg: '#fee2e2', color: '#991b1b' },
    'On Hold': { bg: '#e0e7ff', color: '#4338ca' },
    'Deactivated': { bg: '#f1f5f9', color: '#475569' },
    'Suspended': { bg: '#fef2f2', color: '#b91c1c' },
};

const StatusBadge = ({ status }) => {
    const s = status || 'Pending';
    const cfg = STATUS_CONFIG[s] || { bg: '#f1f5f9', color: '#64748b' };
    return (
        <span style={{
            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
            background: cfg.bg, color: cfg.color, display: 'inline-block'
        }}>
            {s}
        </span>
    );
};

// ─── Main Component ───────────────────────────────────────────────────────

const Sellers = () => {
    const [sellers, setSellers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterCategory, setFilterCategory] = useState('All');

    // Profile Modal State
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [sellerProducts, setSellerProducts] = useState([]);
    const [loadingProducts, setLoadingProducts] = useState(false);

    useEffect(() => {
        fetchSellers();
    }, []);

    const fetchSellers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/sellers/admin/all');
            if (response.data.success) {
                setSellers(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching sellers:', error);
        } finally {
            setLoading(false);
        }
    };

    const updateSellerStatus = async (e, sellerId, newStatus) => {
        e.stopPropagation(); // prevent opening modal
        
        let reason = '';
        if (['Suspended', 'Deactivated', 'Rejected'].includes(newStatus)) {
            reason = window.prompt(`Please enter the reasoning for marking this seller as ${newStatus}:`);
            if (reason === null) return; // user cancelled
            if (reason.trim() === '') {
                alert('A valid reason is strictly required to perform this action.');
                return;
            }
        } else {
            if (!window.confirm(`Are you sure you want to change this seller to ${newStatus}?`)) return;
        }

        try {
            await api.put(`/sellers/admin/${sellerId}/status`, { status: newStatus, reason: reason.trim() });
            fetchSellers();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to update seller status');
        }
    };

    const handleDeleteSeller = async (e, sellerId) => {
        e.stopPropagation();
        
        const reason = window.prompt('⚠️ DANGER: You are permanently deleting this seller. Please enter a reason required for the deletion log:');
        if (reason === null) return;
        if (reason.trim() === '') {
            alert('A valid reason is required before allowing a hard delete.');
            return;
        }

        try {
            const res = await api.delete(`/sellers/admin/${sellerId}`, { data: { reason: reason.trim() } });
            if (res.data.success) {
                fetchSellers();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to delete seller');
        }
    };

    const handleSellerClick = async (seller) => {
        setSelectedSeller(seller);
        setLoadingProducts(true);
        setSellerProducts([]);
        try {
            const response = await api.get(`/products?limit=100&sellerId=${seller._id}`);
            if (response.data.success) {
                setSellerProducts(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching seller products:', error);
        } finally {
            setLoadingProducts(false);
        }
    };

    const closeModal = () => {
        setSelectedSeller(null);
        setSellerProducts([]);
    };

    const getMapLink = (seller) => {
        if (seller.location?.coordinates) {
            const [lng, lat] = seller.location.coordinates;
            return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
        }
        return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(seller.shopAddress || '')}`;
    };

    // Filter Logic
    const filteredSellers = sellers.filter(seller => {
        // Dropdown Filter Category Check
        if (filterCategory === 'Pending' && seller.status !== 'Pending') return false;
        if (filterCategory === 'Approved' && seller.status !== 'Approved') return false;
        if (filterCategory === 'Rejected' && seller.status !== 'Rejected') return false;
        if (filterCategory === 'On Hold' && seller.status !== 'On Hold') return false;
        if (filterCategory === 'Suspended' && seller.status !== 'Suspended') return false;
        if (filterCategory === 'Deactivated' && seller.status !== 'Deactivated') return false;
        if (filterCategory === 'No Delivery Coverage' && seller.coverageStatus !== 'No Delivery Coverage') return false;

        // Search Query Check
        if (!searchQuery.trim()) return true;
        const q = searchQuery;
        const matchShop = isFuzzyMatch(q, seller.shopName);
        const matchOwner = isFuzzyMatch(q, seller.ownerName);
        const matchPhone = seller.phone?.toLowerCase().includes(q.toLowerCase().trim());
        const matchEmail = isFuzzyMatch(q, seller.email);
        const matchCity = seller.city?.toLowerCase().includes(q.toLowerCase().trim());
        const matchPincode = seller.pincode?.includes(q.trim());
        return matchShop || matchOwner || matchPhone || matchEmail || matchCity || matchPincode;
    });

    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 200, color: '#64748b' }}>
            Loading Sellers Data...
        </div>
    );

    return (
        <div style={{ maxWidth: 1400 }}>
            {/* ── Header ──────────────────────────────────────────────────────── */}
            <div style={{ marginBottom: 24 }}>
                <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800, color: '#0f172a' }}>Sellers Management</h1>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 14 }}>Review seller registrations and monitor delivery coverage</p>
            </div>

            {/* ── Search & Filter Row ────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, marginBottom: 20, alignItems: 'center' }}>
                <div style={{ position: 'relative', width: '320px' }}>
                    <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16, color: '#94a3b8' }}>🔍</span>
                    <input
                        type="text"
                        placeholder="Search Shop, Owner, Phone, City..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        style={{
                            width: '100%', padding: '10px 14px 10px 40px', border: '1px solid #e2e8f0',
                            borderRadius: 10, fontSize: 14, outline: 'none', background: 'white'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                    {['All', 'Pending', 'Approved', 'Rejected', 'On Hold', 'Suspended', 'Deactivated', 'No Delivery Coverage'].map(filter => (
                        <button
                            key={filter}
                            onClick={() => setFilterCategory(filter)}
                            style={{
                                padding: '8px 16px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                                cursor: 'pointer', transition: 'all 0.2s', whiteSpace: 'nowrap',
                                background: filterCategory === filter ? '#1e293b' : 'white',
                                color: filterCategory === filter ? 'white' : '#475569',
                                border: filterCategory === filter ? '1px solid #1e293b' : '1px solid #cbd5e1'
                            }}
                        >
                            {filter}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Sellers Table ───────────────────────────────────────────────── */}
            <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e2e8f0', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Sellers ({filteredSellers.length})</h3>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                <th style={th}>Shop Info</th>
                                <th style={th}>Owner Details</th>
                                <th style={th}>Service Area</th>
                                <th style={th}>Delivery Coverage</th>
                                <th style={th}>Location</th>
                                <th style={th}>Status</th>
                                <th style={th}>Joined On</th>
                                <th style={th}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSellers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
                                        No sellers match your current filters.
                                    </td>
                                </tr>
                            ) : (
                                filteredSellers.map(seller => (
                                    <tr key={seller._id}
                                        style={{ borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'white'}
                                    >
                                        <td style={td}>
                                            <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{seller.shopName}</div>
                                            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{seller.gstin || seller.gstNumber || 'No GST'}</div>
                                        </td>
                                        <td style={td}>
                                            <div style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{seller.ownerName}</div>
                                            <div style={{ fontSize: 12, color: '#64748b' }}>{seller.phone}</div>
                                        </td>
                                        <td style={td}>
                                            {seller.city ? (
                                                <>
                                                    <div style={{ fontWeight: 600, color: '#334155', fontSize: 13 }}>{seller.city}</div>
                                                    <div style={{ fontSize: 12, color: '#64748b' }}>{seller.state || ''} {seller.pincode ? `(${seller.pincode})` : ''}</div>
                                                </>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: 12, fontStyle: 'italic' }}>Not specified</span>
                                            )}
                                        </td>
                                        <td style={td}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-start' }}>
                                                <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>
                                                    🛵 {seller.dpCount || 0} Partners
                                                </div>
                                                <CoverageBadge status={seller.coverageStatus} />
                                            </div>
                                        </td>
                                        <td style={td}>
                                            <div style={{ fontSize: 12, color: '#475569', maxWidth: 160, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 6 }}>
                                                {seller.shopAddress}
                                            </div>
                                            <a href={getMapLink(seller)} target="_blank" rel="noreferrer"
                                               style={{ fontSize: 12, color: '#2563eb', textDecoration: 'none', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                                                🗺️ View Map ↗
                                            </a>
                                        </td>
                                        <td style={td}>
                                            <StatusBadge status={seller.status} />
                                            {seller.statusReason && ['Suspended', 'Deactivated', 'Rejected'].includes(seller.status) && (
                                                <div style={{ fontSize: 11, color: '#dc2626', marginTop: 6, fontStyle: 'italic', maxWidth: 120, wordWrap: 'break-word', lineHeight: 1.2 }}>
                                                    <span style={{fontWeight: 600}}>Reason:</span> {seller.statusReason}
                                                </div>
                                            )}
                                        </td>
                                        <td style={td}>
                                            <div style={{ fontSize: 13, color: '#475569', fontWeight: 600 }}>
                                                {new Date(seller.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                                                {new Date(seller.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        </td>
                                        <td style={td}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                <button onClick={() => handleSellerClick(seller)} style={btn('#f1f5f9', '#475569')} title="View Profile">📄 View</button>
                                                
                                                <select
                                                    defaultValue=""
                                                    onChange={(e) => {
                                                        if(e.target.value) updateSellerStatus(e, seller._id, e.target.value);
                                                        e.target.value = ""; // reset dropdown text
                                                    }}
                                                    onClick={(e) => e.stopPropagation()}
                                                    style={{
                                                        padding: '6px 12px', borderRadius: 6, border: '1px solid #cbd5e1', 
                                                        fontSize: 13, fontWeight: 600, color: '#334155', background: 'white',
                                                        cursor: 'pointer', outline: 'none', height: 32
                                                    }}
                                                >
                                                    <option value="" disabled>Actions ▾</option>
                                                    {seller.status !== 'Approved' && <option value="Approved">Activate</option>}
                                                    {seller.status !== 'Suspended' && <option value="Suspended">Suspend</option>}
                                                    {seller.status !== 'On Hold' && <option value="On Hold">Hold</option>}
                                                    {seller.status !== 'Rejected' && <option value="Rejected">Reject</option>}
                                                </select>

                                                <button 
                                                    onClick={(e) => handleDeleteSeller(e, seller._id)} 
                                                    style={{...btn('#fee2e2', '#991b1b'), padding: '6px 10px', height: 32}} 
                                                    title="Delete Seller"
                                                >
                                                    🗑️
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* ── Seller Profile Modal ──────────────────────────────────────── */}
            {selectedSeller && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 9999,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20
                }} onClick={closeModal}>
                    <div style={{
                        background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 840,
                        maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1)'
                    }} onClick={e => e.stopPropagation()}>
                        
                        {/* Modal Header */}
                        <div style={{ padding: 24, borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
                            <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                                <div style={{ width: 64, height: 64, background: '#f8fafc', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, border: '1px solid #e2e8f0' }}>
                                    {selectedSeller.shopLogo ? <img src={getImageUrl(selectedSeller.shopLogo)} alt="logo" style={{width:'100%',height:'100%',objectFit:'cover',borderRadius:12}} /> : '🏪'}
                                </div>
                                <div>
                                    <h2 style={{ margin: 0, fontSize: 22, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 10 }}>
                                        {selectedSeller.shopName}
                                        <StatusBadge status={selectedSeller.status} />
                                    </h2>
                                    <div style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
                                        Owner: <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedSeller.ownerName}</span>
                                    </div>
                                </div>
                            </div>
                            <button onClick={closeModal} style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b' }}>
                                ✕
                            </button>
                        </div>

                        {/* Modal Content */}
                        <div style={{ padding: 24 }}>
                            {/* Summary Cards */}
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 32 }}>
                                <div style={{ background: '#f8fafc', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0' }}>
                                    <div style={{ fontSize: 12, color: '#64748b', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Contact Info</div>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14 }}>📞 {selectedSeller.phone}</div>
                                    <div style={{ fontWeight: 600, color: '#1e293b', fontSize: 14, marginTop: 6, wordBreak: 'break-all' }}>✉️ {selectedSeller.email || 'N/A'}</div>
                                </div>
                                <div style={{ background: '#f0fdf4', padding: 16, borderRadius: 12, border: '1px solid #bbf7d0' }}>
                                    <div style={{ fontSize: 12, color: '#166534', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Delivery Coverage</div>
                                    <div style={{ fontWeight: 700, color: '#14532d', fontSize: 18, marginBottom: 4 }}>{selectedSeller.dpCount || 0} Partners</div>
                                    <CoverageBadge status={selectedSeller.coverageStatus} />
                                </div>
                                <div style={{ background: '#eff6ff', padding: 16, borderRadius: 12, border: '1px solid #bfdbfe' }}>
                                    <div style={{ fontSize: 12, color: '#1e40af', textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>Location / Area</div>
                                    <div style={{ fontWeight: 600, color: '#1e3a8a', fontSize: 14 }}>{selectedSeller.city || 'No City'} {selectedSeller.pincode && `(${selectedSeller.pincode})`}</div>
                                    <div style={{ color: '#3b82f6', fontSize: 12, marginTop: 6 }}>{selectedSeller.shopAddress}</div>
                                </div>
                            </div>

                            {/* Products Section */}
                            <div>
                                <h3 style={{ fontSize: 18, color: '#0f172a', marginBottom: 16, fontWeight: 700 }}>
                                    📦 Catalog Products ({sellerProducts.length})
                                </h3>
                                {loadingProducts ? (
                                    <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>Loading products...</div>
                                ) : sellerProducts.length === 0 ? (
                                    <div style={{ padding: 40, textAlign: 'center', background: '#f8fafc', borderRadius: 12, border: '1px dashed #cbd5e1', color: '#64748b' }}>
                                        No products uploaded yet.
                                    </div>
                                ) : (
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                                        {sellerProducts.map(prod => (
                                            <div key={prod._id} style={{ border: '1px solid #e2e8f0', borderRadius: 12, overflow: 'hidden', background: '#fff' }}>
                                                <div style={{ height: 140, background: '#f1f5f9', position: 'relative' }}>
                                                    {prod.images?.[0] ? (
                                                        <img src={getImageUrl(prod.images[0])} alt={prod.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                                    ) : (
                                                        <div style={{width:'100%',height:'100%',display:'flex',justifyContent:'center',alignItems:'center',color:'#94a3b8'}}>No Image</div>
                                                    )}
                                                </div>
                                                <div style={{ padding: 12 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 13, color: '#1e293b', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                        <span style={{ fontWeight: 700, color: '#047857', fontSize: 13 }}>₹{prod.price}</span>
                                                        <span style={{ fontSize: 11, fontWeight: 700, color: prod.stock > 0 ? '#3b82f6' : '#dc2626', background: prod.stock > 0 ? '#eff6ff' : '#fef2f2', padding: '2px 6px', borderRadius: 10 }}>
                                                            Stock: {prod.stock}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// ─── Shared Styles ──────────────────────────────────────────────────────────

const th = { padding: '14px 20px', fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' };
const td = { padding: '16px 20px', verticalAlign: 'middle' };
const btn = (bg, color) => ({ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 700, background: bg, color: color, border: 'none', cursor: 'pointer', transition: 'filter 0.15s' });

export default Sellers;
