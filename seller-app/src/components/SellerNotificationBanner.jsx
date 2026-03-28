import { useState, useEffect, useRef } from 'react';
import api from '../utils/api';

/**
 * SellerNotificationBanner
 * Polls /orders/seller/alerts every 12s.
 * Tracks dismissed IDs in localStorage so they don't re-appear in the same session.
 * Shows max 3 stacked toast banners (newest on top).
 * Each banner has a "View" button and an "✕" close button.
 */
export default function SellerNotificationBanner({ onView }) {
    const [active, setActive] = useState([]);
    const dismissedRef = useRef(
        new Set(JSON.parse(localStorage.getItem('_sellerDismissed') || '[]'))
    );

    const persist = () => {
        localStorage.setItem(
            '_sellerDismissed',
            JSON.stringify([...dismissedRef.current])
        );
    };

    const dismiss = (id) => {
        dismissedRef.current.add(id);
        persist();
        setActive(prev => prev.filter(a => a.id !== id));
    };

    useEffect(() => {
        let cancelled = false;

        const poll = async () => {
            try {
                const res = await api.get('/orders/seller/alerts');
                if (!res.data.success || cancelled) return;
                const incoming = res.data.data || [];

                // Only show alerts not yet dismissed
                const fresh = incoming.filter(a => !dismissedRef.current.has(a.id));

                setActive(prev => {
                    // Keep existing dismissed-free set, add truly new ones
                    const prevIds = new Set(prev.map(a => a.id));
                    const toAdd = fresh.filter(a => !prevIds.has(a.id));
                    if (toAdd.length === 0) return prev;

                    // Play a subtle sound for new alerts
                    try {
                        const ctx = new (window.AudioContext || window.webkitAudioContext)();
                        const osc = ctx.createOscillator();
                        const gain = ctx.createGain();
                        osc.connect(gain);
                        gain.connect(ctx.destination);
                        osc.frequency.value = 880;
                        gain.gain.setValueAtTime(0.15, ctx.currentTime);
                        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
                        osc.start();
                        osc.stop(ctx.currentTime + 0.35);
                    } catch {}

                    return [...toAdd, ...prev].slice(0, 4); // max 4 banners
                });
            } catch {}
        };

        poll();
        const interval = setInterval(poll, 12000);
        return () => { cancelled = true; clearInterval(interval); };
    }, []);

    if (active.length === 0) return null;

    return (
        <>
            <style>{`
                .snb-wrap {
                    position: fixed;
                    top: 0;
                    left: 0; right: 0;
                    z-index: 9999;
                    display: flex;
                    flex-direction: column;
                    gap: 0;
                    pointer-events: none;
                }
                .snb-banner {
                    pointer-events: all;
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    padding: 13px 16px;
                    background: white;
                    border-bottom: 3px solid #4f46e5;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.14);
                    animation: snb-slide-in 0.35s cubic-bezier(0.16,1,0.3,1) both;
                }
                .snb-banner.return {
                    border-bottom-color: #f59e0b;
                }
                @keyframes snb-slide-in {
                    from { transform: translateY(-110%); opacity: 0; }
                    to   { transform: translateY(0);     opacity: 1; }
                }
                .snb-icon {
                    font-size: 22px;
                    flex-shrink: 0;
                    width: 36px; height: 36px;
                    display: flex; align-items: center; justify-content: center;
                    border-radius: 10px;
                    background: #f1f5f9;
                }
                .snb-icon.new_order { background: #eef2ff; }
                .snb-icon.return_request { background: #fff7ed; }
                .snb-text {
                    flex: 1;
                    min-width: 0;
                }
                .snb-title {
                    font-size: 12px;
                    font-weight: 800;
                    color: #1e293b;
                    margin-bottom: 2px;
                }
                .snb-msg {
                    font-size: 11px;
                    color: #64748b;
                    white-space: nowrap;
                    overflow: hidden;
                    text-overflow: ellipsis;
                }
                .snb-actions {
                    display: flex;
                    align-items: center;
                    gap: 6px;
                    flex-shrink: 0;
                }
                .snb-btn-view {
                    padding: 6px 14px;
                    background: #4f46e5;
                    color: white;
                    border: none;
                    border-radius: 8px;
                    font-size: 12px;
                    font-weight: 700;
                    cursor: pointer;
                    font-family: inherit;
                    white-space: nowrap;
                }
                .snb-btn-view.return_request {
                    background: #f59e0b;
                }
                .snb-btn-close {
                    width: 28px; height: 28px;
                    border-radius: 50%;
                    border: 1.5px solid #e2e8f0;
                    background: white;
                    color: #94a3b8;
                    font-size: 13px;
                    cursor: pointer;
                    display: flex; align-items: center; justify-content: center;
                    font-family: inherit;
                    padding: 0;
                    line-height: 1;
                }
                .snb-btn-close:hover { background: #f1f5f9; color: #475569; }
            `}</style>

            <div className="snb-wrap">
                {active.map(alert => (
                    <div
                        key={alert.id}
                        className={`snb-banner ${alert.type === 'return_request' ? 'return' : ''}`}
                    >
                        <div className={`snb-icon ${alert.type}`}>
                            {alert.type === 'new_order' ? '🛍️' : '↩️'}
                        </div>

                        <div className="snb-text">
                            <div className="snb-title">
                                {alert.type === 'new_order' ? 'New Order Received!' : 'Return Requested'}
                            </div>
                            <div className="snb-msg">{alert.message}</div>
                        </div>

                        <div className="snb-actions">
                            <button
                                className={`snb-btn-view ${alert.type}`}
                                onClick={() => {
                                    dismiss(alert.id);
                                    onView?.(alert.goTo || 'orders');
                                }}
                            >
                                View
                            </button>
                            <button
                                className="snb-btn-close"
                                title="Dismiss"
                                onClick={() => dismiss(alert.id)}
                            >
                                ✕
                            </button>
                        </div>
                    </div>
                ))}
            </div>
        </>
    );
}
