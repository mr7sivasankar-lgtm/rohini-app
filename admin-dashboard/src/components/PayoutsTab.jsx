import { useState, useEffect } from 'react';
import api from '../utils/api';

const PayoutsTab = () => {
    const [withdrawals, setWithdrawals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeFilter, setActiveFilter] = useState('Pending'); // Pending, Approved, Rejected
    
    const [actionModal, setActionModal] = useState({ isOpen: false, type: '', withdrawal: null, reason: '' });

    const fetchWithdrawals = async () => {
        try {
            setLoading(true);
            const res = await api.get('/wallet/admin/withdrawals');
            if (res.data.success) {
                setWithdrawals(res.data.data.reverse()); // Newest first
            }
        } catch (error) {
            console.error('Error fetching withdrawals:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWithdrawals();
    }, []);

    const filteredList = withdrawals.filter(w => activeFilter === 'ALL' || w.status === activeFilter);

    const handleAction = async (e) => {
        e.preventDefault();
        const { type, withdrawal, reason } = actionModal;
        if (type === 'Rejected' && !reason.trim()) return alert('Please provide a reason for rejection.');
        
        try {
            await api.put(`/wallet/admin/withdrawals/${withdrawal._id}`, { status: type, adminNotes: reason });
            alert(`Withdrawal marked as ${type}`);
            setActionModal({ isOpen: false, type: '', withdrawal: null, reason: '' });
            fetchWithdrawals();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to process request');
        }
    };

    return (
        <div>
            <div className="page-header">
                <h1>Payouts & Withdrawals Center</h1>
                <p>Manage and process withdrawal requests from Vendors and Delivery Partners.</p>
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                {['Pending', 'Approved', 'Rejected', 'ALL'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveFilter(tab)}
                        style={{
                            padding: '8px 16px', border: 'none', borderRadius: '20px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
                            background: activeFilter === tab ? '#0f172a' : '#f1f5f9',
                            color: activeFilter === tab ? 'white' : '#475569'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                {loading ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>Loading payouts...</div>
                ) : filteredList.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: '#64748b' }}>No {activeFilter.toLowerCase()} withdrawal requests found.</div>
                ) : (
                    <div className="table-responsive">
                        <table className="table" style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                            <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                                <tr>
                                    <th style={{ padding: '16px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Date</th>
                                    <th style={{ padding: '16px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Requester</th>
                                    <th style={{ padding: '16px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Bank Details (Snapshot)</th>
                                    <th style={{ padding: '16px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Amount</th>
                                    <th style={{ padding: '16px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Status</th>
                                    <th style={{ padding: '16px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredList.map(w => (
                                    <tr key={w._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                        <td style={{ padding: '16px', fontSize: 13, color: '#64748b' }}>
                                            {new Date(w.createdAt).toLocaleString()}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <div style={{ fontWeight: 600, color: '#0f172a', fontSize: 14 }}>
                                                {w.userModel === 'Seller' ? w.userRef?.ownerName : w.userRef?.name}
                                            </div>
                                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, background: '#f1f5f9', display: 'inline-block', padding: '2px 6px', borderRadius: 4 }}>
                                                {w.userModel} • {w.userRef?.phone}
                                            </div>
                                            {w.userModel === 'Seller' && <div style={{ fontSize: 12, color: '#3b82f6', marginTop: 4 }}>Shop: {w.userRef?.shopName}</div>}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: 13, color: '#334155' }}>
                                            {w.bankDetails ? (
                                                <div style={{ background: '#f8fafc', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
                                                    <div><span style={{color: '#94a3b8'}}>Bank:</span> {w.bankDetails.bankName}</div>
                                                    <div><span style={{color: '#94a3b8'}}>Acc:</span> {w.bankDetails.bankAccountNumber}</div>
                                                    <div><span style={{color: '#94a3b8'}}>IFSC:</span> {w.bankDetails.bankIfsc}</div>
                                                    <div><span style={{color: '#94a3b8'}}>Name:</span> {w.bankDetails.bankAccountName}</div>
                                                    {w.bankDetails.upiId && <div><span style={{color: '#94a3b8'}}>UPI:</span> {w.bankDetails.upiId}</div>}
                                                </div>
                                            ) : (
                                                <span style={{ color: '#ef4444' }}>No Bank Linked!</span>
                                            )}
                                        </td>
                                        <td style={{ padding: '16px', fontSize: 16, fontWeight: 800, color: '#2563eb' }}>
                                            ₹{w.amount.toFixed(2)}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            <span style={{ 
                                                background: w.status === 'Approved' ? '#dcfce7' : w.status === 'Pending' ? '#fef3c7' : '#fee2e2', 
                                                color: w.status === 'Approved' ? '#166534' : w.status === 'Pending' ? '#b45309' : '#991b1b',
                                                padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 
                                            }}>
                                                {w.status}
                                            </span>
                                            {w.adminNotes && <div style={{ fontSize: 11, color: '#64748b', marginTop: 6, maxWidth: 200 }}>Reason: {w.adminNotes}</div>}
                                        </td>
                                        <td style={{ padding: '16px' }}>
                                            {w.status === 'Pending' ? (
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button onClick={() => setActionModal({ isOpen: true, type: 'Approved', withdrawal: w, reason: '' })} style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Approve</button>
                                                    <button onClick={() => setActionModal({ isOpen: true, type: 'Rejected', withdrawal: w, reason: '' })} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 12px', borderRadius: 6, fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Decline</button>
                                                </div>
                                            ) : (
                                                <span style={{ color: '#94a3b8', fontSize: 12 }}>Locked</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Action Modal */}
            {actionModal.isOpen && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
                    <div style={{ background: 'white', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400 }}>
                        <h2 style={{ margin: '0 0 16px', fontSize: 18, color: actionModal.type === 'Approved' ? '#10b981' : '#ef4444' }}>
                            {actionModal.type === 'Approved' ? 'Approve Payout' : 'Decline Payout & Refund'}
                        </h2>
                        <form onSubmit={handleAction}>
                            {actionModal.type === 'Approved' ? (
                                <p style={{ fontSize: 14, color: '#475569', marginBottom: 20 }}>
                                    By approving, you confirm that you have manually wired <b>₹{actionModal.withdrawal.amount}</b> to the provided bank account. The partner's wallet has already been deducted.
                                </p>
                            ) : (
                                <div style={{ marginBottom: 20 }}>
                                    <label style={{ display: 'block', marginBottom: 6, fontSize: 13, fontWeight: 600, color: '#475569' }}>Reason for Decline *</label>
                                    <textarea 
                                        value={actionModal.reason} 
                                        onChange={e => setActionModal(p => ({ ...p, reason: e.target.value }))} 
                                        rows={3} 
                                        required 
                                        style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #cbd5e1', fontSize: 14, boxSizing: 'border-box' }}
                                        placeholder="E.g., Invalid bank details"
                                    />
                                    <small style={{ color: '#94a3b8', fontSize: 12, marginTop: 6, display: 'block' }}>Funds will be refunded back to their digital wallet.</small>
                                </div>
                            )}
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="button" onClick={() => setActionModal({ isOpen: false, type: '', withdrawal: null, reason: '' })} style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '10px', border: 'none', background: actionModal.type === 'Approved' ? '#10b981' : '#ef4444', color: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                                    Confirm
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PayoutsTab;
