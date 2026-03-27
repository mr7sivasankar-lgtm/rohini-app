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

    // Slider state
    const [slideProgress, setSlideProgress] = useState(0);
    const [isDragging, setIsDragging] = useState(false);
    const sliderRef = React.useRef(null);

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

    // Play sound and reset slider when broadcast changes
    useEffect(() => {
        setSlideProgress(0);
        setIsDragging(false);
        
        if (activeBroadcast) {
            try {
                // Play a bell notification sound
                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                audio.play().catch(e => console.log('Autoplay prevented:', e));
            } catch (err) {}
        }
    }, [activeBroadcast?._id]);

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

    const handlePointerDown = (e) => {
        if (acceptedId === activeBroadcast._id) return;
        setIsDragging(true);
        e.target.setPointerCapture(e.pointerId);
    };

    const handlePointerMove = (e) => {
        if (!isDragging || !sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const thumbWidth = 56; // approximate thumb width
        let newX = e.clientX - rect.left - thumbWidth / 2;
        const maxX = rect.width - thumbWidth;
        
        if (newX < 0) newX = 0;
        if (newX > maxX) newX = maxX;
        
        setSlideProgress(newX / maxX);
    };

    const handlePointerUp = (e) => {
        if (!isDragging) return;
        setIsDragging(false);
        e.target.releasePointerCapture(e.pointerId);
        if (slideProgress > 0.8) {
            setSlideProgress(1);
            handleAccept();
        } else {
            setSlideProgress(0); // snap back
        }
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

                {activeBroadcast.itemsSummary && (
                    <div className="broadcast-shop" style={{ marginBottom: '12px', background: '#f8fafc', padding: '12px' }}>
                        <div className="shop-name" style={{ fontSize: '13px', color: '#64748b' }}>Order Items</div>
                        <div className="shop-address" style={{ fontSize: '14px', color: '#1e293b', fontWeight: 600 }}>{activeBroadcast.itemsSummary}</div>
                    </div>
                )}

                <div className="broadcast-shop">
                    <div className="shop-name">{activeBroadcast.sellerShopName}</div>
                    <div className="shop-address">{activeBroadcast.sellerShopAddress}</div>
                </div>

                <div className="broadcast-actions">
                    <div 
                        className="swipe-container" 
                        ref={sliderRef}
                        style={{ 
                            position: 'relative', 
                            flex: 1, 
                            height: '56px',
                            background: acceptedId === activeBroadcast._id ? 'var(--success)' : 'rgba(34, 197, 94, 0.1)',
                            borderRadius: '14px', 
                            overflow: 'hidden', 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center',
                            border: `1px solid ${acceptedId === activeBroadcast._id ? 'var(--success)' : 'rgba(34, 197, 94, 0.3)'}`
                        }}
                    >
                        {/* Background progress fill */}
                        <div style={{
                            position: 'absolute', left: 0, top: 0, bottom: 0,
                            width: `${slideProgress * 100}%`,
                            background: 'var(--success)',
                            transition: isDragging ? 'none' : 'width 0.3s ease',
                            zIndex: 1
                        }} />
                        
                        {/* Text label */}
                        <div style={{
                            position: 'relative', zIndex: 2,
                            color: (slideProgress > 0.5 || acceptedId === activeBroadcast._id) ? '#fff' : 'var(--success)',
                            fontWeight: 700, fontSize: '16px',
                            transition: 'color 0.2s ease',
                            pointerEvents: 'none'
                        }}>
                            {acceptedId === activeBroadcast._id ? 'Accepting...' : 'Slide to Accept'}
                        </div>
                        
                        {/* Draggable Thumb */}
                        {acceptedId !== activeBroadcast._id && (
                            <div 
                                onPointerDown={handlePointerDown}
                                onPointerMove={handlePointerMove}
                                onPointerUp={handlePointerUp}
                                onPointerCancel={handlePointerUp}
                                style={{
                                    position: 'absolute',
                                    left: `calc(${slideProgress * 100}% - ${slideProgress * 56}px)`,
                                    top: '4px', bottom: '4px',
                                    width: '48px',
                                    background: '#fff',
                                    borderRadius: '10px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                                    cursor: 'grab',
                                    zIndex: 3,
                                    transition: isDragging ? 'none' : 'left 0.3s ease',
                                    touchAction: 'none'
                                }}
                            >
                                <span style={{ color: 'var(--success)', fontWeight: 'bold', fontSize: '18px', pointerEvents: 'none' }}>→</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
