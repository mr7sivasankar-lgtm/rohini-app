import { useState, useEffect } from 'react';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

const ReviewsTab = () => {
    const { seller } = useAuth();
    const [reviews, setReviews] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReviews = async () => {
            try {
                const res = await api.get('/sellers/my/reviews');
                if (res.data.success) {
                    setReviews(res.data.data);
                }
            } catch (error) {
                console.error('Failed to fetch reviews:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchReviews();
    }, []);

    if (loading) return <div className="loading"><div className="spinner" style={{borderTopColor: '#4f46e5'}}></div></div>;

    // Calculate rating distribution
    const ratingDist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach(r => {
        if (r.rating >= 1 && r.rating <= 5) ratingDist[r.rating]++;
    });

    return (
        <div className="reviews-tab">
            <div className="section-header" style={{ marginBottom: '24px' }}>
                <h2>Customer Reviews</h2>
                <p>See what customers are saying about your products</p>
            </div>

            {/* Shop Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '24px', marginBottom: '32px' }}>
                <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ fontSize: '48px', fontWeight: 700, color: '#f59e0b', lineHeight: 1 }}>
                        {seller?.rating?.toFixed(1) || '0.0'}
                    </div>
                    <div style={{ display: 'flex', gap: '4px', margin: '12px 0 8px', color: '#fbbf24', fontSize: '20px' }}>
                        {'★'.repeat(Math.round(seller?.rating || 0))}{'☆'.repeat(5 - Math.round(seller?.rating || 0))}
                    </div>
                    <div style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>
                        Based on {seller?.numReviews || 0} Shop Reviews
                    </div>
                </div>

                <div style={{ background: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ margin: '0 0 16px', fontSize: '16px', color: '#1e293b' }}>Product Rating Distribution</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {[5, 4, 3, 2, 1].map(stars => {
                            const count = ratingDist[stars];
                            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                            return (
                                <div key={stars} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ width: '40px', fontSize: '14px', color: '#475569', fontWeight: 500 }}>{stars} ★</div>
                                    <div style={{ flex: 1, height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${percentage}%`, height: '100%', background: '#f59e0b', borderRadius: '4px' }}></div>
                                    </div>
                                    <div style={{ width: '40px', fontSize: '13px', color: '#64748b', textAlign: 'right' }}>{count}</div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Reviews List */}
            <h3 style={{ margin: '0 0 16px', fontSize: '18px', color: '#1e293b' }}>All Product Reviews ({reviews.length})</h3>
            
            {reviews.length === 0 ? (
                <div style={{ background: 'white', padding: '40px', borderRadius: '16px', border: '1px solid #e2e8f0', textAlign: 'center' }}>
                    <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
                    <div style={{ color: '#64748b' }}>No reviews yet for any of your products.</div>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {reviews.map(review => (
                        <div key={review._id} style={{ background: 'white', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                <div>
                                    <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '15px' }}>{review.user?.name || 'Anonymous Customer'}</div>
                                    <div style={{ color: '#94a3b8', fontSize: '12px', marginTop: '2px' }}>
                                        {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>
                                <div style={{ background: '#fef3c7', padding: '4px 10px', borderRadius: '20px', color: '#d97706', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    ★ {review.rating}
                                </div>
                            </div>

                            <p style={{ margin: '0 0 16px', color: '#334155', fontSize: '14px', lineHeight: '1.6' }}>
                                "{review.comment}"
                            </p>

                            <div style={{ display: 'inline-flex', padding: '6px 12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '13px', color: '#475569', fontWeight: 500 }}>
                                📦 Product: {review.product?.name || 'Unknown Product'}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ReviewsTab;
