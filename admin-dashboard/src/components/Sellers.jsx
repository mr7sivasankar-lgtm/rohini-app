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
      const response = await api.get('/sellers');
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
      await api.put(`/sellers/${sellerId}/status`, { status: newStatus });
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
                <th>Location</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {sellers.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center' }}>No sellers found</td></tr>
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
                      <div style={{ fontSize: '13px', maxWidth: '200px' }}>{seller.shopAddress}</div>
                    </td>
                    <td>
                      <span className={`status-badge status-${seller.status?.toLowerCase() || 'pending'}`}>
                        {seller.status}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        {seller.status === 'Pending' && (
                          <>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: '12px', background: '#22c55e', borderColor: '#22c55e' }}
                              onClick={() => updateSellerStatus(seller._id, 'Approved')}
                            >
                              Approve
                            </button>
                            <button
                              className="btn btn-primary"
                              style={{ padding: '4px 8px', fontSize: '12px', background: '#ef4444', borderColor: '#ef4444' }}
                              onClick={() => updateSellerStatus(seller._id, 'Rejected')}
                            >
                              Reject
                            </button>
                          </>
                        )}
                        {seller.status === 'Approved' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '12px', background: '#eab308', borderColor: '#eab308' }}
                            onClick={() => updateSellerStatus(seller._id, 'Suspended')}
                          >
                            Suspend
                          </button>
                        )}
                        {seller.status === 'Suspended' && (
                          <button
                            className="btn btn-primary"
                            style={{ padding: '4px 8px', fontSize: '12px', background: '#22c55e', borderColor: '#22c55e' }}
                            onClick={() => updateSellerStatus(seller._id, 'Approved')}
                          >
                            Reactivate
                          </button>
                        )}
                      </div>
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
