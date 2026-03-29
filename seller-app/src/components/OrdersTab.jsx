import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';

const OrderItemDetailModal = ({ item, order, onClose }) => {
    if (!item) return null;
    const statusColor = item.status?.includes('Return') ? '#f59e0b' : item.status === 'Delivered' ? '#22c55e' : '#64748b';
    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, padding: 16 }}>
            <div onClick={e => e.stopPropagation()} style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 440, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 25px 50px rgba(0,0,0,0.25)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '20px 20px 0' }}>
                    <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>📦 Item Details</h3>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: 34, height: 34, borderRadius: '50%', fontSize: 16, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>
                <div style={{ padding: '16px 20px 24px' }}>
                    <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 16, padding: 14, background: '#f8fafc', borderRadius: 14, border: '1px solid #e2e8f0' }}>
                        {item.image && <img src={getImageUrl(item.image)} alt={item.name} style={{ width: 90, height: 90, borderRadius: 10, objectFit: 'cover', border: '1px solid #e2e8f0', flexShrink: 0 }} />}
                        <div>
                            <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 4 }}>{item.name}</div>
                            {item.productCode && <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', marginBottom: 6 }}>SKU: {item.productCode}</div>}
                            {item.status && <span style={{ background: statusColor + '20', color: statusColor, border: '1px solid ' + statusColor + '40', borderRadius: 6, padding: '3px 10px', fontSize: 12, fontWeight: 700 }}>{item.status}</span>}
                        </div>
                    </div>
                    {[['Size', item.size], ['Color', item.color], ['Quantity', item.quantity], ['Selling Price', item.sellingPrice ? '\u20b9' + item.sellingPrice : null], ['Line Total', item.sellingPrice ? '\u20b9' + (item.sellingPrice * item.quantity).toFixed(0) : null], ['Order No.', order?.orderId], ['Order Status', order?.status]].filter(([, v]) => v).map(([label, value]) => (
                        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                            <span style={{ fontSize: 13, color: '#64748b', fontWeight: 600 }}>{label}</span>
                            <span style={{ fontSize: 14, color: '#1e293b', fontWeight: 700 }}>{value}</span>
                        </div>
                    ))}
                    {item.actionReason && (
                        <div style={{ marginTop: 14, background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, padding: '10px 14px' }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: '#92400e', marginBottom: 4 }}>📝 Customer Return Reason</div>
                            <div style={{ fontSize: 14, color: '#78350f' }}>{'"'}{item.actionReason}{'"'}</div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const maskName = (name) => {
    if (!name) return 'Customer';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase() + '***';
    return parts[0] + ' ' + parts[parts.length - 1].charAt(0).toUpperCase() + '***';
};

const maskPhone = (phone) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    if (digits.length < 6) return '****';
    return digits.slice(0, 2) + '****' + digits.slice(-2);
};

const STATUS_CONFIG = {
    'Placed':            { color: '#f59e0b', bg: '#fef3c7', text: '#b45309' },
    'Accepted':          { color: '#6366f1', bg: '#eef2ff', text: '#4338ca' },
    'Preparing':         { color: '#6366f1', bg: '#eef2ff', text: '#4338ca' },
    'Ready for Pickup':  { color: '#0ea5e9', bg: '#e0f2fe', text: '#0369a1' },
    'Out for Delivery':  { color: '#0ea5e9', bg: '#e0f2fe', text: '#0369a1' },
    'Delivered':         { color: '#22c55e', bg: '#dcfce7', text: '#16a34a' },
    'Cancelled':         { color: '#ef4444', bg: '#fee2e2', text: '#dc2626' },
    'Rejected':          { color: '#ef4444', bg: '#fee2e2', text: '#dc2626' },
};

const getStatusStyle = (status) =>
    STATUS_CONFIG[status] || { color: '#94a3b8', bg: '#f1f5f9', text: '#64748b' };

const TABS = [
    { key: 'New',       label: '🆕 New',      filter: o => o.status === 'Placed' },
    { key: 'Accepted',  label: '✅ Accepted',  filter: o => ['Accepted','Preparing'].includes(o.status) },
    { key: 'Ready',     label: '📦 Ready',     filter: o => ['Ready for Pickup','Out for Delivery'].includes(o.status) },
    { key: 'Completed', label: '🎉 Done',      filter: o => o.status === 'Delivered' },
    { key: 'Cancelled', label: '❌ Cancelled', filter: o => ['Cancelled','Rejected'].includes(o.status) },
    { key: 'Returns',   label: '↩️ Returns',   filter: o => o.items.some(i => i.status?.includes('Return')) },
];

const OrdersTab = () => {
    const [selectedItem, setSelectedItem] = useState(null);
    const [orders, setOrders]       = useState([]);
    const [loading, setLoading]     = useState(true);
    const [activeTab, setActiveTab] = useState('New');
    const [processing, setProcessing] = useState(null); // orderId being processed

    useEffect(() => { fetchOrders(); }, []);

    const fetchOrders = async () => {
        try {
            const res = await api.get('/orders/seller');
            if (res.data.success) setOrders(res.data.data);
        } catch (e) {
            console.error('Failed to fetch orders:', e);
        } finally {
            setLoading(false);
        }
    };

    // Order-level status update (Accept, Reject, Ready)
    const updateOrderStatus = async (orderId, status) => {
        if (!window.confirm(`Mark this order as "${status}"?`)) return;
        setProcessing(orderId);
        try {
            await api.put(`/orders/seller/${orderId}/status`, { status });
            await fetchOrders();
        } catch (e) {
            alert(e.response?.data?.message || 'Failed to update order status');
        } finally {
            setProcessing(null);
        }
    };

    // Item-level return approve/reject
    const handleItemReturn = async (orderId, itemId, action, itemName) => {
        const verb = action === 'approve' ? 'Accept' : 'Reject';
        if (!window.confirm(`${verb} return for "${itemName}"?`)) return;
        setProcessing(orderId + itemId);
        try {
            await api.put(`/orders/seller/${orderId}/item-return`, { itemId, action });
            await fetchOrders();
            alert(action === 'approve'
                ? '✅ Return accepted! A delivery partner will be assigned shortly.'
                : '❌ Return rejected.');
        } catch (e) {
            alert(e.response?.data?.message || 'Error processing return');
        } finally {
            setProcessing(null);
        }
    };

    // Item-level: seller marks returned item as physically received
    const handleItemReceived = async (orderId, itemId, itemName) => {
        if (!window.confirm(`Confirm you have physically received "${itemName}" back at your shop?\n\nEarnings for this item will be reversed from your wallet.`)) return;
        setProcessing(orderId + itemId + 'recv');
        try {
            const res = await api.put(`/orders/seller/${orderId}/item-received`, { itemId });
            await fetchOrders();
            const deduction = res.data?.data?.earningDeduction || 0;
            alert(`✅ Item marked as received! Return Completed.\n\n📦 Stock restored.\n💸 ₹${deduction} deducted from your earnings.`);
        } catch (e) {
            alert(e.response?.data?.message || 'Error marking item as received');
        } finally {
            setProcessing(null);
        }
    };


    if (loading) return (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '200px' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e2e8f0', borderTopColor: '#4f46e5', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
        </div>
    );

    const tab = TABS.find(t => t.key === activeTab);
    const filteredOrders = tab ? orders.filter(tab.filter) : orders;

    return (
        <div style={{ width: '100%' }}>
            <style>{`
                @keyframes spin { to { transform: rotate(360deg); } }
                @keyframes pulse-ring {
                    0%   { box-shadow: 0 0 0 0 rgba(234,179,8,0.4); }
                    70%  { box-shadow: 0 0 0 8px rgba(234,179,8,0); }
                    100% { box-shadow: 0 0 0 0 rgba(234,179,8,0); }
                }
                .orders-tab-wrap::-webkit-scrollbar { display: none; }
                .orders-tab-wrap { -ms-overflow-style: none; scrollbar-width: none; }
                .order-card { transition: box-shadow 0.2s; }
                .order-card:hover { box-shadow: 0 4px 16px rgba(79,70,229,0.1); }
                .pulse-ready { animation: pulse-ring 2s infinite; }
                @media (max-width: 600px) {
                    .order-meta-row { flex-direction: column !important; gap: 4px !important; }
                    .order-items-grid { gap: 12px !important; }
                    .item-attrs { flex-wrap: wrap !important; }
                    .return-btns { flex-direction: row !important; }
                }
            `}</style>

            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
                <h2 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 800, color: '#1e293b' }}>
                    Order Management
                </h2>
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                    Accept, prepare, and manage customer orders.
                </p>
            </div>

            {/* Tab bar — horizontally scrollable */}
            <div className="orders-tab-wrap" style={{ overflowX: 'auto', marginBottom: '16px' }}>
                <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '5px', borderRadius: '14px', width: 'max-content' }}>
                    {TABS.map(t => {
                        const count = orders.filter(t.filter).length;
                        const isActive = activeTab === t.key;
                        return (
                            <button
                                key={t.key}
                                onClick={() => setActiveTab(t.key)}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    padding: '7px 14px', borderRadius: '10px',
                                    fontSize: '13px', fontWeight: 600, border: 'none',
                                    cursor: 'pointer', whiteSpace: 'nowrap',
                                    background: isActive ? 'white' : 'transparent',
                                    color: isActive ? '#4f46e5' : '#64748b',
                                    boxShadow: isActive ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                                    transition: 'all 0.18s',
                                }}
                            >
                                {t.label}
                                {count > 0 && (
                                    <span style={{
                                        background: isActive ? '#4f46e5' : '#e2e8f0',
                                        color: isActive ? 'white' : '#64748b',
                                        padding: '1px 7px', borderRadius: '20px',
                                        fontSize: '11px', fontWeight: 700,
                                    }}>
                                        {count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Returns notice banner */}
            {activeTab === 'Returns' && filteredOrders.length > 0 && (
                <div style={{
                    background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px',
                    padding: '10px 14px', marginBottom: '12px', fontSize: '12px', color: '#92400e',
                    display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    ℹ️ <span>Tap <strong>Accept Return</strong> next to the item — a delivery partner will be auto-assigned to collect it from the customer.</span>
                </div>
            )}

            {/* Empty state */}
            {filteredOrders.length === 0 ? (
                <div style={{
                    background: 'white', border: '1px dashed #cbd5e1', borderRadius: '14px',
                    padding: '48px 20px', textAlign: 'center'
                }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>
                        {activeTab === 'New' ? '🛒' : activeTab === 'Returns' ? '↩️' : '📦'}
                    </div>
                    <p style={{ margin: '0 0 4px', fontWeight: 700, color: '#1e293b' }}>
                        No {activeTab === 'New' ? 'new' : activeTab.toLowerCase()} orders
                    </p>
                    <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                        {activeTab === 'New' ? 'New customer orders will appear here.' : 'Nothing here yet.'}
                    </span>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {filteredOrders.map(order => {
                        const { color, bg, text } = getStatusStyle(order.status);
                        const isProcessing = processing === order._id;
                        const customer = order.shippingAddress?.fullName || order.contactInfo?.name || order.user?.name;
                        const phone = order.shippingAddress?.phone || order.contactInfo?.phone || order.user?.phone;
                        const returnItems = order.items.filter(i => i.status?.includes('Return'));

                        // ── Compute return deductions for earnings panel ──
                        const activeReturnItems = order.items.filter(i =>
                            ['Return Requested', 'Return Approved', 'Return Completed'].includes(i.status)
                        );
                        const returnedGrossValue = activeReturnItems.reduce(
                            (sum, i) => sum + ((i.sellingPrice || 0) * (i.quantity || 1)), 0
                        );
                        const sellingPriceTotal = order.sellingPriceTotal || order.totalAmount || 1;
                        // Proportional earning deduction for returned items
                        const baseEarning = order.sellerEarning || (order.sellingPriceTotal || order.totalAmount || 0);
                        const returnEarningDeduction = activeReturnItems.length > 0
                            ? Math.round((returnedGrossValue / sellingPriceTotal) * baseEarning)
                            : 0;
                        const adjustedEarning = Math.max(0, baseEarning - returnEarningDeduction);
                        const hasActiveReturns = activeReturnItems.length > 0;

                        return (
                            <div key={order._id} className="order-card" style={{
                                background: 'white',
                                borderRadius: '14px',
                                border: hasActiveReturns ? '1px solid #fca5a5' : '1px solid #e2e8f0',
                                overflow: 'hidden',
                                boxShadow: hasActiveReturns ? '0 1px 8px rgba(239,68,68,0.1)' : '0 1px 4px rgba(0,0,0,0.04)',
                            }}>
                                {/* Top accent stripe + header */}
                                <div style={{ height: '3px', background: hasActiveReturns ? '#ef4444' : color }} />

                                <div style={{ padding: '14px 16px' }}>
                                    {/* Order meta row */}
                                    <div className="order-meta-row" style={{
                                        display: 'flex', alignItems: 'center',
                                        justifyContent: 'space-between', flexWrap: 'wrap',
                                        gap: '8px', marginBottom: '12px'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                                            <span style={{ fontWeight: 800, fontSize: '15px', color: '#1e293b' }}>
                                                #{(order.orderId || order._id?.toString())?.slice(-6)}
                                            </span>
                                            <span style={{
                                                padding: '3px 10px', borderRadius: '20px',
                                                fontSize: '11px', fontWeight: 700,
                                                background: bg, color: text
                                            }}>
                                                {order.status}
                                            </span>
                                            {/* Returns badge — visible in Done tab */}
                                            {hasActiveReturns && (
                                                <span style={{
                                                    padding: '3px 8px', borderRadius: '20px',
                                                    fontSize: '11px', fontWeight: 700,
                                                    background: '#fee2e2', color: '#dc2626',
                                                    border: '1px solid #fca5a5'
                                                }}>
                                                    ↩️ {activeReturnItems.length} Return{activeReturnItems.length > 1 ? 's' : ''}
                                                </span>
                                            )}
                                            <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                                {new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })}
                                            </span>
                                        </div>

                                        {/* ── Earnings Breakdown Panel ── */}
                                        <div style={{
                                            display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
                                            gap: '2px', minWidth: '130px',
                                            background: hasActiveReturns ? '#fff5f5' : '#f0fdf4',
                                            border: `1px solid ${hasActiveReturns ? '#fecaca' : '#bbf7d0'}`,
                                            borderRadius: '10px', padding: '8px 10px'
                                        }}>
                                            {/* Selling Price */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                                                <span style={{ fontSize: '10px', color: '#64748b', fontWeight: 500 }}>Sale Price</span>
                                                <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
                                                    ₹{(order.sellingPriceTotal || order.totalAmount || 0).toFixed(0)}
                                                </span>
                                            </div>
                                            {/* Commission deduction */}
                                            {(order.commissionAmount > 0) && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                                                    <span style={{ fontSize: '10px', color: '#ef4444', fontWeight: 500 }}>Commission</span>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#ef4444' }}>
                                                        − ₹{(order.commissionAmount || 0).toFixed(0)}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Return deduction — shown when items are returned */}
                                            {returnEarningDeduction > 0 && (
                                                <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', gap: '8px' }}>
                                                    <span style={{ fontSize: '10px', color: '#dc2626', fontWeight: 600 }}>↩️ Returns</span>
                                                    <span style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626' }}>
                                                        − ₹{returnEarningDeduction.toFixed(0)}
                                                    </span>
                                                </div>
                                            )}
                                            {/* Divider */}
                                            <div style={{ width: '100%', height: '1px', background: hasActiveReturns ? '#fecaca' : '#86efac', margin: '2px 0' }} />
                                            {/* Net Earnings — adjusted */}
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', gap: '8px' }}>
                                                <span style={{ fontSize: '10px', color: hasActiveReturns ? '#991b1b' : '#15803d', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                                                    You Receive
                                                </span>
                                                <span style={{ fontSize: '14px', fontWeight: 900, color: hasActiveReturns ? '#dc2626' : '#15803d' }}>
                                                    ₹{adjustedEarning.toFixed(0)}
                                                </span>
                                            </div>
                                            {/* Status label */}
                                            <div style={{ fontSize: '9px', color: '#64748b', alignSelf: 'flex-end', marginTop: '1px' }}>
                                                {hasActiveReturns && returnEarningDeduction > 0
                                                    ? '⚠️ Adj. for returns'
                                                    : order.walletSettlementStatus === 'Settled'
                                                        ? '✅ Settled to wallet'
                                                        : order.status === 'Delivered'
                                                            ? '🕐 Pending settlement'
                                                            : '⏳ Est. after delivery'}
                                            </div>
                                        </div>
                                    </div>


                                    {/* Customer */}
                                    <div style={{
                                        display: 'flex', gap: '16px', flexWrap: 'wrap',
                                        padding: '8px 12px', background: '#f8fafc',
                                        borderRadius: '8px', marginBottom: '12px',
                                        fontSize: '12px', color: '#475569'
                                    }}>

                                        <span>👤 {maskName(customer)}</span>
                                        <span>📞 {maskPhone(phone) || 'N/A'}</span>
                                        <span style={{ flex: 1, minWidth: '120px' }}>
                                            📍 {order.shippingAddress?.fullAddress?.substring(0, 40) || '—'}
                                        </span>
                                    </div>

                                    {/* Items */}
                                    <div className="order-items-grid" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {order.items.map((item, idx) => {
                                            const itemReturnPending = item.status === 'Return Requested';
                                            const itemReturnDone = item.status?.includes('Return') && !itemReturnPending;
                                            const isItemProcessing = processing === (order._id + item._id);

                                            return (
                                                <div key={idx} style={{
                                                    display: 'flex', gap: '10px', alignItems: 'flex-start',
                                                    padding: '10px', borderRadius: '10px',
                                                    background: itemReturnPending ? '#fff7ed' : '#fafbfc',
                                                    border: itemReturnPending ? '1px solid #fed7aa' : '1px solid #f1f5f9',
                                                    cursor: 'pointer',
                                                }} onClick={(e) => { e.stopPropagation(); setSelectedItem({ item, order }); }}>
                                                    {/* Image */}
                                                    <img
                                                        src={getImageUrl(item.image)}
                                                        alt={item.name}
                                                        onClick={() => window.open(getImageUrl(item.image), '_blank')}
                                                        onError={e => e.target.style.display = 'none'}
                                                        style={{
                                                            width: '48px', height: '48px', borderRadius: '8px',
                                                            objectFit: 'cover', flexShrink: 0, cursor: 'pointer',
                                                            border: '1px solid #e2e8f0'
                                                        }}
                                                    />

                                                    {/* Info */}
                                                    <div style={{ flex: 1, minWidth: 0 }}>
                                                        <div style={{
                                                            fontWeight: 700, fontSize: '13px', color: '#1e293b',
                                                            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                                                        }}>
                                                            {item.name}
                                                        </div>

                                                        {/* Product Code */}
                                                        {item.productCode && (
                                                            <div style={{
                                                                fontSize: '10px', color: '#64748b', fontFamily: 'monospace',
                                                                fontWeight: 600, marginTop: '2px', letterSpacing: '0.3px'
                                                            }}>
                                                                # {item.productCode}
                                                            </div>
                                                        )}

                                                        <div className="item-attrs" style={{
                                                            display: 'flex', gap: '8px', marginTop: '4px', flexWrap: 'wrap'
                                                        }}>
                                                            <span style={{ fontSize: '11px', background: '#e0f2fe', color: '#0369a1', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                                Qty: {item.quantity}
                                                            </span>
                                                            {item.size && (
                                                                <span style={{ fontSize: '11px', background: '#f3e8ff', color: '#7c3aed', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                                    {item.size}
                                                                </span>
                                                            )}
                                                            {item.color && (
                                                                <span style={{ fontSize: '11px', background: '#fce7f3', color: '#be185d', padding: '1px 6px', borderRadius: '4px', fontWeight: 600 }}>
                                                                    {item.color}
                                                                </span>
                                                            )}
                                                            <span style={{ fontSize: '11px', fontWeight: 700, color: '#1e293b' }}>
                                                                ₹{((item.sellingPrice || 0) * item.quantity).toFixed(0)}
                                                            </span>
                                                        </div>

                                                        {/* Return status badge or action buttons */}
                                                        {itemReturnPending && (
                                                            <div style={{ marginTop: '8px' }}>
                                                                {/* Customer return reason */}
                                                                {item.actionReason && (
                                                                    <div style={{
                                                                        background: '#fff7ed',
                                                                        border: '1px solid #fed7aa',
                                                                        borderRadius: '6px',
                                                                        padding: '6px 10px',
                                                                        marginBottom: '8px',
                                                                        fontSize: '12px',
                                                                    }}>
                                                                        <span style={{ fontWeight: 700, color: '#92400e' }}>📝 Customer's reason: </span>
                                                                        <span style={{ color: '#78350f' }}>"{item.actionReason}"</span>
                                                                    </div>
                                                                )}
                                                                <div style={{ fontSize: '11px', color: '#92400e', marginBottom: '6px', fontWeight: 600 }}>
                                                                    ↩️ Customer requested a return
                                                                </div>
                                                                <div className="return-btns" style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                                                                    <button
                                                                        disabled={isItemProcessing}
                                                                        onClick={() => handleItemReturn(order._id, item._id, 'approve', item.name)}
                                                                        style={{
                                                                            flex: 1, minWidth: '100px', padding: '7px 12px',
                                                                            background: isItemProcessing ? '#e2e8f0' : '#22c55e',
                                                                            color: 'white', border: 'none', borderRadius: '8px',
                                                                            fontWeight: 700, cursor: isItemProcessing ? 'not-allowed' : 'pointer',
                                                                            fontSize: '12px',
                                                                        }}
                                                                    >
                                                                        {isItemProcessing ? '⏳ Processing…' : '✅ Accept Return'}
                                                                    </button>
                                                                    <button
                                                                        disabled={isItemProcessing}
                                                                        onClick={() => handleItemReturn(order._id, item._id, 'reject', item.name)}
                                                                        style={{
                                                                            flex: 1, minWidth: '80px', padding: '7px 12px',
                                                                            background: '#fee2e2', color: '#b91c1c',
                                                                            border: '1px solid #fca5a5', borderRadius: '8px',
                                                                            fontWeight: 700, cursor: isItemProcessing ? 'not-allowed' : 'pointer',
                                                                            fontSize: '12px',
                                                                        }}
                                                                    >
                                                                        ❌ Reject
                                                                    </button>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Return Approved — show pickup status + Mark Received button */}
                                                        {item.status === 'Return Approved' && (() => {
                                                            const isRecvProcessing = processing === (order._id + item._id + 'recv');
                                                            return (
                                                                <div style={{ marginTop: '8px' }}>
                                                                    {/* Return reason if any */}
                                                                    {item.actionReason && (
                                                                        <div style={{
                                                                            background: '#fff7ed', border: '1px solid #fed7aa',
                                                                            borderRadius: '6px', padding: '6px 10px', marginBottom: '8px', fontSize: '12px',
                                                                        }}>
                                                                            <span style={{ fontWeight: 700, color: '#92400e' }}>📝 Return reason: </span>
                                                                            <span style={{ color: '#78350f' }}>"{item.actionReason}"</span>
                                                                        </div>
                                                                    )}
                                                                    {/* Pickup status banner */}
                                                                    <div style={{
                                                                        background: '#eff6ff', border: '1px solid #bfdbfe',
                                                                        borderRadius: '6px', padding: '6px 10px',
                                                                        fontSize: '11px', color: '#1d4ed8', marginBottom: '8px',
                                                                        fontWeight: 600
                                                                    }}>
                                                                        🚴 Return Approved — Delivery partner will collect item from customer
                                                                    </div>
                                                                    {/* Mark Item Received */}
                                                                    <button
                                                                        disabled={isRecvProcessing}
                                                                        onClick={() => handleItemReceived(order._id, item._id, item.name)}
                                                                        style={{
                                                                            width: '100%', padding: '8px 14px',
                                                                            background: isRecvProcessing ? '#e2e8f0' : '#6366f1',
                                                                            color: 'white', border: 'none', borderRadius: '8px',
                                                                            fontWeight: 700, cursor: isRecvProcessing ? 'not-allowed' : 'pointer',
                                                                            fontSize: '12px',
                                                                        }}
                                                                    >
                                                                        {isRecvProcessing ? '⏳ Processing…' : '📦 Mark Item Received at Shop'}
                                                                    </button>
                                                                </div>
                                                            );
                                                        })()}

                                                        {/* Other non-pending return statuses (Completed / Rejected) */}
                                                        {itemReturnDone && item.status !== 'Return Approved' && (
                                                            <div style={{ marginTop: '6px' }}>
                                                                {item.actionReason && (
                                                                    <div style={{
                                                                        background: '#f8fafc', border: '1px solid #e2e8f0',
                                                                        borderRadius: '6px', padding: '5px 8px', marginBottom: '5px', fontSize: '11px', color: '#64748b'
                                                                    }}>
                                                                        📝 Reason: "{item.actionReason}"
                                                                    </div>
                                                                )}
                                                                <span style={{
                                                                    display: 'inline-block', padding: '3px 8px',
                                                                    background: item.status?.includes('Rejected') ? '#fee2e2'
                                                                              : item.status === 'Return Completed' ? '#dcfce7' : '#dcfce7',
                                                                    color: item.status?.includes('Rejected') ? '#dc2626' : '#16a34a',
                                                                    borderRadius: '6px', fontSize: '11px', fontWeight: 700
                                                                }}>
                                                                    {item.status === 'Return Completed' ? '✅ Return Completed — Item Received' : item.status}
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Order-level action buttons */}
                                    {(order.status === 'Placed' || order.status === 'Accepted') && (
                                        <div style={{
                                            display: 'flex', gap: '8px', marginTop: '12px',
                                            paddingTop: '12px', borderTop: '1px solid #f1f5f9',
                                            flexWrap: 'wrap'
                                        }}>
                                            {order.status === 'Placed' && (
                                                <>
                                                    <button
                                                        disabled={isProcessing}
                                                        onClick={() => updateOrderStatus(order._id, 'Accepted')}
                                                        style={{
                                                            flex: 1, minWidth: '100px', padding: '9px 14px',
                                                            background: '#22c55e', color: 'white',
                                                            border: 'none', borderRadius: '8px',
                                                            fontWeight: 700, cursor: 'pointer', fontSize: '13px'
                                                        }}
                                                    >
                                                        ✅ Accept Order
                                                    </button>
                                                    <button
                                                        disabled={isProcessing}
                                                        onClick={() => updateOrderStatus(order._id, 'Rejected')}
                                                        style={{
                                                            flex: 1, minWidth: '80px', padding: '9px 14px',
                                                            background: '#fee2e2', color: '#b91c1c',
                                                            border: '1px solid #fca5a5', borderRadius: '8px',
                                                            fontWeight: 700, cursor: 'pointer', fontSize: '13px'
                                                        }}
                                                    >
                                                        ❌ Reject
                                                    </button>
                                                </>
                                            )}
                                            {order.status === 'Accepted' && (
                                                <button
                                                    disabled={isProcessing}
                                                    onClick={() => updateOrderStatus(order._id, 'Ready for Pickup')}
                                                    className="pulse-ready"
                                                    style={{
                                                        flex: 1, padding: '9px 14px',
                                                        background: '#eab308', color: 'white',
                                                        border: 'none', borderRadius: '8px',
                                                        fontWeight: 700, cursor: 'pointer', fontSize: '13px'
                                                    }}
                                                >
                                                    📦 Mark Ready for Pickup
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
            {/* Item Detail Modal */}
            {selectedItem && (
                <OrderItemDetailModal
                    item={selectedItem.item}
                    order={selectedItem.order}
                    onClose={() => setSelectedItem(null)}
                />
            )}
        </div>
    );
};

export default OrdersTab;
