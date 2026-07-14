import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Legal.css';

export default function Legal() {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('terms');

    const deliveryTerms = [
        { num: '01', title: 'Eligibility', body: 'Users must be at least 18 years old or use the Application with the consent of a parent or guardian where permitted by law.' },
        { num: '02', title: 'Account Registration', body: 'Users must register using a valid mobile number and account registration. You are responsible for maintaining the confidentiality of your account.' },
        { num: '03', title: 'Information Collected', body: 'We may collect your name, mobile number (if provided), profile information, address, approximate location, order history, uploaded images, device information and communications.' },
        { num: '04', title: 'Location Permission', body: 'Location is used to identify nearby stores, assign deliveries, calculate delivery routes and improve the service.' },
        { num: '05', title: 'Use of Information', body: 'Information is used to provide services, improve user experience, prevent fraud, communicate service updates and comply with legal obligations.' },
        { num: '06', title: 'Third-Party Services', body: 'The Application may use Google Play Services, Firebase Authentication, Firebase Cloud Messaging, Google Maps APIs and communication service providers.' },
        { num: '07', title: 'Delivery Partner Responsibilities', body: 'Delivery partners must safely transport orders, follow traffic regulations, maintain professional conduct, protect customer information and promptly update delivery status.' },
        { num: '08', title: 'Prohibited Activities', body: 'Users must not submit false information, abuse the platform, interfere with system security, upload unlawful content or attempt unauthorized access.' },
        { num: '09', title: 'Intellectual Property', body: 'All trademarks, logos, software, databases and content remain the property of the Service Provider unless otherwise stated.' },
        { num: '10', title: 'Limitation of Liability', body: 'The Service Provider is not responsible for losses arising from internet failures, third-party services, delays caused by weather, traffic, force majeure or incorrect information supplied by users.' },
        { num: '11', title: 'Termination', body: 'Accounts may be suspended or terminated for violations of these terms, fraudulent activity or misuse of the platform.' },
        { num: '12', title: 'Changes', body: 'This document may be updated periodically. Continued use of the Application after changes constitutes acceptance of the revised document.' },
    ];

    const deliveryPrivacy = [
        { num: '01', title: 'Eligibility', body: 'Users must be at least 18 years old or use the Application with the consent of a parent or guardian where permitted by law.' },
        { num: '02', title: 'Account Registration', body: 'Users must register using a valid mobile number and account registration. You are responsible for maintaining the confidentiality of your account.' },
        { num: '03', title: 'Information Collected', body: 'We may collect your name, mobile number (if provided), profile information, address, approximate location, order history, uploaded images, device information and communications.' },
        { num: '04', title: 'Location Permission', body: 'Location is used to identify nearby stores, assign deliveries, calculate delivery routes and improve the service.' },
        { num: '05', title: 'Use of Information', body: 'Information is used to provide services, improve user experience, prevent fraud, communicate service updates and comply with legal obligations.' },
        { num: '06', title: 'Third-Party Services', body: 'The Application may use Google Play Services, Firebase Authentication, Firebase Cloud Messaging, Google Maps APIs and communication service providers.' },
        { num: '07', title: 'Delivery Partner Responsibilities', body: 'Delivery partners must safely transport orders, follow traffic regulations, maintain professional conduct, protect customer information and promptly update delivery status.' },
        { num: '08', title: 'Prohibited Activities', body: 'Users must not submit false information, abuse the platform, interfere with system security, upload unlawful content or attempt unauthorized access.' },
        { num: '09', title: 'Data Retention', body: 'Personal information is retained only as long as necessary for operational, legal and regulatory purposes. Users may request deletion where permitted by law.' },
        { num: '10', title: 'Security', body: 'Reasonable technical and organizational safeguards are used to protect personal information from unauthorized access or disclosure.' },
        { num: '11', title: 'Children\'s Privacy', body: 'The Application is not intended for children under 13 years of age and does not knowingly collect information from children.' },
        { num: '12', title: 'Intellectual Property', body: 'All trademarks, logos, software, databases and content remain the property of the Service Provider unless otherwise stated.' },
        { num: '13', title: 'Limitation of Liability', body: 'The Service Provider is not responsible for losses arising from internet failures, third-party services, delays caused by weather, traffic, force majeure or incorrect information supplied by users.' },
        { num: '14', title: 'Termination', body: 'Accounts may be suspended or terminated for violations of these terms, fraudulent activity or misuse of the platform.' },
        { num: '15', title: 'Changes', body: 'This document may be updated periodically. Continued use of the Application after changes constitutes acceptance of the revised document.' },
    ];

    return (
        <div className="legal-page">
            {/* Header */}
            <div className="legal-header">
                <button className="legal-back-btn" onClick={() => navigate(-1)}>
                    ← Back
                </button>
                <h2>Terms &amp; Privacy</h2>
                <div style={{ width: 40 }} />
            </div>

            {/* Tab switch */}
            <div className="legal-tabs">
                <button 
                    className={`legal-tab-btn ${activeTab === 'terms' ? 'active' : ''}`}
                    onClick={() => setActiveTab('terms')}
                >
                    📜 Terms &amp; Conditions
                </button>
                <button 
                    className={`legal-tab-btn ${activeTab === 'privacy' ? 'active' : ''}`}
                    onClick={() => setActiveTab('privacy')}
                >
                    🔒 Privacy Policy
                </button>
            </div>

            {/* Intro description */}
            <div className="legal-intro-box">
                This {activeTab === 'terms' ? 'Terms and Conditions' : 'Privacy Policy'} applies to the Sifito Delivery Partner mobile application operated by M Siva Sankar ('Service Provider'). 
                Sifito is an instant clothing delivery marketplace connecting customers, registered sellers and delivery partners. 
                By downloading or using the Application you agree to this document.
            </div>

            {/* Section card items */}
            <div className="legal-list-wrap">
                {(activeTab === 'terms' ? deliveryTerms : deliveryPrivacy).map((item) => (
                    <div className="legal-card" key={item.num}>
                        <div className="legal-card-header">
                            <span className="legal-card-num">{item.num}</span>
                            <h3 className="legal-card-title">{item.title}</h3>
                        </div>
                        <p className="legal-card-body">{item.body}</p>
                    </div>
                ))}
            </div>

            {/* Help / Contact */}
            <div className="legal-contact">
                <h4>Questions or concerns?</h4>
                <p>Email: mr7.sivasankar@gmail.com<br />WhatsApp Support: +91 9700079239</p>
                <button 
                    className="legal-contact-btn"
                    onClick={() => window.open('https://wa.me/919700079239?text=Hi%2C%20I%20have%20a%20legal%20query%20about%20Sifito%20Delivery%20Partner.', '_blank')}
                >
                    Chat on WhatsApp
                </button>
            </div>
        </div>
    );
}
