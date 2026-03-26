import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import Confetti from 'react-confetti';
import './OrderSuccess.css';

const OrderSuccess = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();
    const [windowSize, setWindowSize] = useState({
        width: window.innerWidth,
        height: window.innerHeight,
    });
    const [showConfetti, setShowConfetti] = useState(true);

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({ width: window.innerWidth, height: window.innerHeight });
        };
        window.addEventListener('resize', handleResize);
        
        // Let the confetti blow like crackers for 5 seconds then gently stop
        const timer = setTimeout(() => {
            setShowConfetti(false);
        }, 5000);

        return () => {
            window.removeEventListener('resize', handleResize);
            clearTimeout(timer);
        };
    }, []);

    return (
        <div className="order-success-page">
            <div className="confetti-container">
                <Confetti
                    width={windowSize.width}
                    height={windowSize.height}
                    recycle={showConfetti}
                    numberOfPieces={showConfetti ? 300 : 0}
                    gravity={0.15}
                    colors={['#ff0a54', '#ff477e', '#ff7096', '#ff85a1', '#fbb1bd', '#f9bec7', '#ff99c8', '#fcf6bd', '#d0f4de', '#a9def9', '#e4c1f9']}
                />
            </div>
            
            <div className="success-content-wrapper">
                <div className="success-card modern-glass-card">
                    {/* Custom Green Check Icon Box with Pulse */}
                    <div className="custom-success-icon-container">
                        <div className="custom-success-icon pulse-animation">
                            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                        </div>
                    </div>

                    <h1 className="success-title">Order Placed<br/>Successfully!</h1>
                    
                    {/* Light Green Banner */}
                    <div className="success-info-banner">
                        <div className="info-icon">✨</div>
                        <div className="info-text">Your order is confirmed and will be delivered to you shortly.</div>
                    </div>

                    {/* Gray Order ID Box */}
                    <div className="order-id-box modern-inner-card">
                        <span className="order-id-label">Order Reference</span>
                        <span className="order-id-value">#{orderId || 'ORD17734619531160005'}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="success-actions">
                        <button className="btn-success-primary glass-btn" onClick={() => navigate(`/tracking/${orderId}`)}>
                            Track Order Details
                        </button>
                        <button className="btn-success-outline outline-btn" onClick={() => navigate('/home')}>
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
