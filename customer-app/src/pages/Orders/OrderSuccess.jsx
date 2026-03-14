import { useParams, useNavigate } from 'react-router-dom';
import './OrderSuccess.css';

const OrderSuccess = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();

    return (
        <div className="order-success-page">
            <div className="success-card">
                
                {/* Custom Green Check Icon Box */}
                <div className="custom-success-icon-container">
                    <div className="custom-success-icon">
                        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                    </div>
                </div>

                <h1 className="success-title">Order Placed<br/>Successfully!</h1>
                
                {/* Light Green Banner */}
                <div className="success-info-banner">
                    Your order has been placed and<br/>will be delivered soon.
                </div>

                {/* Gray Order ID Box */}
                <div className="order-id-box">
                    <span className="order-id-label">Order ID</span>
                    <span className="order-id-value">#{orderId || 'ORD17734619531160005'}</span>
                </div>

                {/* Action Buttons */}
                <div className="success-actions">
                    <button className="btn-success-primary" onClick={() => navigate(`/tracking/${orderId}`)}>
                        Track Order
                    </button>
                    <button className="btn-success-outline" onClick={() => navigate('/home')}>
                        Continue Shopping
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
