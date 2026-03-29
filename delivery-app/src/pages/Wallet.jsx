import { useState, useEffect } from 'react';
import api from '../utils/api';

const Wallet = () => {
    const [balance, setBalance] = useState(0);
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [withdrawLoading, setWithdrawLoading] = useState(false);
    const [withdrawAmount, setWithdrawAmount] = useState('');
    const [showWithdrawModal, setShowWithdrawModal] = useState(false);

    const fetchWallet = async () => {
        try {
            setLoading(true);
            const res = await api.get('/wallet/delivery');
            if (res.data.success) {
                setBalance(res.data.data.balance || 0);
                setTransactions(res.data.data.transactions || []);
            }
        } catch (error) {
            console.error('Error fetching delivery wallet:', error);
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
            const res = await api.post('/wallet/delivery/withdraw', { amount });
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

    // Determine if a transaction is a credit (earning) or debit (withdrawal/deduction)
    const isCredit = (txn) => {
        const creditTypes = ['Delivery Earning', 'Order Earning'];
        return creditTypes.includes(txn.type) || txn.amount > 0;
    };

    // Status color: DB stores 'Success', 'Pending', 'Failed'
    const statusColor = (status) => {
        if (status === 'Success') return '#166534';
        if (status === 'Pending') return '#b45309';
        return '#991b1b';
    };

    if (loading) return <div style={{ padding: 20 }}>Loading wallet data...</div>;

    return (
        <div style={{ padding: 20, paddingBottom: 100 }}>
            {/* Balance Card */}
            <div style={{ background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', padding: 24, borderRadius: 16, marginBottom: 24, display: 'flex', flexDirection: 'column', gap: 16, boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3)' }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 15, fontWeight: 500, opacity: 0.9 }}>Available Balance</h3>
                    <h1 style={{ margin: '8px 0 0', fontSize: 32, fontWeight: 800 }}>₹{balance.toFixed(2)}</h1>
                </div>
                <button 
                    onClick={() => setShowWithdrawModal(true)}
                    style={{ background: 'white', color: '#059669', border: 'none', padding: '12px 24px', borderRadius: 8, fontWeight: 700, cursor: 'pointer', fontSize: 15, transition: '0.2s', alignSelf: 'flex-start' }}
                >
                    Request Payout
                </button>
            </div>

            {/* Transactions List */}
            <h3 style={{ fontSize: 17, color: '#1e293b', marginBottom: 16 }}>Ledger History</h3>
            {transactions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, background: '#f8fafc', borderRadius: 12, color: '#64748b' }}>
                    No transactions yet. Start delivering to earn!
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {transactions.map(txn => (
                        <div key={txn._id} style={{ background: 'white', padding: 16, borderRadius: 12, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                                <div style={{ fontSize: 14, color: '#1e293b', fontWeight: 600, marginBottom: 4 }}>
                                    {txn.description}
                                </div>
                                <div style={{ fontSize: 12, color: '#64748b', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <span>{new Date(txn.createdAt).toLocaleDateString('en-IN')}</span>
                                    <span style={{ 
                                        color: statusColor(txn.status),
                                        fontSize: 11, fontWeight: 700 
                                    }}>
                                        • {txn.status}
                                    </span>
                                    <span style={{
                                        background: isCredit(txn) ? '#dcfce7' : '#fee2e2',
                                        color: isCredit(txn) ? '#15803d' : '#b91c1c',
                                        fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 4
                                    }}>
                                        {txn.type}
                                    </span>
                                </div>
                                {txn.orderId && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Order: {txn.orderId.toString().substring(0,8)}...</div>}
                            </div>
                            <div style={{ 
                                fontSize: 17, fontWeight: 800, 
                                color: isCredit(txn) ? '#10b981' : '#dc2626',
                                whiteSpace: 'nowrap'
                            }}>
                                {isCredit(txn) ? '+' : '-'}₹{Math.abs(txn.amount).toFixed(2)}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Withdraw Modal */}
            {showWithdrawModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20 }}>
                    <div style={{ background: 'white', padding: 24, borderRadius: 16, width: '100%', maxWidth: 400 }}>
                        <h2 style={{ margin: '0 0 16px', fontSize: 20 }}>Request Payout</h2>
                        <form onSubmit={handleWithdraw}>
                            <div style={{ marginBottom: 16 }}>
                                <label style={{ display: 'block', fontSize: 13, fontWeight: 600, color: '#475569', marginBottom: 6 }}>Amount (₹)</label>
                                <input 
                                    type="number" 
                                    value={withdrawAmount} 
                                    onChange={e => setWithdrawAmount(e.target.value)} 
                                    placeholder="e.g. 1500"
                                    max={balance}
                                    required 
                                    style={{ width: '100%', padding: '12px', fontSize: 16, border: '1px solid #cbd5e1', borderRadius: 8, boxSizing: 'border-box' }}
                                />
                                <small style={{ color: '#64748b', display: 'block', marginTop: 6 }}>Available: ₹{balance.toFixed(2)}</small>
                            </div>
                            <div style={{ display: 'flex', gap: 12 }}>
                                <button type="button" onClick={() => setShowWithdrawModal(false)} style={{ flex: 1, padding: '12px', border: '1px solid #e2e8f0', background: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Cancel</button>
                                <button type="submit" disabled={withdrawLoading} style={{ flex: 1, padding: '12px', border: 'none', background: '#10b981', color: 'white', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>
                                    {withdrawLoading ? '...' : 'Request'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Wallet;
