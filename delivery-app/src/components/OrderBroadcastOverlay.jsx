import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../utils/api';
import './OrderBroadcastOverlay.css';

export default function OrderBroadcastOverlay() {
    const { partner } = useAuth();
    const navigate = useNavigate();
    const [broadcasts, setBroadcasts] = useState([]);
    const [ignoredIds, setIgnoredIds] = useState([]);
    const [acceptedId, setAcceptedId] = useState(null);

    // Fetch broadcasts periodically
    useEffect(() => {
        let interval;
        if (partner && partner.isOnline) {
            const fetchBroadcasts = async () => {
                try {
                    const res = await api.get('/delivery/broadcasts');
                    if (res.data.success) {
                        setBroadcasts(res.data.data);
                    }
                } catch (err) {
                    console.error('Failed to fetch broadcasts', err);
                }
            };
            
            // Fetch immediately
            fetchBroadcasts();
            // Then poll every 5 seconds
            interval = setInterval(fetchBroadcasts, 5000);
        }
        return () => clearInterval(interval);
    }, [partner]);

    const activeBroadcast = broadcasts.find(b => !ignoredIds.includes(b._id) && b._id !== acceptedId);

    if (!activeBroadcast) return null;

    const handleAccept = async () => {
        try {
            setAcceptedId(activeBroadcast._id);
            const res = await api.post(`/delivery/broadcasts/${activeBroadcast._id}/accept`);
            if (res.data.success) {
                // Remove from local list
                setBroadcasts(prev => prev.filter(b => b._id !== activeBroadcast._id));
                navigate(`/order/${activeBroadcast._id}`);
            } else {
                alert(res.data.message || 'Error accepting order');
                setIgnoredIds(prev => [...prev, activeBroadcast._id]);
            }
        } catch (err) {
            alert(err.response?.data?.message || 'Order might have been accepted by someone else.');
            setIgnoredIds(prev => [...prev, activeBroadcast._id]);
        } finally {
            setAcceptedId(null);
        }
    };

    const handleIgnore = () => {
        setIgnoredIds(prev => [...prev, activeBroadcast._id]);
    };

    return (
        <div className="broadcast-overlay">
            <div className="broadcast-card">
                <div className="broadcast-header">
                    <div className="broadcast-subtitle">New {activeBroadcast.deliveryType} Request</div>
                    <div className="broadcast-earning">₹{activeBroadcast.deliveryFee}</div>
                    <div className="broadcast-subtitle">Est. Earning</div>
                </div>

                <div className="broadcast-details">
                    <div className="broadcast-detail-item">
                        <div className="detail-icon">🏪</div>
                        <div className="detail-value">{activeBroadcast.pickupKm} km</div>
                        <div className="detail-label">Pickup</div>
                    </div>
                    <div className="broadcast-detail-item">
                        <div className="detail-icon">📍</div>
                        <div className="detail-value">{activeBroadcast.deliveryKm} km</div>
                        <div className="detail-label">Drop-off</div>
                    </div>
                </div>

                <div className="broadcast-shop">
                    <div className="shop-name">{activeBroadcast.sellerShopName}</div>
                    <div className="shop-address">{activeBroadcast.sellerShopAddress}</div>
                </div>

                <div className="broadcast-actions">
                    <button className="btn-ignore" onClick={handleIgnore}>Pass</button>
                    <button className="btn-accept" onClick={handleAccept} disabled={acceptedId === activeBroadcast._id}>
                        {acceptedId === activeBroadcast._id ? 'Accepting...' : 'Accept Order'}
                    </button>
                </div>
            </div>
        </div>
    );
}
