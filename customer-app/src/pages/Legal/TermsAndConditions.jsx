import { useNavigate } from 'react-router-dom';
import './Legal.css';

const TermsAndConditions = () => {
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
                <h1 className="legal-title">Terms & Conditions</h1>
                <div style={{ width: 40 }} />
            </div>

            {/* Hero Banner */}
            <div className="legal-hero legal-hero--terms">
                <div className="legal-hero-icon">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                        <polyline points="14 2 14 8 20 8" />
                        <line x1="16" y1="13" x2="8" y2="13" />
                        <line x1="16" y1="17" x2="8" y2="17" />
                        <polyline points="10 9 9 9 8 9" />
                    </svg>
                </div>
                <h2 className="legal-hero-title">Terms of Service</h2>
                <p className="legal-hero-subtitle">Effective Date: July 9, 2026</p>
            </div>

            {/* Content */}
            <div className="legal-content">

                <div className="legal-intro">
                    <p>
                        Welcome to <strong>Sifito</strong>. By accessing or using the Sifito mobile application, you agree to these Terms and Conditions.
                    </p>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">01</div>
                        <h3>Acceptance</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            By creating an account or using Sifito, you agree to comply with these Terms and all applicable laws.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">02</div>
                        <h3>User Account</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>You agree to:</p>
                        <ul className="legal-list">
                            <li>Provide accurate and complete information.</li>
                            <li>Keep your login credentials secure.</li>
                            <li>Be responsible for all activities performed through your account.</li>
                        </ul>
                        <p className="mt-1">
                            Sifito reserves the right to suspend or terminate accounts that violate these Terms.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">03</div>
                        <h3>Orders</h3>
                    </div>
                    <div className="legal-section-body">
                        <ul className="legal-list">
                            <li>Orders are subject to product availability.</li>
                            <li>Product availability may change without prior notice.</li>
                            <li>Prices and offers may change at any time.</li>
                            <li>Stores reserve the right to reject or cancel orders due to stock unavailability or other operational reasons.</li>
                        </ul>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">04</div>
                        <h3>Delivery</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>Estimated delivery times are provided for convenience only and may vary due to:</p>
                        <ul className="legal-list">
                            <li>Traffic conditions</li>
                            <li>Weather conditions</li>
                            <li>High order volume</li>
                            <li>Operational delays</li>
                        </ul>
                        <p className="mt-1">
                            Sifito is not liable for delays caused by circumstances beyond our reasonable control.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">05</div>
                        <h3>Payments</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Currently, <strong>Sifito does not provide online payment facilities</strong>.
                        </p>
                        <p className="mt-1">
                            Any payment, if applicable, will be completed using the payment method made available during delivery or as communicated by the seller.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">06</div>
                        <h3>Order Cancellation</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Orders may be cancelled before the seller starts processing the order. Once an order has been confirmed or prepared for delivery, cancellation may not be possible.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">07</div>
                        <h3>User Responsibilities</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>Users must not:</p>
                        <ul className="legal-list">
                            <li>Provide false or misleading information.</li>
                            <li>Misuse promotional offers.</li>
                            <li>Attempt unauthorized access to the application.</li>
                            <li>Use the application for illegal activities.</li>
                            <li>Abuse or harass delivery personnel, store partners, or customer support.</li>
                        </ul>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">08</div>
                        <h3>Intellectual Property</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            All trademarks, logos, application designs, graphics, and content available in Sifito are the exclusive property of Sifito and may not be copied, reproduced, or distributed without written permission.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">09</div>
                        <h3>Limitation of Liability</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>Sifito is not responsible for:</p>
                        <ul className="legal-list">
                            <li>Temporary service interruptions.</li>
                            <li>Delayed deliveries beyond our control.</li>
                            <li>Product quality issues caused by sellers or stores.</li>
                            <li>User losses resulting from incorrect information provided by the user.</li>
                        </ul>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">10</div>
                        <h3>Account Suspension</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            We reserve the right to suspend or permanently terminate any account found violating these Terms or engaging in fraudulent or illegal activities.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">11</div>
                        <h3>Changes to Terms</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            Sifito may update these Terms and Conditions at any time. Continued use of the application after changes are published constitutes acceptance of the updated Terms.
                        </p>
                    </div>
                </div>

                <div className="legal-section">
                    <div className="legal-section-header">
                        <div className="legal-section-number">12</div>
                        <h3>Governing Law</h3>
                    </div>
                    <div className="legal-section-body">
                        <p>
                            These Terms and Conditions are governed by the laws of India. Any disputes arising from the use of the application shall be subject to the jurisdiction of the competent courts in Andhra Pradesh, India.
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
                        onClick={() => window.open('https://wa.me/919700079239?text=Hi%2C%20I%20have%20a%20query%20about%20Sifito%20Terms.', '_blank')}
                    >
                        Contact Us
                    </button>
                </div>

            </div>
        </div>
    );
};

export default TermsAndConditions;
