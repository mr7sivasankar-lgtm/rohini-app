import { useState, useEffect } from 'react';
import api from '../utils/api';

// ── Status config ──────────────────────────────────────────────────────────
const STATUS_CFG = {
    'Active':                 { bg: '#f0fdf4', border: '#86efac', badge: '#d1fae5', badgeTxt: '#065f46', dot: '#22c55e', label: '✅ Active' },
    'Low Coverage':           { bg: '#fffbeb', border: '#fcd34d', badge: '#fef3c7', badgeTxt: '#92400e', dot: '#f59e0b', label: '🟡 Low Coverage' },
    'No Delivery Partners':   { bg: '#fff7ed', border: '#fdba74', badge: '#ffedd5', badgeTxt: '#9a3412', dot: '#f97316', label: '🟠 No Delivery Partners' },
    'No Sellers':             { bg: '#fdf4ff', border: '#d8b4fe', badge: '#fae8ff', badgeTxt: '#6b21a8', dot: '#a855f7', label: '🟣 No Sellers' },
    'Untapped':               { bg: '#f8fafc', border: '#e2e8f0', badge: '#f1f5f9', badgeTxt: '#475569', dot: '#94a3b8', label: '⚪ Untapped' },
};

const fmt = (date) => date
    ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
    : '—';

// ── Score Bar ──────────────────────────────────────────────────────────────
const ScoreBar = ({ score }) => {
    const color = score >= 90 ? '#22c55e' : score >= 60 ? '#f59e0b' : score >= 30 ? '#f97316' : '#ef4444';
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 8, background: '#e2e8f0', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 8, transition: 'width 0.6s ease' }} />
            </div>
            <span style={{ fontSize: 13, fontWeight: 800, color, minWidth: 36 }}>{score}%</span>
        </div>
    );
};

// ── Stat Pill ──────────────────────────────────────────────────────────────
const Pill = ({ label, value, sub, bg, color }) => (
    <div style={{ background: bg, borderRadius: 12, padding: '12px 16px', flex: 1, minWidth: 100 }}>
        <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
        <div style={{ fontSize: 12, fontWeight: 700, color, opacity: 0.75, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: 11, color, opacity: 0.55, marginTop: 1 }}>{sub}</div>}
    </div>
);

// ── Expandable Entity Table ────────────────────────────────────────────────
const EntityTable = ({ title, headers, rows, emptyMsg }) => {
    const [open, setOpen] = useState(false);
    return (
        <div style={{ marginTop: 8 }}>
            <button
                onClick={() => setOpen(o => !o)}
                style={{
                    display: 'flex', alignItems: 'center', gap: 6, padding: '6px 14px',
                    background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8,
                    cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#475569',
                    transition: 'all 0.2s'
                }}
            >
                <span style={{ transform: open ? 'rotate(90deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▶</span>
                {title}
            </button>
            {open && (
                <div style={{ marginTop: 8, background: 'white', borderRadius: 10, border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                    {rows.length === 0 ? (
                        <div style={{ padding: '14px 16px', color: '#94a3b8', fontSize: 13, textAlign: 'center' }}>{emptyMsg}</div>
                    ) : (
                        <div style={{ overflowX: 'auto' }}>
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <thead>
                                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                                        {headers.map(h => (
                                            <th key={h} style={{ padding: '10px 14px', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', textAlign: 'left', whiteSpace: 'nowrap' }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {rows.map((row, i) => (
                                        <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', background: i % 2 === 0 ? 'white' : '#fafafa' }}>
                                            {row.map((cell, j) => (
                                                <td key={j} style={{ padding: '10px 14px', fontSize: 13, verticalAlign: 'middle' }}>{cell}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

// ── Cluster Card ───────────────────────────────────────────────────────────
const ClusterCard = ({ cluster, onToggleService }) => {
    const cfg = STATUS_CFG[cluster.status] || STATUS_CFG['Untapped'];
    const [toggling, setToggling] = useState(false);

    const handleToggle = async (action) => {
        setToggling(true);
        try {
            await onToggleService(cluster.pincode, action, cluster.city);
        } finally {
            setToggling(false);
        }
    };

    const serviceStatus = cluster.serviceAreaStatus;
    const serviceBadge = {
        'active':         { bg: '#d1fae5', color: '#065f46', dot: '#22c55e', label: '🟢 Service Active' },
        'inactive':       { bg: '#fee2e2', color: '#991b1b', dot: '#ef4444', label: '🔴 Service Disabled' },
        'not-configured': { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', label: '⚪ Not Configured' },
    }[serviceStatus] || { bg: '#f1f5f9', color: '#475569', dot: '#94a3b8', label: '⚪ Not Configured' };

    const sellerRows = cluster.sellers.list.map(s => [
        <span style={{ fontWeight: 700 }}>{s.shopName || '—'}</span>,
        s.ownerName || '—',
        <a href={`tel:${s.phone}`} style={{ color: '#2563eb', fontFamily: 'monospace' }}>{s.phone || '—'}</a>,
        <span style={{ fontSize: 11, background: '#eff6ff', color: '#2563eb', padding: '2px 7px', borderRadius: 6, fontWeight: 600 }}>{s.shopCategory || '—'}</span>,
        <span style={{
            padding: '2px 8px', borderRadius: 12, fontSize: 11, fontWeight: 700,
            background: s.status === 'Approved' ? '#d1fae5' : s.status === 'Rejected' ? '#fee2e2' : '#fef3c7',
            color: s.status === 'Approved' ? '#065f46' : s.status === 'Rejected' ? '#991b1b' : '#92400e'
        }}>{s.status}</span>,
        fmt(s.createdAt)
    ]);

    const dpRows = cluster.deliveryPartners.list.map(d => [
        <span style={{ fontWeight: 700 }}>{d.name || '—'}</span>,
        <a href={`tel:${d.phone}`} style={{ color: '#2563eb', fontFamily: 'monospace' }}>{d.phone || '—'}</a>,
        d.vehicleType || '—',
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: d.isActive ? '#065f46' : '#64748b' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.isActive ? '#22c55e' : '#cbd5e1' }} />
            {d.isActive ? 'Active' : 'Inactive'}
        </span>,
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: d.isOnline ? '#065f46' : '#64748b' }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: d.isOnline ? '#22c55e' : '#e2e8f0' }} />
            {d.isOnline ? 'Online' : 'Offline'}
        </span>,
        fmt(d.createdAt)
    ]);

    const userList = cluster.users.list || [];
    const userRows = userList.map(u => [
        <span style={{ fontWeight: 700 }}>{u.name || '—'}</span>,
        <a href={`tel:${u.phone}`} style={{ color: '#2563eb', fontFamily: 'monospace' }}>{u.phone || '—'}</a>,
        fmt(u.createdAt)
    ]);

    return (
        <div style={{
            background: cfg.bg, border: `1.5px solid ${cfg.border}`,
            borderRadius: 16, padding: 20, marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>📮 {cluster.pincode}</span>
                        <span style={{ fontSize: 14, color: '#475569', fontWeight: 600 }}>
                            {cluster.city}{cluster.state ? `, ${cluster.state}` : ''}
                        </span>
                    </div>
                    {cluster.distanceKm !== null && (
                        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>
                            📏 Seller ↔ Nearest DP: <strong>{cluster.distanceKm} km</strong>
                        </div>
                    )}
                </div>
                {/* Right side: coverage badge + service status badge */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
                    <span style={{
                        padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                        background: cfg.badge, color: cfg.badgeTxt, whiteSpace: 'nowrap'
                    }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: cfg.dot, display: 'inline-block', marginRight: 5 }} />
                        {cluster.status}
                    </span>
                    {/* Service area status badge */}
                    <span style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                        background: serviceBadge.bg, color: serviceBadge.color, whiteSpace: 'nowrap'
                    }}>
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: serviceBadge.dot, display: 'inline-block', marginRight: 4 }} />
                        {serviceBadge.label}
                    </span>
                </div>
            </div>

            {/* Coverage Score */}
            <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 5 }}>Coverage Score</div>
                <ScoreBar score={cluster.coverageScore} />
            </div>

            {/* Stats Pills */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 14, flexWrap: 'wrap' }}>
                <Pill
                    label="Sellers"
                    value={cluster.sellers.total}
                    sub={`${cluster.sellers.approved} approved · ${cluster.sellers.pending} pending`}
                    bg="#fffbeb" color="#92400e"
                />
                <Pill
                    label="Delivery Partners"
                    value={cluster.deliveryPartners.total}
                    sub={`${cluster.deliveryPartners.active} active · ${cluster.deliveryPartners.online} online now`}
                    bg="#fdf4ff" color="#7e22ce"
                />
                <Pill
                    label="Users"
                    value={cluster.users.total}
                    sub="with saved addresses"
                    bg="#eff6ff" color="#1e40af"
                />
            </div>

            {/* Suggestions */}
            {cluster.suggestions.length > 0 && (
                <div style={{ background: 'rgba(255,255,255,0.7)', border: '1px solid rgba(0,0,0,0.06)', borderRadius: 10, padding: '12px 14px', marginBottom: 14 }}>
                    <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>💡 Admin Insights</div>
                    {cluster.suggestions.map((s, i) => (
                        <div key={i} style={{ fontSize: 12, color: '#4b5563', lineHeight: 1.6, paddingLeft: 8 }}>• {s}</div>
                    ))}
                </div>
            )}

            {/* Expandable Tables */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <EntityTable
                    title={`🏪 Sellers (${cluster.sellers.total})`}
                    headers={['Shop Name', 'Owner', 'Phone', 'Category', 'Status', 'Registered']}
                    rows={sellerRows}
                    emptyMsg="No sellers registered in this pincode"
                />
                <EntityTable
                    title={`🛵 Delivery Partners (${cluster.deliveryPartners.total})`}
                    headers={['Name', 'Phone', 'Vehicle', 'Active', 'Online', 'Registered']}
                    rows={dpRows}
                    emptyMsg="No delivery partners in this pincode"
                />
                <EntityTable
                    title={`👥 Users (${cluster.users.total})`}
                    headers={['Name', 'Phone', 'Joined On']}
                    rows={userRows}
                    emptyMsg="No users with saved addresses in this pincode"
                />
            </div>

            {/* ── Admin Service Controls ── */}
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px dashed #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>Admin Control:</span>

                {serviceStatus !== 'active' && (
                    <button
                        onClick={() => handleToggle('activate')}
                        disabled={toggling}
                        style={{
                            padding: '6px 16px', borderRadius: 8, border: 'none',
                            background: toggling ? '#e2e8f0' : 'linear-gradient(135deg,#22c55e,#16a34a)',
                            color: toggling ? '#94a3b8' : 'white',
                            fontWeight: 700, fontSize: 12, cursor: toggling ? 'not-allowed' : 'pointer',
                            boxShadow: '0 2px 8px rgba(34,197,94,0.3)'
                        }}
                    >
                        {toggling ? '⏳ ...' : '✅ Activate Service'}
                    </button>
                )}

                {serviceStatus === 'active' && (
                    <button
                        onClick={() => handleToggle('deactivate')}
                        disabled={toggling}
                        style={{
                            padding: '6px 16px', borderRadius: 8, border: 'none',
                            background: toggling ? '#e2e8f0' : '#fee2e2',
                            color: toggling ? '#94a3b8' : '#dc2626',
                            fontWeight: 700, fontSize: 12, cursor: toggling ? 'not-allowed' : 'pointer',
                            border: '1px solid #fca5a5'
                        }}
                    >
                        {toggling ? '⏳ ...' : '🚫 Deactivate Service'}
                    </button>
                )}

                {serviceStatus === 'not-configured' && (
                    <span style={{ fontSize: 11, color: '#f59e0b', fontWeight: 600, background: '#fffbeb', padding: '4px 10px', borderRadius: 8, border: '1px solid #fde68a' }}>
                        ⚠️ Not in Service Areas — customers can still order (default open)
                    </span>
                )}
            </div>
        </div>
    );
};

// ── Summary Row ────────────────────────────────────────────────────────────
const SummaryCard = ({ icon, label, value, bg, color }) => (
    <div style={{ background: bg, borderRadius: 12, padding: '14px 18px', flex: 1, minWidth: 120, display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ fontSize: 24 }}>{icon}</span>
        <div>
            <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color, opacity: 0.7, marginTop: 2 }}>{label}</div>
        </div>
    </div>
);

// ── Main Component ─────────────────────────────────────────────────────────
const LocationIntelligence = () => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filter, setFilter] = useState('all');   // all | attention | untapped

    useEffect(() => { fetchIntelligence(); }, []);

    const fetchIntelligence = async () => {
        setLoading(true);
        try {
            const res = await api.get('/serviceability/areas/location-intelligence');
            if (res.data.success) setData(res.data.data);
            else setError('Failed to load intelligence data');
        } catch (err) {
            setError('Could not fetch location intelligence: ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    };

    const handleToggleService = async (pincode, action, cityName) => {
        try {
            await api.patch(`/serviceability/areas/cluster/${pincode}`, { action, cityName });
            await fetchIntelligence();  // refresh to show updated status
        } catch (err) {
            alert('Failed to update service: ' + (err.response?.data?.message || err.message));
        }
    };

    if (loading) return (
        <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>🔍</div>
            <p style={{ fontWeight: 600 }}>Analysing location data...</p>
        </div>
    );

    if (error) return (
        <div style={{ padding: '16px 20px', background: '#fee2e2', borderRadius: 12, color: '#dc2626', fontSize: 13, fontWeight: 600 }}>⚠️ {error}</div>
    );

    if (!data || data.clusters.length === 0) return (
        <div style={{ textAlign: 'center', padding: '40px 20px', background: '#f8fafc', borderRadius: 14, border: '1px dashed #cbd5e1' }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>🗺️</div>
            <p style={{ color: '#64748b', fontWeight: 600, fontSize: 15 }}>No location data yet</p>
            <p style={{ color: '#94a3b8', fontSize: 13, margin: '4px 0 0' }}>Register sellers, delivery partners, or users with a valid pincode to see coverage clusters here.</p>
        </div>
    );

    const { clusters, summary } = data;

    const filteredClusters = clusters.filter(c => {
        if (filter === 'attention') return c.status !== 'Active' && c.status !== 'Untapped';
        if (filter === 'untapped')  return c.status === 'Untapped';
        return true;
    });

    return (
        <div>
            {/* Section Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
                <div>
                    <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>🗺️ Location Intelligence</h3>
                    <p style={{ margin: '3px 0 0', fontSize: 12, color: '#64748b' }}>
                        Auto-discovered from registered entity data — grouped by pincode
                    </p>
                </div>
                <button
                    onClick={fetchIntelligence}
                    style={{ padding: '7px 16px', background: '#f1f5f9', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 700, color: '#64748b' }}
                >
                    🔄 Refresh
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                <SummaryCard icon="📍" label="Location Clusters"  value={summary.totalClusters}   bg="#eff6ff" color="#1e40af" />
                <SummaryCard icon="✅" label="Fully Active"       value={summary.fullyActive}     bg="#f0fdf4" color="#065f46" />
                <SummaryCard icon="⚠️" label="Needs Attention"    value={summary.needsAttention}  bg="#fff7ed" color="#9a3412" />
                <SummaryCard icon="💤" label="Untapped"           value={summary.untapped}        bg="#f8fafc" color="#475569" />
                <SummaryCard icon="👥" label="Users (w/ Address)" value={summary.totalUsers}      bg="#fdf4ff" color="#7e22ce" />
            </div>

            {/* Filter Tabs */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[
                    { key: 'all',       label: `All (${clusters.length})` },
                    { key: 'attention', label: `⚠️ Needs Attention (${summary.needsAttention})` },
                    { key: 'untapped',  label: `💤 Untapped (${summary.untapped})` },
                ].map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        style={{
                            padding: '6px 14px', borderRadius: 8, border: '1.5px solid',
                            borderColor: filter === tab.key ? '#6366f1' : '#e2e8f0',
                            background: filter === tab.key ? '#eef2ff' : 'white',
                            color: filter === tab.key ? '#4f46e5' : '#64748b',
                            fontWeight: 700, fontSize: 12, cursor: 'pointer'
                        }}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Cluster Cards */}
            {filteredClusters.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '30px 20px', background: '#f8fafc', borderRadius: 12, color: '#94a3b8', fontSize: 13 }}>
                    No clusters match the selected filter.
                </div>
            ) : (
                filteredClusters.map(cluster => (
                    <ClusterCard key={cluster.pincode} cluster={cluster} onToggleService={handleToggleService} />
                ))
            )}
        </div>
    );
};

export default LocationIntelligence;
