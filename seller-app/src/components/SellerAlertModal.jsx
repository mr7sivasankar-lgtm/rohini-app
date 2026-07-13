import React, { useState, useEffect, useRef } from 'react';
import api from '../utils/api';
import './SellerAlertModal.css';

export default function SellerAlertModal({ onView }) {
    const [activeAlert, setActiveAlert] = useState(null);
    const dismissedRef = useRef(
        new Set(JSON.parse(localStorage.getItem('_sellerDismissed') || '[]'))
    );

    const persist = () => {
        localStorage.setItem(
            '_sellerDismissed',
            JSON.stringify([...dismissedRef.current])
        );
    };

    const handleDismiss = () => {
        if (activeAlert) {
            dismissedRef.current.add(activeAlert.id);
            persist();
            setActiveAlert(null);
        }
    };

    const handleView = () => {
        if (activeAlert) {
            dismissedRef.current.add(activeAlert.id);
            persist();
            onView?.(activeAlert.goTo || 'orders');
            setActiveAlert(null);
        }
    };

    useEffect(() => {
        let cancelled = false;

        const poll = async () => {
            try {
                const res = await api.get('/orders/seller/alerts');
                if (!res.data.success || cancelled) return;
                const incoming = res.data.data || [];

                // Filter out alerts already dismissed
                const fresh = incoming.filter(a => !dismissedRef.current.has(a.id));

                if (fresh.length > 0) {
                    const latest = fresh[0];
                    
                    // If it's a new alert, play notification ringtone and set as active
                    setActiveAlert(prev => {
                        if (!prev || prev.id !== latest.id) {
                            // Play ringing alert sound
                            try {
                                const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3');
                                audio.play().catch(e => console.log('Autoplay prevented:', e));
                            } catch (err) {}
                            return latest;
                        }
                        return prev;
                    });
                } else {
                    setActiveAlert(null);
                }
            } catch (err) {
                console.error('Alert polling failed:', err.message);
            }
        };

        poll();
        const interval = setInterval(poll, 7000); // Poll every 7 seconds for quick response
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    if (!activeAlert) return null;

    return (
        <div className="seller-modal-overlay">
            <div className="seller-modal-card">
                <span className="seller-modal-badge">
                    {activeAlert.type === 'new_order' ? '🛍️ New Order' : '↩️ Return Request'}
                </span>
                
                <div className="seller-modal-icon-ring">
                    {activeAlert.type === 'new_order' ? '🔔' : '⚠️'}
                </div>
                
                <h2 className="seller-modal-title">
                    {activeAlert.type === 'new_order' ? 'New Order Placed!' : 'Return Requested'}
                </h2>
                
                <p className="seller-modal-msg">{activeAlert.message}</p>
                
                <div className="seller-modal-actions">
                    <button className="seller-modal-btn-view" onClick={handleView}>
                        View Details & Process
                    </button>
                    <button className="seller-modal-btn-close" onClick={handleDismiss}>
                        Dismiss Alert
                    </button>
                </div>
            </div>
        </div>
    );
}
