import { useParams, useNavigate } from 'react-router-dom';
import './OrderSuccess.css';

const OrderSuccess = () => {
    const { orderId } = useParams();
    const navigate = useNavigate();

    return (
        <div className="order-success-page">
            <div className="success-card">
                <div className="success-icon">✅</div>
                <h1 className="success-title">Order Placed Successfully!</h1>
                <p className="success-message">
                    Your order has been placed and will be delivered soon.
                </p>

                <div className="order-id-box">
                    <span className="order-id-label">Order ID</span>
                    <span className="order-id-value">#{orderId}</span>
                </div>

                <div className="success-actions">
                    <button className="btn btn-primary btn-lg" onClick={() => navigate(`/tracking/${orderId}`)}>
                        Track Order
                    </button>
                    <button className="btn btn-secondary" onClick={() => navigate('/home')}>
                        Continue Shopping
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OrderSuccess;
