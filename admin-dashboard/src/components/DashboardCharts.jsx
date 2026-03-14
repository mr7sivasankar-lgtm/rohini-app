import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend
} from 'recharts';

export const DashboardCharts = ({ chartsData }) => {
  if (!chartsData || !chartsData.daily) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '30px', marginTop: '30px', marginBottom: '30px' }}>
      
      {/* Top Row: Revenue & Orders Charts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '20px' }}>
        
        {/* Revenue Chart */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '16px', color: '#475569', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             📈 Revenue per Day (Last 7 Days)
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <LineChart data={chartsData.daily} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="_id" 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false} 
                  tickFormatter={(val) => `₹${val}`}
                />
                <Tooltip 
                  formatter={(value) => [`₹${value}`, 'Revenue']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Line type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} dot={{ r: 4, strokeWidth: 2 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Orders Chart */}
        <div className="card" style={{ marginBottom: 0 }}>
          <h3 style={{ fontSize: '16px', color: '#475569', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
             📦 Orders per Day (Last 7 Days)
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            <ResponsiveContainer>
              <BarChart data={chartsData.daily} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis 
                  dataKey="_id" 
                  tick={{ fontSize: 12, fill: '#64748b' }} 
                  axisLine={false} 
                  tickLine={false}
                  tickFormatter={(val) => {
                    const date = new Date(val);
                    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                  }}
                />
                <YAxis 
                   tick={{ fontSize: 12, fill: '#64748b' }} 
                   axisLine={false} 
                   tickLine={false}
                   allowDecimals={false}
                />
                <Tooltip 
                  formatter={(value) => [value, 'Orders']}
                  labelFormatter={(label) => new Date(label).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                />
                <Bar dataKey="orders" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={50} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* Bottom Row: Top Selling Products */}
      <div className="card" style={{ marginBottom: 0 }}>
        <h3 style={{ fontSize: '16px', color: '#475569', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          🏆 Top Selling Products
        </h3>
        
        {chartsData.topProducts && chartsData.topProducts.length > 0 ? (
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ width: '100%', minWidth: '600px' }}>
              <thead>
                <tr>
                  <th style={{ background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Rank</th>
                  <th style={{ background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Product Code</th>
                  <th style={{ background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Name</th>
                  <th style={{ background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Units Sold</th>
                  <th style={{ background: '#f8fafc', color: '#64748b', fontWeight: 600, fontSize: '12px', textTransform: 'uppercase' }}>Revenue Generated</th>
                </tr>
              </thead>
              <tbody>
                {chartsData.topProducts.map((prod, index) => (
                  <tr key={prod._id || index} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px 16px', fontWeight: 600, color: index < 3 ? '#f97316' : '#64748b' }}>
                      #{index + 1} {index === 0 ? '👑' : ''}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '4px', fontSize: '13px', fontWeight: 500 }}>
                        {prod._id}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', color: '#334155', fontWeight: 500 }}>{prod.name}</td>
                    <td style={{ padding: '12px 16px', color: '#0f172a', fontWeight: 600 }}>{prod.totalSold}</td>
                    <td style={{ padding: '12px 16px', color: '#16a34a', fontWeight: 600 }}>₹{prod.revenue?.toFixed(2) || '0.00'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
            No completed sales data available yet for top products.
          </div>
        )}
      </div>

    </div>
  );
};
