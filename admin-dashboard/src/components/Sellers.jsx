import { useState, useEffect } from 'react';
import api from '../utils/api';

const Sellers = () => {
  const [sellers, setSellers] = useState([]);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div className="loading"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-header">
        <h1>Sellers Management</h1>
        <p>Review and manage seller registrations</p>
      </div>

      <div className="card">
        <h3>Sellers ({sellers.length})</h3>
        <div className="table-responsive">
          <table className="table">
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
              {sellers.length === 0 ? (
                <tr><td colSpan="8" style={{ textAlign: 'center' }}>No sellers found</td></tr>
              ) : (
                sellers.map((seller) => (
                  <tr key={seller._id}>
                    <td>
                      <div style={{ fontWeight: '600' }}>{seller.shopName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{seller.gstin ? `GST: ${seller.gstin}` : 'No GST'}</div>
                    </td>
                    <td>
                      <div>{seller.ownerName}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{seller.email}</div>
                      <div style={{ fontSize: '12px', color: '#64748b' }}>{seller.phone}</div>
                    </td>
                    <td>
                      <div style={{ fontSize: '13px', color: '#334155', fontWeight: '500' }}>
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
    </div>
  );
};

export default Sellers;
