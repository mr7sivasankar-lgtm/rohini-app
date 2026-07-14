import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../../utils/api';
import { useAuth } from '../../contexts/AuthContext';
import './Auth.css';

/* ── Seller Legal Content ── */
const PRIVACY_POLICY = {
    title: 'Seller Privacy Policy',
    lastUpdated: 'July 14, 2026',
    intro: "This Privacy Policy applies to the Sifito Seller mobile application operated by M Siva Sankar ('Service Provider'). Sifito is an instant clothing delivery marketplace connecting customers, registered sellers and delivery partners. By downloading or using the Application you agree to this document.",
    sections: [
        {
            heading: '1. Eligibility',
            body: 'Users must be at least 18 years old or use the Application with the consent of a parent or guardian where permitted by law.'
        },
        {
            heading: '2. Account Registration',
            body: 'Users must register using a valid mobile number and account registration. You are responsible for maintaining the confidentiality of your account.'
        },
        {
            heading: '3. Information Collected',
            body: 'We may collect your name, mobile number (if provided), profile information, address, approximate location, order history, uploaded images, device information and communications.'
        },
        {
            heading: '4. Location Permission',
            body: 'Location is used to identify nearby stores, assign deliveries, calculate delivery routes and improve the service.'
        },
        {
            heading: '5. Use of Information',
            body: 'Information is used to provide services, improve user experience, prevent fraud, communicate service updates and comply with legal obligations.'
        },
        {
            heading: '6. Third-Party Services',
            body: 'The Application may use Google Play Services, Firebase Authentication, Firebase Cloud Messaging, Google Maps APIs and communication service providers.'
        },
        {
            heading: '7. Seller Responsibilities',
            body: 'Sellers must maintain accurate inventory, lawful pricing, genuine products, timely order fulfilment, and comply with applicable tax and consumer protection laws. Counterfeit or prohibited products are not permitted.'
        },
        {
            heading: '8. Prohibited Activities',
            body: 'Users must not submit false information, abuse the platform, interfere with system security, upload unlawful content or attempt unauthorized access.'
        },
        {
            heading: '9. Data Retention',
            body: 'Personal information is retained only as long as necessary for operational, legal and regulatory purposes. Users may request deletion where permitted by law.'
        },
        {
            heading: '10. Security',
            body: 'Reasonable technical and organizational safeguards are used to protect personal information from unauthorized access or disclosure.'
        },
        {
            heading: '11. Children\'s Privacy',
            body: 'The Application is not intended for children under 13 years of age and does not knowingly collect information from children.'
        },
        {
            heading: '12. Intellectual Property',
            body: 'All trademarks, logos, software, databases and content remain the property of the Service Provider unless otherwise stated.'
        },
        {
            heading: '13. Limitation of Liability',
            body: 'The Service Provider is not responsible for losses arising from internet failures, third-party services, delays caused by weather, traffic, force majeure or incorrect information supplied by users.'
        },
        {
            heading: '14. Termination',
            body: 'Accounts may be suspended or terminated for violations of these terms, fraudulent activity or misuse of the platform.'
        },
        {
            heading: '15. Changes',
            body: 'This document may be updated periodically. Continued use of the Application after changes constitutes acceptance of the revised document.'
        },
        {
            heading: '16. Contact Us',
            body: 'Email: mr7.sivasankar@gmail.com\nWhatsApp Support: +91 9700079239'
        }
    ]
};

const TERMS_CONDITIONS = {
    title: 'Seller Terms & Conditions',
    lastUpdated: 'July 14, 2026',
    intro: "This Terms and Conditions applies to the Sifito Seller mobile application operated by M Siva Sankar ('Service Provider'). Sifito is an instant clothing delivery marketplace connecting customers, registered sellers and delivery partners. By downloading or using the Application you agree to this document.",
    sections: [
        {
            heading: '1. Eligibility',
            body: 'Users must be at least 18 years old or use the Application with the consent of a parent or guardian where permitted by law.'
        },
        {
            heading: '2. Account Registration',
            body: 'Users must register using a valid mobile number and account registration. You are responsible for maintaining the confidentiality of your account.'
        },
        {
            heading: '3. Information Collected',
            body: 'We may collect your name, mobile number (if provided), profile information, address, approximate location, order history, uploaded images, device information and communications.'
        },
        {
            heading: '4. Location Permission',
            body: 'Location is used to identify nearby stores, assign deliveries, calculate delivery routes and improve the service.'
        },
        {
            heading: '5. Use of Information',
            body: 'Information is used to provide services, improve user experience, prevent fraud, communicate service updates and comply with legal obligations.'
        },
        {
            heading: '6. Third-Party Services',
            body: 'The Application may use Google Play Services, Firebase Authentication, Firebase Cloud Messaging, Google Maps APIs and communication service providers.'
        },
        {
            heading: '7. Seller Responsibilities',
            body: 'Sellers must maintain accurate inventory, lawful pricing, genuine products, timely order fulfilment, and comply with applicable tax and consumer protection laws. Counterfeit or prohibited products are not permitted.'
        },
        {
            heading: '8. Prohibited Activities',
            body: 'Users must not submit false information, abuse the platform, interfere with system security, upload unlawful content or attempt unauthorized access.'
        },
        {
            heading: '9. Intellectual Property',
            body: 'All trademarks, logos, software, databases and content remain the property of the Service Provider unless otherwise stated.'
        },
        {
            heading: '10. Limitation of Liability',
            body: 'The Service Provider is not responsible for losses arising from internet failures, third-party services, delays caused by weather, traffic, force majeure or incorrect information supplied by users.'
        },
        {
            heading: '11. Termination',
            body: 'Accounts may be suspended or terminated for violations of these terms, fraudulent activity or misuse of the platform.'
        },
        {
            heading: '12. Changes',
            body: 'This document may be updated periodically. Continued use of the Application after changes constitutes acceptance of the revised document.'
        },
        {
            heading: '13. Contact Us',
            body: 'Email: mr7.sivasankar@gmail.com\nWhatsApp Support: +91 9700079239'
        }
    ]
};

/* ── Legal Modal Component ── */
const LegalModal = ({ data, onClose }) => {
    if (!data) return null;
    return (
        <>
            <div
                onClick={onClose}
                style={{
                    position: 'fixed', inset: 0,
                    background: 'rgba(0,0,0,0.45)',
                    backdropFilter: 'blur(3px)',
                    zIndex: 9998,
                    animation: 'legalFadeIn 0.25s ease',
                }}
            />
            <div style={{
                position: 'fixed',
                left: 0, right: 0, bottom: 0,
                background: '#fff',
                borderRadius: '24px 24px 0 0',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '85vh',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
                animation: 'legalSlideUp 0.32s cubic-bezier(0.16,1,0.3,1)',
            }}>
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
                </div>

                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 20px 12px',
                    borderBottom: '1px solid #f1f5f9',
                }}>
                    <div>
                        <h2 style={{ fontSize: 18, fontWeight: 700, color: '#0f172a', margin: 0 }}>{data.title}</h2>
                        <p style={{ fontSize: 12, color: '#94a3b8', margin: '2px 0 0', fontWeight: 400 }}>Last updated: {data.lastUpdated}</p>
                    </div>
                    <button
                        onClick={onClose}
                        style={{
                            background: '#f1f5f9', border: 'none', borderRadius: '50%',
                            width: 36, height: 36, display: 'flex', alignItems: 'center',
                            justifyContent: 'center', cursor: 'pointer', flexShrink: 0,
                        }}
                    >
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>

                <div style={{ overflowY: 'auto', padding: '16px 20px 32px', flex: 1 }}>
                    <p style={{ fontSize: 13, color: '#64748b', lineHeight: 1.6, marginBottom: 16 }}>{data.intro}</p>
                    {data.sections.map((sec, idx) => (
                        <div key={idx} style={{ marginBottom: 20 }}>
                            <h3 style={{
                                fontSize: 14, fontWeight: 700, color: '#0f172a',
                                margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{
                                    display: 'inline-block', width: 6, height: 6,
                                    borderRadius: '50%', background: '#4f46e5', flexShrink: 0,
                                }} />
                                {sec.heading}
                            </h3>
                            <p style={{
                                fontSize: 13, color: '#475569', lineHeight: 1.6,
                                margin: 0, paddingLeft: 14, whiteSpace: 'pre-line'
                            }}>
                                {sec.body}
                            </p>
                        </div>
                    ))}
                </div>

                <div style={{ padding: '0 20px 28px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '14px',
                            background: 'linear-gradient(135deg, #312e81 0%, #4f46e5 100%)',
                            color: '#fff', border: 'none', borderRadius: 14,
                            fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(79,70,229,0.3)',
                        }}
                    >
                        I Accept
                    </button>
                </div>
            </div>

            <style>{`
                @keyframes legalFadeIn  { from { opacity: 0; } to { opacity: 1; } }
                @keyframes legalSlideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
            `}</style>
        </>
    );
};

const Login = () => {
    const [phone, setPhone] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [legalModal, setLegalModal] = useState(null); // null | PRIVACY_POLICY | TERMS_CONDITIONS

    const { checkAuth } = useAuth();
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (!/^\d{10}$/.test(phone)) {
            setError('Please enter a valid 10-digit phone number.');
            return;
        }
        setIsLoading(true);
        try {
            const res = await api.post('/sellers/login-phone', { phone: `+91${phone}` });
            if (res.data.success) {
                localStorage.setItem('sellerToken', res.data.data.token);
                await checkAuth();
                navigate('/dashboard');
            } else {
                setError(res.data.message || 'Login failed. Please try again.');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Login failed. Check your phone number.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <div className="auth-brand">
                    <span className="brand-icon">🏪</span>
                    <h2>Seller Portal</h2>
                    <p>Manage your shop and orders</p>
                </div>

                {error && <div className="alert alert-error">{error}</div>}

                <form onSubmit={handleLogin} className="auth-form">
                    <div className="form-group phone-input-wrapper">
                        <label>Phone Number</label>
                        <div className="phone-row">
                            <span className="phone-prefix">+91</span>
                            <input
                                type="tel"
                                placeholder="Enter your phone number"
                                value={phone}
                                onChange={e => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                                autoComplete="off"
                                autoFocus
                                required
                            />
                        </div>
                    </div>

                    <button type="submit" className="btn-primary" disabled={isLoading}>
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>

                    <div style={{ textAlign: 'center', fontSize: '12px', color: '#64748b', marginTop: '16px', lineHeight: '1.5' }}>
                        By continuing, you agree to our{' '}
                        <button
                            type="button"
                            onClick={() => setLegalModal(TERMS_CONDITIONS)}
                            style={{
                                background: 'none', border: 'none', padding: 0,
                                color: '#4f46e5', fontWeight: 700, fontSize: 12,
                                cursor: 'pointer', textDecoration: 'underline',
                                textUnderlineOffset: 2,
                            }}
                        >
                            Terms &amp; Conditions
                        </button>
                        {' '}and{' '}
                        <button
                            type="button"
                            onClick={() => setLegalModal(PRIVACY_POLICY)}
                            style={{
                                background: 'none', border: 'none', padding: 0,
                                color: '#4f46e5', fontWeight: 700, fontSize: 12,
                                cursor: 'pointer', textDecoration: 'underline',
                                textUnderlineOffset: 2,
                            }}
                        >
                            Privacy Policy
                        </button>
                    </div>

                    <div className="auth-footer" style={{ marginTop: '20px' }}>
                        <p>Don't have a seller account? <Link to="/register">Register your shop</Link></p>
                    </div>
                </form>
            </div>

            <LegalModal data={legalModal} onClose={() => setLegalModal(null)} />
        </div>
    );
};

export default Login;

