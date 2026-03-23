import React, { useState, useEffect, useCallback } from 'react';
import api from '../utils/api';

// ── Helpers ──────────────────────────────────────────────────────────────────
const fmt = (n = 0) => `₹${Number(n).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const fmtShort = (n = 0) => {
  if (n >= 100000) return `₹${(n / 100000).toFixed(1)}L`;
  if (n >= 1000) return `₹${(n / 1000).toFixed(1)}K`;
  return `₹${Number(n).toFixed(0)}`;
};

// ── Mini SVG Bar/Line Chart ───────────────────────────────────────────────────
const ProfitChart = ({ data, mode }) => {
  if (!data || data.length === 0) {
    return (
      <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', fontSize: 14 }}>
        No data for the selected period
      </div>
    );
  }

  const W = 700, H = 200, PAD = 40;
  const max = Math.max(...data.map(d => d.profit), 1);
  const barW = Math.floor((W - PAD * 2) / data.length) - 4;

  const points = data.map((d, i) => {
    const x = PAD + i * ((W - PAD * 2) / (data.length - 1 || 1));
    const y = H - PAD - ((d.profit / max) * (H - PAD * 2));
    return { x, y, d };
  });

  const fmtLabel = (id) => {
    if (mode === 'monthly') {
      const [y, m] = id.split('-');
      return new Date(y, m - 1, 1).toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
    }
    const dt = new Date(id);
    return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  return (
    <svg viewBox={`0 0 ${W} ${H + 30}`} style={{ width: '100%', overflow: 'visible' }}>
      {/* Y-axis grid lines */}
      {[0, 0.25, 0.5, 0.75, 1].map(ratio => {
        const y = H - PAD - ratio * (H - PAD * 2);
        return (
          <g key={ratio}>
            <line x1={PAD} y1={y} x2={W - PAD} y2={y} stroke="#f1f5f9" strokeWidth="1" />
            <text x={PAD - 6} y={y + 4} fontSize="9" fill="#94a3b8" textAnchor="end">
              {fmtShort(max * ratio)}
            </text>
          </g>
        );
      })}

      {/* Bars */}
      {data.map((d, i) => {
        const x = PAD + i * ((W - PAD * 2) / Math.max(data.length - 1, 1)) - barW / 2;
        const barH = Math.max(2, (d.profit / max) * (H - PAD * 2));
        const y = H - PAD - barH;
        return (
          <g key={i}>
            <rect
              x={data.length === 1 ? (W / 2 - barW / 2) : x}
              y={y}
              width={Math.min(barW, 40)}
              height={barH}
              rx={4}
              fill="url(#profitGrad)"
              opacity={0.85}
            />
            {/* X-axis label */}
            <text
              x={data.length === 1 ? W / 2 : x + Math.min(barW, 40) / 2}
              y={H - PAD + 16}
              fontSize="9"
              fill="#64748b"
              textAnchor="middle"
            >
              {fmtLabel(d._id)}
            </text>
          </g>
        );
      })}

      {/* Line overlay */}
      {data.length > 1 && (
        <polyline
          points={points.map(p => `${p.x},${p.y}`).join(' ')}
          fill="none"
          stroke="#f97316"
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )}
      {points.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#f97316" stroke="white" strokeWidth="2">
          <title>{fmtLabel(p.d._id)}: {fmt(p.d.profit)}</title>
        </circle>
      ))}

      <defs>
        <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#fb923c" stopOpacity="0.2" />
        </linearGradient>
      </defs>
    </svg>
  );
};

// ── Summary Card ─────────────────────────────────────────────────────────────
const SummaryCard = ({ label, value, icon, color, borderColor, sub }) => (
  <div style={{
    background: 'white', borderRadius: 14, padding: '18px 20px',
    borderTop: `4px solid ${borderColor}`,
    boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    display: 'flex', flexDirection: 'column', gap: 4
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{label}</div>
      <span style={{ fontSize: 20 }}>{icon}</span>
    </div>
    <div style={{ fontSize: 22, fontWeight: 800, color }}>{fmt(value)}</div>
    {sub && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{sub}</div>}
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────
const RevenueDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('month');
  const [chartMode, setChartMode] = useState('daily');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customApplied, setCustomApplied] = useState(false);

  const fetchRevenue = useCallback(async (f = filter, from = '', to = '') => {
    setLoading(true);
    try {
      let url = `/orders/admin/revenue?filter=${f}`;
      if (f === 'custom' && from && to) url += `&from=${from}&to=${to}`;
      const res = await api.get(url);
      if (res.data.success) setData(res.data.data);
    } catch (e) {
      console.error('Revenue fetch error:', e);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchRevenue(filter); }, []);

  const handleFilter = (f) => {
    setFilter(f);
    setCustomApplied(false);
    fetchRevenue(f);
  };

  const handleCustomApply = () => {
    if (!fromDate || !toDate) return alert('Please select both From and To dates');
    setFilter('custom');
    setCustomApplied(true);
    fetchRevenue('custom', fromDate, toDate);
  };

  const s = data?.summary || {};
  const chartData = chartMode === 'daily' ? (data?.dailyChart || []) : (data?.monthlyChart || []);

  const FILTERS = [
    { label: 'Today', value: 'today' },
    { label: 'This Week', value: 'week' },
    { label: 'This Month', value: 'month' },
    { label: 'All Time', value: 'all' },
  ];

  return (
    <div>
      <div className="page-header">
        <h1>💰 Revenue & Profit</h1>
        <p>Platform earnings from commission and platform fees</p>
      </div>

      {/* Filter Bar */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
        {FILTERS.map(f => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            style={{
              padding: '7px 16px', border: 'none', borderRadius: 20, cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: filter === f.value && !customApplied ? '#f97316' : '#f1f5f9',
              color: filter === f.value && !customApplied ? 'white' : '#475569',
              boxShadow: filter === f.value && !customApplied ? '0 2px 8px rgba(249,115,22,0.3)' : 'none',
              transition: 'all 0.15s'
            }}
          >
            {f.label}
          </button>
        ))}

        {/* Custom date range */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', marginLeft: 8 }}>
          <input
            type="date"
            value={fromDate}
            onChange={e => setFromDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
          <span style={{ color: '#94a3b8' }}>→</span>
          <input
            type="date"
            value={toDate}
            onChange={e => setToDate(e.target.value)}
            style={{ padding: '6px 10px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, outline: 'none' }}
          />
          <button
            onClick={handleCustomApply}
            style={{
              padding: '7px 14px', border: 'none', borderRadius: 8, cursor: 'pointer',
              fontWeight: 600, fontSize: 13,
              background: customApplied ? '#f97316' : '#1e293b',
              color: 'white'
            }}
          >
            Apply
          </button>
        </div>

        <button
          onClick={() => fetchRevenue(filter, fromDate, toDate)}
          style={{ marginLeft: 'auto', padding: '7px 14px', border: '1px solid #e2e8f0', borderRadius: 8, cursor: 'pointer', background: 'white', fontSize: 13, color: '#475569' }}
        >
          🔄 Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>💰</div>
          <div>Loading revenue data…</div>
        </div>
      ) : (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
            <SummaryCard label="Delivered Orders" value={s.totalOrders || 0} icon="📦" color="#1d4ed8" borderColor="#3b82f6"
              sub="Count only" />
            <SummaryCard label="Total Revenue" value={s.totalRevenue} icon="💳" color="#0369a1" borderColor="#0ea5e9"
              sub="Customer payments received" />
            <SummaryCard label="Commission Earned" value={s.totalCommission} icon="🏷️" color="#059669" borderColor="#10b981"
              sub={`${data?.summary ? ((s.totalCommission / Math.max(s.totalRevenue, 1)) * 100).toFixed(1) : 0}% of revenue`} />
            <SummaryCard label="Platform Fees" value={s.totalPlatformFees} icon="🏛️" color="#7c3aed" borderColor="#8b5cf6"
              sub="Fixed fee per order" />
            <SummaryCard label="Gateway Fees" value={s.totalGatewayFees} icon="💸" color="#dc2626" borderColor="#ef4444"
              sub="Payment processing cost" />
            <SummaryCard
              label="Net Profit"
              value={s.totalProfit}
              icon="✅"
              color={s.totalProfit >= 0 ? '#16a34a' : '#dc2626'}
              borderColor={s.totalProfit >= 0 ? '#22c55e' : '#ef4444'}
              sub="Commission + Platform Fee − Gateway Fee"
            />
          </div>

          {/* Profit Breakdown Bar */}
          {s.totalRevenue > 0 && (
            <div className="card" style={{ marginBottom: 20, padding: '14px 20px' }}>
              <div style={{ fontSize: 12, color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
                Revenue Breakdown
              </div>
              <div style={{ display: 'flex', height: 18, borderRadius: 9, overflow: 'hidden', gap: 1 }}>
                {[
                  { label: 'Seller Earnings', val: s.totalRevenue - s.totalCommission - s.totalPlatformFees, color: '#3b82f6' },
                  { label: 'Commission', val: s.totalCommission, color: '#10b981' },
                  { label: 'Platform Fee', val: s.totalPlatformFees, color: '#8b5cf6' },
                  { label: 'Gateway Fee', val: s.totalGatewayFees, color: '#ef4444' },
                ].filter(b => b.val > 0).map((b, i) => (
                  <div key={i} title={`${b.label}: ${fmt(b.val)}`}
                    style={{ flex: b.val, background: b.color, transition: 'flex 0.3s' }} />
                ))}
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 8 }}>
                {[
                  { label: 'Seller Earnings', val: s.totalRevenue - s.totalCommission - s.totalPlatformFees, color: '#3b82f6' },
                  { label: 'Commission', val: s.totalCommission, color: '#10b981' },
                  { label: 'Platform Fee', val: s.totalPlatformFees, color: '#8b5cf6' },
                  { label: 'Gateway Fee', val: s.totalGatewayFees, color: '#ef4444' },
                ].map((b, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11 }}>
                    <span style={{ width: 10, height: 10, borderRadius: 2, background: b.color, display: 'inline-block' }} />
                    <span style={{ color: '#64748b' }}>{b.label}:</span>
                    <span style={{ fontWeight: 700, color: '#334155' }}>{fmt(b.val)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Chart */}
          <div className="card" style={{ marginBottom: 20 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>📈 Profit Analytics</div>
                <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>Net profit per {chartMode === 'daily' ? 'day' : 'month'}</div>
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                {['daily', 'monthly'].map(m => (
                  <button key={m} onClick={() => setChartMode(m)} style={{
                    padding: '5px 14px', border: 'none', borderRadius: 20, cursor: 'pointer',
                    fontWeight: 600, fontSize: 12,
                    background: chartMode === m ? '#f97316' : '#f1f5f9',
                    color: chartMode === m ? 'white' : '#64748b'
                  }}>{m === 'daily' ? 'Daily' : 'Monthly'}</button>
                ))}
              </div>
            </div>
            <ProfitChart data={chartData} mode={chartMode} />
          </div>

          {/* Per-order Table */}
          <div className="card">
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b', marginBottom: 14 }}>
              📋 Order-wise Profit Report
              <span style={{ marginLeft: 10, fontSize: 12, fontWeight: 400, color: '#94a3b8' }}>
                {data?.orders?.length || 0} delivered orders
              </span>
            </div>

            {!data?.orders?.length ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>
                No delivered orders in this period
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table">
                  <thead>
                    <tr>
                      <th>Order ID</th>
                      <th style={{ textAlign: 'right' }}>Selling Price</th>
                      <th style={{ textAlign: 'right' }}>Commission</th>
                      <th style={{ textAlign: 'right' }}>Platform Fee</th>
                      <th style={{ textAlign: 'right' }}>Gateway Fee</th>
                      <th style={{ textAlign: 'right' }}>Net Profit</th>
                      <th>Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.orders.map(order => {
                      const profit = order.adminProfit || 0;
                      return (
                        <tr key={order._id}>
                          <td>
                            <span style={{ fontFamily: 'monospace', fontSize: 12, fontWeight: 600, color: '#334155' }}>
                              #{order.orderId?.slice(-8)}
                            </span>
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 500 }}>{fmt(order.sellingPriceTotal)}</td>
                          <td style={{ textAlign: 'right', color: '#059669', fontWeight: 600 }}>{fmt(order.commissionAmount)}</td>
                          <td style={{ textAlign: 'right', color: '#7c3aed', fontWeight: 600 }}>{fmt(order.platformFee)}</td>
                          <td style={{ textAlign: 'right', color: '#dc2626' }}>{fmt(order.paymentGatewayFee)}</td>
                          <td style={{ textAlign: 'right' }}>
                            <span style={{
                              fontWeight: 800, fontSize: 13,
                              color: profit >= 0 ? '#16a34a' : '#dc2626',
                              background: profit >= 0 ? '#f0fdf4' : '#fef2f2',
                              padding: '2px 8px', borderRadius: 8
                            }}>
                              {fmt(profit)}
                            </span>
                          </td>
                          <td style={{ fontSize: 12, color: '#64748b' }}>
                            {order.deliveredAt
                              ? new Date(order.deliveredAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* Footer totals */}
                  <tfoot>
                    <tr style={{ background: '#f8fafc', fontWeight: 700 }}>
                      <td>TOTAL</td>
                      <td style={{ textAlign: 'right' }}>{fmt(s.totalRevenue)}</td>
                      <td style={{ textAlign: 'right', color: '#059669' }}>{fmt(s.totalCommission)}</td>
                      <td style={{ textAlign: 'right', color: '#7c3aed' }}>{fmt(s.totalPlatformFees)}</td>
                      <td style={{ textAlign: 'right', color: '#dc2626' }}>{fmt(s.totalGatewayFees)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          fontWeight: 800, fontSize: 14,
                          color: s.totalProfit >= 0 ? '#16a34a' : '#dc2626'
                        }}>
                          {fmt(s.totalProfit)}
                        </span>
                      </td>
                      <td />
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default RevenueDashboard;
