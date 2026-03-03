import { useState, useEffect } from 'react';
import api from '../utils/api';

const Users = () => {
    const [users, setUsers] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const res = await api.get('/users/admin/all');
            if (res.data.success) {
                setUsers(res.data.data);
                setStats(res.data.stats);
            }
        } catch (err) {
            console.error('Error fetching users:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleBlock = async (id) => {
        try {
            await api.put(`/users/admin/${id}/block`);
            fetchUsers();
        } catch (err) {
            console.error('Error toggling block:', err);
        }
    };

    const deleteUser = async (id, name) => {
        if (!window.confirm(`Delete user "${name}" and all their orders? This cannot be undone.`)) return;
        try {
            await api.delete(`/users/admin/${id}`);
            fetchUsers();
        } catch (err) {
            console.error('Error deleting user:', err);
        }
    };

    const filteredUsers = users.filter(u =>
        u.name?.toLowerCase().includes(search.toLowerCase()) ||
        u.phone?.includes(search)
    );

    const timeAgo = (date) => {
        if (!date) return 'Never';
        const diff = Date.now() - new Date(date).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'Just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 30) return `${days}d ago`;
        return new Date(date).toLocaleDateString();
    };

    if (loading) return <div style={{ padding: 24 }}>Loading users...</div>;

    return (
        <div>
            {/* Stats Cards */}
            {stats && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                    <div style={statCard}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#667eea' }}>{stats.total}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Total Users</div>
                    </div>
                    <div style={statCard}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#10b981' }}>{stats.verified}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Verified</div>
                    </div>
                    <div style={statCard}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#f59e0b' }}>{stats.activeToday}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Active Today</div>
                    </div>
                    <div style={statCard}>
                        <div style={{ fontSize: 24, fontWeight: 700, color: '#ef4444' }}>{stats.blocked}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontWeight: 600 }}>Blocked</div>
                    </div>
                </div>
            )}

            {/* Search */}
            <div style={{ marginBottom: 16 }}>
                <input
                    type="text"
                    placeholder="Search by name or phone..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    style={{
                        padding: '10px 16px',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        fontSize: 14,
                        width: '100%',
                        maxWidth: 300,
                        outline: 'none'
                    }}
                />
            </div>

            {/* Users Table */}
            {filteredUsers.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
                    No users found.
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{
                        width: '100%',
                        borderCollapse: 'collapse',
                        background: 'white',
                        borderRadius: 12,
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                        <thead>
                            <tr style={{ background: '#f1f5f9' }}>
                                <th style={thStyle}>Name</th>
                                <th style={thStyle}>Phone</th>
                                <th style={thStyle}>Orders</th>
                                <th style={thStyle}>Status</th>
                                <th style={thStyle}>Last Login</th>
                                <th style={thStyle}>Joined</th>
                                <th style={thStyle}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.map(user => (
                                <tr key={user._id} style={{ borderBottom: '1px solid #e2e8f0', opacity: user.isBlocked ? 0.6 : 1 }}>
                                    <td style={tdStyle}>
                                        <div style={{ fontWeight: 600 }}>{user.name}</div>
                                        {user.email && <div style={{ fontSize: 11, color: '#94a3b8' }}>{user.email}</div>}
                                    </td>
                                    <td style={tdStyle}>{user.phone}</td>
                                    <td style={tdStyle}>
                                        <span style={{
                                            background: '#dbeafe',
                                            color: '#1e40af',
                                            padding: '3px 10px',
                                            borderRadius: 20,
                                            fontSize: 12,
                                            fontWeight: 600
                                        }}>
                                            {user.orderCount}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        {user.isBlocked ? (
                                            <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>🚫 Blocked</span>
                                        ) : user.isVerified ? (
                                            <span style={{ color: '#10b981', fontSize: 12, fontWeight: 600 }}>✅ Verified</span>
                                        ) : (
                                            <span style={{ color: '#f59e0b', fontSize: 12, fontWeight: 600 }}>⏳ Unverified</span>
                                        )}
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontSize: 13, color: '#64748b' }}>{timeAgo(user.lastLogin)}</span>
                                    </td>
                                    <td style={tdStyle}>
                                        <span style={{ fontSize: 13, color: '#64748b' }}>
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </span>
                                    </td>
                                    <td style={tdStyle}>
                                        <div style={{ display: 'flex', gap: 6 }}>
                                            <button
                                                onClick={() => toggleBlock(user._id)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: 6,
                                                    border: 'none',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    background: user.isBlocked ? '#d1fae5' : '#fee2e2',
                                                    color: user.isBlocked ? '#065f46' : '#991b1b'
                                                }}
                                            >
                                                {user.isBlocked ? 'Unblock' : 'Block'}
                                            </button>
                                            <button
                                                onClick={() => deleteUser(user._id, user.name)}
                                                style={{
                                                    padding: '4px 10px',
                                                    borderRadius: 6,
                                                    border: 'none',
                                                    fontSize: 11,
                                                    fontWeight: 600,
                                                    cursor: 'pointer',
                                                    background: '#fee2e2',
                                                    color: '#dc2626'
                                                }}
                                            >
                                                Delete
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const statCard = {
    background: 'white',
    borderRadius: 12,
    padding: '16px 20px',
    textAlign: 'center',
    boxShadow: '0 1px 3px rgba(0,0,0,0.08)'
};

const thStyle = {
    padding: '12px 14px',
    textAlign: 'left',
    fontSize: 12,
    fontWeight: 600,
    color: '#475569',
    textTransform: 'uppercase'
};

const tdStyle = {
    padding: '12px 14px',
    fontSize: 14
};

export default Users;
