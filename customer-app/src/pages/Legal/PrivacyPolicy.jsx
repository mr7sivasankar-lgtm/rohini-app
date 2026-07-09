import { useNavigate } from 'react-router-dom';
import './Legal.css';

const PrivacyPolicy = () => {
    const navigate = useNavigate();

    return (
        <div className="legal-page">
            {/* Header */}
            <div className="legal-header">
                <button className="icon-btn" onClick={() => navigate(-1)} aria-label="Go back">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className="legal-title">Privacy Policy</h1>
                <div style={{ width: 40 }} />
            </div>

            {/* Hero Banner */}
            <div className="legal-hero">
                <div className="legal-hero-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                </div>
                <h2 className="legal-hero-title">Your Privacy Matters</h2>
                <p className="legal-hero-subtitle">Effective Date: July 9, 2026</p>
            </div>

            {/* Content */}
            <div className="legal-content">

                <div className="legal-intro">
                    <p>
                        Welcome to <strong>Sifito</strong>. We value your privacy and are committed to protecting your personal
                        information. This Privacy Policy explains how we collect, use, and safeguard your information
                        when you use the Sifito mobile application.
                    </p>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">01</div>
                        <h3>Information We Collect</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>To provide our services, we may collect the following information:</p>
                        <ul className="legal-list">
                            <li>Full Name</li>
                            <li>Mobile Number</li>
                            <li>Email Address (optional)</li>
                            <li>Delivery Address</li>
                            <li>Device Location (only with your permission)</li>
                            <li>Device Information (such as device model, operating system, and app version)</li>
                            <li>Order History</li>
                            <li>App usage information for improving our services</li>
                        </ul>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">02</div>
                        <h3>How We Use Your Information</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>Your information is used to:</p>
                        <ul className="legal-list">
                            <li>Create and manage your account.</li>
                            <li>Deliver your clothing orders.</li>
                            <li>Contact you regarding your orders.</li>
                            <li>Improve our application and customer experience.</li>
                            <li>Provide customer support.</li>
                            <li>Prevent fraud and misuse of our services.</li>
                            <li>Comply with legal obligations.</li>
                        </ul>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">03</div>
                        <h3>Location Permission</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>Sifito requests access to your device location only to:</p>
                        <ul className="legal-list">
                            <li>Detect your delivery location.</li>
                            <li>Show nearby delivery availability.</li>
                            <li>Improve delivery accuracy.</li>
                        </ul>
                        <p className="mt-1">
                            You can disable location access at any time through your device settings. Some features may not function correctly without location access.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">04</div>
                        <h3>Payments</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Currently, <strong>Sifito does not support online payments</strong>. Payment, if applicable, is collected through the available payment method offered during delivery or as communicated by the seller. Since we do not process online payments, we do not collect or store your bank account, debit card, credit card, or UPI information.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">05</div>
                        <h3>Sharing Your Information</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>We may share limited information with:</p>
                        <ul className="legal-list">
                            <li>Delivery partners for completing deliveries.</li>
                            <li>Store partners to process your orders.</li>
                            <li>Government authorities if required by law.</li>
                        </ul>
                        <p className="mt-1">We never sell, rent, or trade your personal information to third parties.</p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">06</div>
                        <h3>Data Security</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            We use reasonable administrative and technical measures to protect your personal information. However, no method of electronic storage or internet transmission is completely secure.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">07</div>
                        <h3>Data Retention</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Your information is retained only as long as necessary to provide our services, comply with legal requirements, resolve disputes, and enforce our policies.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">08</div>
                        <h3>Your Rights</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>You may:</p>
                        <ul className="legal-list">
                            <li>Update your profile information.</li>
                            <li>Request correction of inaccurate information.</li>
                            <li>Request deletion of your account, subject to legal obligations.</li>
                            <li>Withdraw location permission through your device settings.</li>
                        </ul>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">09</div>
                        <h3>Children's Privacy</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Sifito is not intended for children under the age of 13. We do not knowingly collect personal information from children.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">10</div>
                        <h3>Changes to This Policy</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            We may update this Privacy Policy from time to time. Updated versions will be available within the application.
                        </p>
                    </div>
                </div>

                {/* Contact Card */}
                <div className="legal-contact-card">
                    <div className="legal-contact-icon">
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                        </svg>
                    </div>
                    <div className="legal-contact-text">
                        <h4>Sifito Customer Support</h4>
                        <p>WhatsApp: +91 9700079239</p>
                    </div>
                    <button
                        className="legal-contact-btn"
                        onClick={() => window.open('https://wa.me/919700079239?text=Hi%2C%20I%20have%20a%20privacy%20query%20about%20Sifito.', '_blank')}
                    >
                        Contact Us
                    </button>
                </div>

            </div>
        </div>
    );
};

export default PrivacyPolicy;
