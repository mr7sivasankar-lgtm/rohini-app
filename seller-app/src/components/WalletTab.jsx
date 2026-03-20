import { useState, useEffect } from 'react';
import api from '../utils/api';

const WalletTab = () => {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);

    const fetchWallet = async () => {
        try {
            setLoading(true);
            const res = await api.get('/wallet');
            if (res.data.success) {
                setBalance(res.data.data.balance || 0);
                setTransactions(res.data.data.transactions || []);
            }
        } catch (error) {
            console.error('Error fetching wallet:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchWallet();
    }, []);

    const handleWithdraw = async (e) => {
        e.preventDefault();
        const amount = Number(withdrawAmount);
        if (!amount || amount <= 0) return alert('Enter a valid amount');
        if (amount > balance) return alert('Insufficient balance');

        try {
            setWithdrawLoading(true);
            const res = await api.post('/wallet/withdraw', { amount });
            if (res.data.success) {
                alert('Withdrawal request submitted successfully');
                setShowWithdrawModal(false);
                setWithdrawAmount('');
                fetchWallet();
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Failed to submit request');
        } finally {
            setWithdrawLoading(false);
        }
    };

    if (loading) return <div style={{ padding: 20 }}>Loading wallet data...</div>;

    return (
        <div style={{ padding: 20 }}>
            {/* Balance Card */}
            <div style={{ background: 'linear-gradient(135deg, #4f46e5, #3b82f6)', color: 'white', padding: 30, borderRadius: 16, marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 10px 15px -3px rgba(59, 130, 246, 0.3)' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 16, fontWeight: 500, opacity: 0.9 }}>Available Balance</h3>
                    <h1 style={{ margin: '8px 0 0', fontSize: 36, fontWeight: 800 }}>₹{balance.toFixed(2)}</h1>
                </div>
                <button 
                    onClick={() => setShowWithdrawModal(true)}
                    style={{ background: 'white', color: '#4f46e5', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15, transition: '0.2s' }}
                >
                    Request Payout
                </button>
            </div>

            {/* Transactions List */}
            <h3 style={{ fontSize: 18, color: '#1e293b', marginBottom: 16 }}>Recent Transactions</h3>
            {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 12, color: '#64748b' }}>
                    No transactions yet. Complete orders to earn!
                </div>
            ) : (
                <div style={{ background: 'white', borderRadius: 12, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                            <tr>
                                <th style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Date</th>
                                <th style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Description</th>
                                <th style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', fontWeight: 600 }}>Status</th>
                                <th style={{ padding: '12px 16px', fontSize: 13, color: '#64748b', fontWeight: 600, textAlign: 'right' }}>Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.map(txn => (
                                <tr key={txn._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#475569' }}>
                                        {new Date(txn.createdAt).toLocaleDateString()}
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 14, color: '#1e293b' }}>
                                        {txn.description}
                                        {txn.orderId && <div style={{ fontSize: 11, color: '#94a3b8' }}>Order: {txn.orderId.substring(0,8)}...</div>}
                                    </td>
                                    <td style={{ padding: '12px 16px' }}>
                                        <span style={{ 
                                            background: txn.status === 'COMPLETED' ? '#dcfce7' : txn.status === 'PENDING' ? '#fef3c7' : '#fee2e2', 
                                            color: txn.status === 'COMPLETED' ? '#166534' : txn.status === 'PENDING' ? '#b45309' : '#991b1b',
                                            padding: '4px 8px', borderRadius: 6, fontSize: 12, fontWeight: 600 
                                        }}>
                                            {txn.status}
                                        </span>
                                    </td>
                                    <td style={{ padding: '12px 16px', fontSize: 14, fontWeight: 700, textAlign: 'right', color: txn.type === 'CREDIT' ? '#16a34a' : '#dc2626' }}>
                                        {txn.type === 'CREDIT' ? '+' : '-'}₹{txn.amount.toFixed(2)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
                    <div style={{ background: 'white', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400 }}>
                        <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Request Payout</h2>
                        <form onSubmit={handleWithdraw}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Amount to Withdraw (₹)</label>
                                <input 
                                    type="number" 
                                    value={withdrawAmount} 
                                    onChange={e => setWithdrawAmount(e.target.value)} 
                                    placeholder="e.g. 5000"
                                    max={balance}
                                    required 
                                    style={{ width: '100%', padding: '10px', fontSize: 16, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }}
                                />
                                <small style={{ color: '#64748b', display: 'block', marginTop: 6 }}>Available: ₹{balance.toFixed(2)}</small>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="button" onClick={() => setShowWithdrawModal(false)} style={{ flex: 1, padding: '10px', border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                <button type="submit" disabled={withdrawLoading} style={{ flex: 1, padding: '10px', border: 'none', background: '#4f46e5', color: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                                    {withdrawLoading ? 'Processing...' : 'Submit Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default WalletTab;
