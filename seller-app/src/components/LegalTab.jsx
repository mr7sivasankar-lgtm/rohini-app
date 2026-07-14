import React, { useState } from 'react';

export default function LegalTab() {
    const [activeSubTab, setActiveSubTab] = useState('terms');

    const sellerTerms = [
        { num: '01', title: 'Eligibility', body: 'Users must be at least 18 years old or use the Application with the consent of a parent or guardian where permitted by law.' },
        { num: '02', title: 'Account Registration', body: 'Users must register using a valid mobile number and account registration. You are responsible for maintaining the confidentiality of your account.' },
        { num: '03', title: 'Information Collected', body: 'We may collect your name, mobile number (if provided), profile information, address, approximate location, order history, uploaded images, device information and communications.' },
        { num: '04', title: 'Location Permission', body: 'Location is used to identify nearby stores, assign deliveries, calculate delivery routes and improve the service.' },
        { num: '05', title: 'Use of Information', body: 'Information is used to provide services, improve user experience, prevent fraud, communicate service updates and comply with legal obligations.' },
        { num: '06', title: 'Third-Party Services', body: 'The Application may use Google Play Services, Firebase Authentication, Firebase Cloud Messaging, Google Maps APIs and communication service providers.' },
        { num: '07', title: 'Seller Responsibilities', body: 'Sellers must maintain accurate inventory, lawful pricing, genuine products, timely order fulfilment, and comply with applicable tax and consumer protection laws. Counterfeit or prohibited products are not permitted.' },
        { num: '08', title: 'Prohibited Activities', body: 'Users must not submit false information, abuse the platform, interfere with system security, upload unlawful content or attempt unauthorized access.' },
        { num: '09', title: 'Intellectual Property', body: 'All trademarks, logos, software, databases and content remain the property of the Service Provider unless otherwise stated.' },
        { num: '10', title: 'Limitation of Liability', body: 'The Service Provider is not responsible for losses arising from internet failures, third-party services, delays caused by weather, traffic, force majeure or incorrect information supplied by users.' },
        { num: '11', title: 'Termination', body: 'Accounts may be suspended or terminated for violations of these terms, fraudulent activity or misuse of the platform.' },
        { num: '12', title: 'Changes', body: 'This document may be updated periodically. Continued use of the Application after changes constitutes acceptance of the revised document.' },
    ];

    const sellerPrivacy = [
        { num: '01', title: 'Eligibility', body: 'Users must be at least 18 years old or use the Application with the consent of a parent or guardian where permitted by law.' },
        { num: '02', title: 'Account Registration', body: 'Users must register using a valid mobile number and account registration. You are responsible for maintaining the confidentiality of your account.' },
        { num: '03', title: 'Information Collected', body: 'We may collect your name, mobile number (if provided), profile information, address, approximate location, order history, uploaded images, device information and communications.' },
        { num: '04', title: 'Location Permission', body: 'Location is used to identify nearby stores, assign deliveries, calculate delivery routes and improve the service.' },
        { num: '05', title: 'Use of Information', body: 'Information is used to provide services, improve user experience, prevent fraud, communicate service updates and comply with legal obligations.' },
        { num: '06', title: 'Third-Party Services', body: 'The Application may use Google Play Services, Firebase Authentication, Firebase Cloud Messaging, Google Maps APIs and communication service providers.' },
        { num: '07', title: 'Seller Responsibilities', body: 'Sellers must maintain accurate inventory, lawful pricing, genuine products, timely order fulfilment, and comply with applicable tax and consumer protection laws. Counterfeit or prohibited products are not permitted.' },
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
        <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto', fontFamily: 'Inter, system-ui, sans-serif' }}>
            
            {/* Sub-tab Switcher */}
            <div style={{
                display: 'flex',
                background: '#f1f5f9',
                padding: '4px',
                borderRadius: '12px',
                marginBottom: '24px'
            }}>
                <button 
                    onClick={() => setActiveSubTab('terms')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: activeSubTab === 'terms' ? 'white' : 'transparent',
                        color: activeSubTab === 'terms' ? '#4f46e5' : '#64748b',
                        boxShadow: activeSubTab === 'terms' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    📜 Terms &amp; Conditions
                </button>
                <button 
                    onClick={() => setActiveSubTab('privacy')}
                    style={{
                        flex: 1,
                        padding: '10px',
                        borderRadius: '10px',
                        border: 'none',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        background: activeSubTab === 'privacy' ? 'white' : 'transparent',
                        color: activeSubTab === 'privacy' ? '#4f46e5' : '#64748b',
                        boxShadow: activeSubTab === 'privacy' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s'
                    }}
                >
                    🔒 Privacy Policy
                </button>
            </div>

            {/* Document Introduction */}
            <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '16px',
                padding: '20px',
                marginBottom: '24px',
                color: '#1e3a8a',
                fontSize: '14px',
                lineHeight: '1.6'
            }}>
                This {activeSubTab === 'terms' ? 'Terms and Conditions' : 'Privacy Policy'} applies to the Sifito Seller mobile application operated by M Siva Sankar ('Service Provider'). 
                Sifito is an instant clothing delivery marketplace connecting customers, registered sellers and delivery partners. 
                By downloading or using the Application you agree to this document.
            </div>

            {/* Accordion / List of Sections */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {(activeSubTab === 'terms' ? sellerTerms : sellerPrivacy).map((item) => (
                    <div 
                        key={item.num}
                        style={{
                            background: 'white',
                            borderRadius: '16px',
                            border: '1px solid #e2e8f0',
                            padding: '20px',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                            <span style={{
                                background: '#f1f5f9',
                                color: '#475569',
                                width: '28px',
                                height: '28px',
                                borderRadius: '50%',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '12px',
                                fontWeight: 800
                            }}>
                                {item.num}
                            </span>
                            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: '#0f172a' }}>
                                {item.title}
                            </h3>
                        </div>
                        <p style={{ margin: 0, fontSize: '14px', color: '#475569', lineHeight: '1.6', paddingLeft: '40px' }}>
                            {item.body}
                        </p>
                    </div>
                ))}
            </div>

            {/* Contact Card */}
            <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '20px',
                padding: '24px',
                marginTop: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div>
                    <h4 style={{ margin: '0 0 4px 0', fontSize: '16px', color: '#0f172a', fontWeight: 700 }}>
                        Need help or clarification?
                    </h4>
                    <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                        Email: <strong>mr7.sivasankar@gmail.com</strong> | WhatsApp: <strong>+91 9700079239</strong>
                    </p>
                </div>
                <button 
                    onClick={() => window.open('https://wa.me/919700079239?text=Hi%2C%20I%20have%20a%20legal%20query%20about%20Sifito%20Seller%20App.', '_blank')}
                    style={{
                        background: '#4f46e5',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '12px 24px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        boxShadow: '0 4px 12px rgba(79,70,229,0.2)'
                    }}
                >
                    Contact Support
                </button>
            </div>
        </div>
    );
}
