import React, { useState, useEffect } from 'react';
import api from '../utils/api';

export default function Support() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [replyMessage, setReplyMessage] = useState('');
    const [sendingReply, setSendingReply] = useState(false);
    const [filterStatus, setFilterStatus] = useState('All');

    useEffect(() => {
        fetchTickets();
    }, []);

    const fetchTickets = async () => {
        try {
            setLoading(true);
            const response = await api.get('/support/admin/all');
            if (response.data.success) {
                setTickets(response.data.data);
                // Keep selected ticket in sync if it's open
                if (selectedTicket) {
                    const updated = response.data.data.find(t => t._id === selectedTicket._id);
                    if (updated) setSelectedTicket(updated);
                }
            }
        } catch (error) {
            console.error('Error fetching tickets:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyMessage.trim() || !selectedTicket) return;

        try {
            setSendingReply(true);
            const response = await api.post(`/support/admin/${selectedTicket._id}/reply`, {
                message: replyMessage
            });
            if (response.data.success) {
                setReplyMessage('');
                await fetchTickets();
            }
        } catch (error) {
            alert('Failed to send reply');
        } finally {
            setSendingReply(false);
        }
    };

    const handleUpdateStatus = async (ticketId, newStatus) => {
        try {
            const response = await api.put(`/support/admin/${ticketId}/status`, {
                status: newStatus
            });
            if (response.data.success) {
                await fetchTickets();
                alert(`Ticket status updated to ${newStatus}`);
            }
        } catch (error) {
            alert('Failed to update status');
        }
    };

    const filteredTickets = tickets.filter(ticket => {
        if (filterStatus === 'All') return true;
        return ticket.status === filterStatus;
    });

    if (loading && tickets.length === 0) {
        return <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}><div className="spinner"></div></div>;
    }

    return (
        <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '28px', fontWeight: 700, color: '#1e293b' }}>💬 Support Tickets</h1>
                    <p style={{ margin: '4px 0 0 0', color: '#64748b' }}>Resolve issues raised by customers, sellers, and delivery partners.</p>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    {['All', 'Open', 'In Progress', 'Resolved'].map(status => (
                        <button
                            key={status}
                            onClick={() => setFilterStatus(status)}
                            style={{
                                padding: '8px 16px',
                                borderRadius: '8px',
                                border: '1px solid #e2e8f0',
                                backgroundColor: filterStatus === status ? '#3b82f6' : '#fff',
                                color: filterStatus === status ? '#fff' : '#475569',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', height: 'calc(100vh - 220px)', minHeight: '500px' }}>
                {/* Tickets list */}
                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                    border: '1px solid #f1f5f9',
                    overflowY: 'auto',
                    padding: '16px'
                }}>
                    <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: '#334155' }}>Tickets ({filteredTickets.length})</h3>
                    {filteredTickets.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '32px 0', color: '#94a3b8' }}>No tickets found</div>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            {filteredTickets.map(ticket => {
                                const isSelected = selectedTicket?._id === ticket._id;
                                const lastReply = ticket.replies[ticket.replies.length - 1];
                                
                                return (
                                    <div
                                        key={ticket._id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        style={{
                                            padding: '14px',
                                            borderRadius: '10px',
                                            border: `2px solid ${isSelected ? '#3b82f6' : '#f1f5f9'}`,
                                            backgroundColor: isSelected ? '#f8fafc' : '#fff',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s'
                                        }}
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                color: ticket.userModel === 'User' ? '#3b82f6' : ticket.userModel === 'Seller' ? '#10b981' : '#f59e0b',
                                                backgroundColor: ticket.userModel === 'User' ? '#eff6ff' : ticket.userModel === 'Seller' ? '#ecfdf5' : '#fffbeb',
                                                padding: '2px 8px',
                                                borderRadius: '12px'
                                            }}>{ticket.userModel}</span>
                                            
                                            <span style={{
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                color: ticket.status === 'Open' ? '#ef4444' : ticket.status === 'In Progress' ? '#3b82f6' : '#10b981',
                                                backgroundColor: ticket.status === 'Open' ? '#fef2f2' : ticket.status === 'In Progress' ? '#eff6ff' : '#ecfdf5',
                                                padding: '2px 8px',
                                                borderRadius: '12px'
                                            }}>{ticket.status}</span>
                                        </div>
                                        <div style={{ fontWeight: 600, color: '#1e293b', fontSize: '14px', marginBottom: '4px' }}>{ticket.subject}</div>
                                        <div style={{ fontSize: '12px', color: '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {lastReply ? `Support: ${lastReply.message}` : ticket.description}
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '10px', color: '#94a3b8' }}>
                                            <span>{ticket.ticketId}</span>
                                            <span>{new Date(ticket.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Ticket Details Panel */}
                <div style={{
                    backgroundColor: '#fff',
                    borderRadius: '12px',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                    border: '1px solid #f1f5f9',
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'hidden'
                }}>
                    {selectedTicket ? (
                        <>
                            {/* Panel Header */}
                            <div style={{
                                padding: '20px',
                                borderBottom: '1px solid #f1f5f9',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <span style={{ fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>{selectedTicket.ticketId}</span>
                                        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#334155' }}>{selectedTicket.subject}</h2>
                                    </div>
                                    <div style={{ fontSize: '13px', color: '#64748b', marginTop: '4px' }}>
                                        Opened by: <span style={{ fontWeight: 600 }}>{selectedTicket.user?.name || selectedTicket.user?.shopName || 'Unknown User'}</span> ({selectedTicket.user?.phone || 'No phone'})
                                    </div>
                                </div>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        value={selectedTicket.status}
                                        onChange={(e) => handleUpdateStatus(selectedTicket._id, e.target.value)}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            outline: 'none',
                                            fontWeight: 600,
                                            color: '#334155',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        <option value="Open">Open</option>
                                        <option value="In Progress">In Progress</option>
                                        <option value="Resolved">Resolved</option>
                                    </select>
                                    <button
                                        onClick={fetchTickets}
                                        style={{
                                            padding: '8px 12px',
                                            borderRadius: '8px',
                                            border: '1px solid #cbd5e1',
                                            backgroundColor: '#f8fafc',
                                            cursor: 'pointer'
                                        }}
                                        title="Refresh"
                                    >🔄</button>
                                </div>
                            </div>

                            {/* Message History */}
                            <div style={{
                                flex: 1,
                                padding: '20px',
                                overflowY: 'auto',
                                backgroundColor: '#f8fafc',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '16px'
                            }}>
                                {/* Initial Ticket Post */}
                                <div style={{
                                    alignSelf: 'flex-start',
                                    maxWidth: '80%',
                                    backgroundColor: '#fff',
                                    padding: '14px 16px',
                                    borderRadius: '12px',
                                    borderTopLeftRadius: 0,
                                    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                    border: '1px solid #e2e8f0'
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#64748b' }}>
                                        <span style={{ fontWeight: 600 }}>{selectedTicket.user?.name || selectedTicket.user?.shopName || 'User'}</span>
                                        <span>{new Date(selectedTicket.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <div style={{ color: '#334155', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                        {selectedTicket.description}
                                    </div>
                                </div>

                                {/* Replies */}
                                {selectedTicket.replies.map((reply, index) => {
                                    const isAdmin = reply.senderType === 'Admin';
                                    return (
                                        <div
                                            key={index}
                                            style={{
                                                alignSelf: isAdmin ? 'flex-end' : 'flex-start',
                                                maxWidth: '80%',
                                                backgroundColor: isAdmin ? '#e0f2fe' : '#fff',
                                                padding: '14px 16px',
                                                borderRadius: '12px',
                                                borderTopLeftRadius: isAdmin ? '12px' : 0,
                                                borderTopRightRadius: isAdmin ? 0 : '12px',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                                border: `1px solid ${isAdmin ? '#bae6fd' : '#e2e8f0'}`
                                            }}
                                        >
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '11px', color: '#64748b', gap: '20px' }}>
                                                <span style={{ fontWeight: 600 }}>{reply.senderName}</span>
                                                <span>{new Date(reply.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                            <div style={{ color: '#334155', fontSize: '14px', whiteSpace: 'pre-wrap', lineHeight: 1.5 }}>
                                                {reply.message}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Reply Input Form */}
                            <form onSubmit={handleSendReply} style={{
                                padding: '16px',
                                borderTop: '1px solid #f1f5f9',
                                display: 'flex',
                                gap: '12px',
                                alignItems: 'center'
                            }}>
                                <input
                                    type="text"
                                    placeholder="Type your support message..."
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    disabled={sendingReply || selectedTicket.status === 'Resolved'}
                                    style={{
                                        flex: 1,
                                        padding: '12px 16px',
                                        borderRadius: '8px',
                                        border: '1px solid #cbd5e1',
                                        outline: 'none',
                                        fontSize: '14px'
                                    }}
                                />
                                <button
                                    type="submit"
                                    disabled={sendingReply || !replyMessage.trim() || selectedTicket.status === 'Resolved'}
                                    style={{
                                        padding: '12px 24px',
                                        borderRadius: '8px',
                                        border: 'none',
                                        backgroundColor: selectedTicket.status === 'Resolved' ? '#cbd5e1' : '#3b82f6',
                                        color: '#fff',
                                        fontWeight: 600,
                                        cursor: 'pointer',
                                        fontSize: '14px',
                                        transition: 'background-color 0.2s'
                                    }}
                                >
                                    {sendingReply ? 'Sending...' : 'Reply'}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, color: '#94a3b8', padding: '32px' }}>
                            <span style={{ fontSize: '48px', marginBottom: '16px' }}>💬</span>
                            <h3>Select a support ticket to start conversation</h3>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
