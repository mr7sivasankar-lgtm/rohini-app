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
                <button className="btn-close-broadcast" onClick={handleIgnore}>✖</button>
                <div className="broadcast-header">
                    <div className="broadcast-subtitle">New {activeBroadcast.deliveryType} Request</div>
                    <div className="broadcast-earning">₹{activeBroadcast.deliveryFee}</div>
                    <div className="broadcast-subtitle">Est. Earning</div>
                </div>

                <div className="broadcast-details">
                    <div className="broadcast-detail-item item-pickup">
                        <div className="detail-icon">🏪</div>
                        <div className="detail-value">{activeBroadcast.pickupKm} <span style={{fontSize:'16px'}}>km</span></div>
                        <div className="detail-label">Pickup</div>
                    </div>
                    <div className="broadcast-detail-item item-dropoff">
                        <div className="detail-icon">📍</div>
                        <div className="detail-value">{activeBroadcast.deliveryKm} <span style={{fontSize:'16px'}}>km</span></div>
                        <div className="detail-label">Drop-off</div>
                    </div>
                </div>

                {activeBroadcast.itemsSummary && (
                    <div className="broadcast-info-box">
                        <div className="info-label">🛍️ Order Items</div>
                        <div className="info-value">{activeBroadcast.itemsSummary}</div>
                    </div>
                )}

                <div className="broadcast-info-box">
                    <div className="info-label">🏬 Pickup Location</div>
                    <div className="info-value">{activeBroadcast.sellerShopName}</div>
                    <div className="info-sub">{activeBroadcast.sellerShopAddress}</div>
                </div>

                <div 
                    className="swipe-container" 
                    ref={sliderRef}
                    style={{ border: acceptedId === activeBroadcast._id ? '2px solid #10b981' : 'none' }}
                >
                    <div className="swipe-fill" style={{ width: `${slideProgress * 100}%`, transition: isDragging ? 'none' : 'width 0.3s ease' }} />
                    <div className="swipe-text" style={{ color: (slideProgress > 0.5 || acceptedId === activeBroadcast._id) ? '#fff' : '#10b981' }}>
                        {acceptedId === activeBroadcast._id ? 'Accepting...' : 'Slide to Accept'}
                    </div>
                    {acceptedId !== activeBroadcast._id && (
                        <div className="swipe-thumb"
                            onPointerDown={handlePointerDown}
                            onPointerMove={handlePointerMove}
                            onPointerUp={handlePointerUp}
                            onPointerCancel={handlePointerUp}
                            style={{
                                left: `calc(${slideProgress * 100}% - ${slideProgress * 52}px)`,
                                transition: isDragging ? 'none' : 'left 0.3s ease'
                            }}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
