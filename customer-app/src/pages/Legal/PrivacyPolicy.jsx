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
                <p className="legal-hero-subtitle">Effective Date: July 14, 2026</p>
            </div>

            {/* Content */}
            <div className="legal-content">
                <div className="legal-intro">
                    <p>
                        This Privacy Policy applies to the Sifito Customer mobile application operated by M Siva Sankar ('Service Provider'). 
                        Sifito is an instant clothing delivery marketplace connecting customers, registered sellers and delivery partners. 
                        By downloading or using the Application you agree to this document.
                    </p>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">01</div>
                        <h3>Eligibility</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Users must be at least 18 years old or use the Application with the consent of a parent or guardian where permitted by law.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">02</div>
                        <h3>Account Registration</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Users must register using a valid mobile number and account registration. You are responsible for maintaining the confidentiality of your account.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">03</div>
                        <h3>Information Collected</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>We may collect information including:</p>
                        <ul className="legal-list">
                            <li>Name</li>
                            <li>Mobile number (if provided)</li>
                            <li>Profile information</li>
                            <li>Address</li>
                            <li>Approximate location</li>
                            <li>Order history</li>
                            <li>Uploaded images</li>
                            <li>Device information and communications</li>
                        </ul>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">04</div>
                        <h3>Location Permission</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Location is used to identify nearby stores, assign deliveries, calculate delivery routes and improve the service.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">05</div>
                        <h3>Use of Information</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Information is used to provide services, improve user experience, prevent fraud, communicate service updates and comply with legal obligations.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">06</div>
                        <h3>Third-Party Services</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>The Application may use:</p>
                        <ul className="legal-list">
                            <li>Google Play Services</li>
                            <li>Firebase Authentication</li>
                            <li>Firebase Cloud Messaging</li>
                            <li>Google Maps APIs</li>
                            <li>Communication service providers</li>
                        </ul>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">07</div>
                        <h3>Orders, Cancellation and Returns</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Orders are subject to seller availability. Customers should provide accurate delivery information. Cancellation, return and exchange eligibility depends on seller policy and applicable consumer laws.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">08</div>
                        <h3>Prohibited Activities</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Users must not submit false information, abuse the platform, interfere with system security, upload unlawful content or attempt unauthorized access.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">09</div>
                        <h3>Data Retention</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Personal information is retained only as long as necessary for operational, legal and regulatory purposes. Users may request deletion where permitted by law.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">10</div>
                        <h3>Security</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Reasonable technical and organizational safeguards are used to protect personal information from unauthorized access or disclosure.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">11</div>
                        <h3>Children's Privacy</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            The Application is not intended for children under 13 years of age and does not knowingly collect information from children.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">12</div>
                        <h3>Intellectual Property</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            All trademarks, logos, software, databases and content remain the property of the Service Provider unless otherwise stated.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">13</div>
                        <h3>Limitation of Liability</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            The Service Provider is not responsible for losses arising from internet failures, third-party services, delays caused by weather, traffic, force majeure or incorrect information supplied by users.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">14</div>
                        <h3>Termination</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Accounts may be suspended or terminated for violations of these terms, fraudulent activity or misuse of the platform.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">15</div>
                        <h3>Changes</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            This document may be updated periodically. Continued use of the Application after changes constitutes acceptance of the revised document.
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
                        <h4>Contact M Siva Sankar</h4>
                        <p>Email: mr7.sivasankar@gmail.com</p>
                        <p>WhatsApp: +91 9700079239</p>
                    </div>
                    <button
                        className="legal-contact-btn"
                        onClick={() => window.open('https://wa.me/919700079239?text=Hi%2C%20I%20have%20a%20privacy%20query%20about%20Sifito.', '_blank')}
                    >
                        Chat Now
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrivacyPolicy;
