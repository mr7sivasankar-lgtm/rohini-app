import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';
import { isFuzzyMatch } from '../utils/fuzzySearch';

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Profile Modal State
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [sellerProducts, setSellerProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
    fetchSellers();
  }, []);

  const fetchSellers = async () => {
    try {
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

  const updateSellerStatus = async (sellerId, newStatus) => {
    if (!window.confirm(`Are you sure you want to mark this seller as ${newStatus}?`)) return;
    
    try {
      await api.put(`/sellers/admin/${sellerId}/status`, { status: newStatus });
      fetchSellers();
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to update seller status');
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

  const filteredSellers = sellers.filter(seller => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery;
    const matchShop = isFuzzyMatch(q, seller.shopName);
    const matchOwner = isFuzzyMatch(q, seller.ownerName);
    const matchPhone = seller.phone?.toLowerCase().includes(q.toLowerCase().trim());
    const matchEmail = isFuzzyMatch(q, seller.email);
    return matchShop || matchOwner || matchPhone || matchEmail;
  });

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Sellers Management</h1>
        <p>Review and manage seller registrations</p>
      </div>

      {/* Search Bar */}
      <div style={{ marginBottom: '16px' }}>
        <div style={{ position: 'relative', maxWidth: '480px', width: '100%' }}>
          <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '16px', color: '#94a3b8' }}>🔍</span>
          <input
            type="text"
            placeholder="Search by Shop Name, Owner, Phone, or Email…"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 16px 10px 42px',
              border: '1.5px solid #e2e8f0',
              borderRadius: '10px',
              fontSize: '14px',
              outline: 'none',
              background: '#fff',
              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
              boxSizing: 'border-box'
            }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8', fontSize: '16px' }}
            >✕</button>
          )}
        </div>
      </div>

      <div className="card">
        <h3>Sellers ({filteredSellers.length})</h3>
        <div className="table-responsive">
          <table className="table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>Shop Info</th>
                <th>Owner Details</th>
                <th>Added</th>
                <th>Categories</th>
                <th>Sold</th>
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSellers.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>No sellers match your search</td></tr>
              ) : (
                filteredSellers.map((seller) => (
                  <tr 
                    key={seller._id} 
                    onClick={() => handleSellerClick(seller)}
                    style={{ cursor: 'pointer', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <td>
                      <div style={{ fontWeight: '600', color: '#1e293b' }}>{seller.shopName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{seller.gstin ? `GST: ${seller.gstin}` : 'No GST'}</div>
                    </td>
                    <td>
                      <div style={{ fontWeight: '500' }}>{seller.ownerName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{seller.email}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{seller.phone}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: '600' }}>
                        {seller.productsAdded || 0}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '150px' }}>
                        {seller.categories?.length > 0 ? seller.categories.join(', ') : 'None'}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: '#047857', fontWeight: 'bold' }}>
                        {seller.productsSold || 0}
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', maxWidth: '200px' }}>{seller.shopAddress}</div>
                    </td>
                    <td>
                      <span className={`status-badge status-${seller.status?.toLowerCase() || 'pending'}`}>
                        {seller.status}
                      </span>
                    </td>
                    <td>
                      <select 
                        value="Select Action"
                        onClick={(e) => e.stopPropagation()} // Prevent row click when interacting with dropdown
                        onChange={(e) => {
                            if (e.target.value !== 'Select Action') {
                                updateSellerStatus(seller._id, e.target.value);
                            }
                            e.target.value = "Select Action";
                        }}
                        style={{ padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontWeight: 500, fontSize: '13px', color: '#334155', width: '100%' }}
                      >
                        <option value="Select Action" disabled hidden>Select Action</option>
                        <option value="Approved">Approved</option>
                        <option value="Rejected">Rejected</option>
                        <option value="Deactivated">Deactivated</option>
                        <option value="Paused">Pause</option>
                        <option value="Suspended">Suspended</option>
                      </select>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seller Profile Modal */}
      {selectedSeller && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px'
        }}>
          <div style={{
            background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '800px',
            maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column'
          }}>
            {/* Modal Header */}
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ width: '64px', height: '64px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '32px', border: '1px solid #e2e8f0' }}>
                  🏪
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '24px', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedSeller.shopName}
                    <span className={`status-badge status-${selectedSeller.status?.toLowerCase() || 'pending'}`} style={{ fontSize: '11px', padding: '4px 8px' }}>
                      {selectedSeller.status}
                    </span>
                  </h2>
                  <div style={{ color: '#64748b', fontSize: '14px', marginTop: '4px' }}>
                    Owned by <span style={{ fontWeight: 600 }}>{selectedSeller.ownerName}</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={closeModal}
                style={{ background: '#f1f5f9', border: 'none', width: '36px', height: '36px', borderRadius: '50%', fontSize: '18px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', transition: 'background 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.background = '#e2e8f0'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f1f5f9'}
              >
                ✕
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px' }}>
              
              {/* Info Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '32px' }}>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>Contact Info</div>
                  <div style={{ fontWeight: 500, color: '#1e293b' }}>📞 {selectedSeller.phone}</div>
                  <div style={{ fontWeight: 500, color: '#1e293b', marginTop: '4px' }}>✉️ {selectedSeller.email}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>Business Info</div>
                  <div style={{ fontWeight: 500, color: '#1e293b' }}>GSTIN: {selectedSeller.gstin || 'N/A'}</div>
                  <div style={{ fontWeight: 500, color: '#1e293b', marginTop: '4px' }}>Cats: {selectedSeller.categories?.join(', ') || 'N/A'}</div>
                </div>
                <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600, marginBottom: '8px' }}>Location</div>
                  <div style={{ fontWeight: 500, color: '#1e293b', fontSize: '13px' }}>{selectedSeller.shopAddress}</div>
                </div>
              </div>

              {/* Products Section */}
              <div>
                <h3 style={{ fontSize: '18px', color: '#1e293b', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  📦 Uploaded Products ({sellerProducts.length})
                </h3>
                
                {loadingProducts ? (
                  <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>Loading products...</div>
                ) : sellerProducts.length === 0 ? (
                  <div style={{ padding: '40px', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
                    This seller has not uploaded any products yet.
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '16px' }}>
                    {sellerProducts.map(prod => (
                      <div key={prod._id} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', background: '#fff' }}>
                        <div style={{ height: '140px', background: '#f1f5f9', position: 'relative' }}>
                          <img 
                            src={getImageUrl(prod.images[0])} 
                            alt={prod.name}
                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            onError={(e) => { e.target.style.display = 'none'; }}
                          />
                          {!prod.isActive && (
                            <div style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(239, 68, 68, 0.9)', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 6px', borderRadius: '4px' }}>INACTIVE</div>
                          )}
                        </div>
                        <div style={{ padding: '12px' }}>
                          <div style={{ fontSize: '10px', color: '#64748b', marginBottom: '2px' }}>{prod._id}</div>
                          <div style={{ fontWeight: 600, fontSize: '13px', color: '#1e293b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{prod.name}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '8px' }}>
                            <span style={{ fontWeight: 700, color: '#047857' }}>₹{prod.price}</span>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: prod.stock > 5 ? '#3b82f6' : '#dc2626', background: prod.stock > 5 ? '#eff6ff' : '#fef2f2', padding: '2px 6px', borderRadius: '10px' }}>
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

export default Sellers;
