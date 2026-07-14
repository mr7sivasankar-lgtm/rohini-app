import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const GMAP_KEY = 'AIzaSyBRtsC56l2EXDORo2GGnr__iLpj-N0JLB8';

/* ── Google Maps loader ── */
let _loaded = false, _loading = false, _cbs = [];
function loadGM(cb) {
    if (_loaded) return cb();
    _cbs.push(cb);
    if (_loading) return;
    _loading = true;
    window.__loginMapReady = () => { _loaded = true; _loading = false; _cbs.forEach(f => f()); _cbs = []; };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}&libraries=places&callback=__loginMapReady&loading=async`;
    s.async = true; s.defer = true;
    document.head.appendChild(s);
}

function reverseGeocode(lat, lng) {
    return new Promise((resolve) => {
        if (!window.google || !window.google.maps || !window.google.maps.Geocoder) {
            resolve(null);
            return;
        }
        const geocoder = new window.google.maps.Geocoder();
        geocoder.geocode({ location: { lat, lng } }, (results, status) => {
            if (status === 'OK' && results && results[0]) {
                const res = results[0];
                const get = (t) => res.address_components.find(c => c.types.includes(t))?.long_name || '';
                resolve({
                    fullAddress: res.formatted_address,
                    locality: get('sublocality_level_1') || get('sublocality') || get('locality'),
                    city: get('locality'),
                    state: get('administrative_area_level_1'),
                    pincode: get('postal_code'),
                });
            } else {
                resolve(null);
            }
        });
    });
}

/* ─────────────────────────────────────────────────────────────────────
   LEGAL CONTENT — Sifito Privacy Policy & Terms and Conditions
   Effective Date: July 14, 2026
   ───────────────────────────────────────────────────────────────────── */
const PRIVACY_POLICY = {
    title: 'Privacy Policy',
    lastUpdated: 'July 14, 2026',
    intro: "This Privacy Policy applies to the Sifito Customer mobile application operated by M Siva Sankar ('Service Provider'). Sifito is an instant clothing delivery marketplace connecting customers, registered sellers and delivery partners. By downloading or using the Application you agree to this document.",
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
            heading: '7. Orders, Cancellation and Returns',
            body: 'Orders are subject to seller availability. Customers should provide accurate delivery information. Cancellation, return and exchange eligibility depends on seller policy and applicable consumer laws.'
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
    title: 'Terms & Conditions',
    lastUpdated: 'July 14, 2026',
    intro: "This Terms and Conditions applies to the Sifito Customer mobile application operated by M Siva Sankar ('Service Provider'). Sifito is an instant clothing delivery marketplace connecting customers, registered sellers and delivery partners. By downloading or using the Application you agree to this document.",
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
            heading: '7. Orders, Cancellation and Returns',
            body: 'Orders are subject to seller availability. Customers should provide accurate delivery information. Cancellation, return and exchange eligibility depends on seller policy and applicable consumer laws.'
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
            {/* Backdrop */}
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
            {/* Sheet */}
            <div style={{
                position: 'fixed',
                left: 0, right: 0, bottom: 0,
                background: '#fff',
                borderRadius: '24px 24px 0 0',
                zIndex: 9999,
                display: 'flex',
                flexDirection: 'column',
                maxHeight: '88vh',
                boxShadow: '0 -8px 32px rgba(0,0,0,0.18)',
                animation: 'legalSlideUp 0.32s cubic-bezier(0.16,1,0.3,1)',
            }}>
                {/* Drag handle */}
                <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
                    <div style={{ width: 40, height: 4, borderRadius: 2, background: '#e2e8f0' }} />
                </div>

                {/* Modal Header */}
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

                {/* Scrollable Content */}
                <div style={{ overflowY: 'auto', padding: '16px 20px 32px', flex: 1 }}>
                    {data.sections.map((sec, idx) => (
                        <div key={idx} style={{ marginBottom: 20 }}>
                            <h3 style={{
                                fontSize: 14, fontWeight: 700, color: '#0f172a',
                                margin: '0 0 6px', display: 'flex', alignItems: 'center', gap: 8,
                            }}>
                                <span style={{
                                    display: 'inline-block', width: 6, height: 6,
                                    borderRadius: '50%', background: '#22c55e', flexShrink: 0,
                                }} />
                                {sec.heading}
                            </h3>
                            <p style={{
                                fontSize: 13.5, color: '#475569', lineHeight: 1.7,
                                margin: 0, paddingLeft: 14, whiteSpace: 'pre-line'
                            }}>
                                {sec.body}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Close Button */}
                <div style={{ padding: '0 20px 28px' }}>
                    <button
                        onClick={onClose}
                        style={{
                            width: '100%', padding: '14px',
                            background: 'linear-gradient(135deg, #16a34a 0%, #22c55e 100%)',
                            color: '#fff', border: 'none', borderRadius: 14,
                            fontSize: 15, fontWeight: 700, cursor: 'pointer',
                            boxShadow: '0 4px 16px rgba(22,163,74,0.3)',
                        }}
                    >
                        Got it!
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
    const navigate = useNavigate();
    const { phoneLogin, updateProfile } = useAuth();

    // Legal modal state
    const [legalModal, setLegalModal] = useState(null); // null | PRIVACY_POLICY | TERMS_CONDITIONS

    // Steps: 'phone' | 'name' | 'location'
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Location state
    const mapContainerRef = useRef(null);
    const googleMapRef = useRef(null);
    const markerRef = useRef(null);
    const searchRef = useRef(null);
    const [locPos, setLocPos] = useState(null);
    const [locAddress, setLocAddress] = useState('');
    const [locDetails, setLocDetails] = useState(null);
    const [locLoading, setLocLoading] = useState(false);
    const [detecting, setDetecting] = useState(false);



    const handlePhoneChange = (e) => {
        const v = e.target.value.replace(/\D/g, '');
        if (v.length <= 10) setPhone(v);
    };

    const handlePhoneSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
        setLoading(true);
        try {
            const res = await phoneLogin(`+91${phone}`);
            if (res.success) {
                if (res.data.isNewUser) {
                    setStep('name');
                } else {
                    navigate('/home');
                }
            }
        } catch (err) { setError(err.message || 'Login failed. Please try again.'); }
        finally { setLoading(false); }
    };

    const handleNameSubmit = (e) => {
        e.preventDefault();
        if (!name.trim() || name.trim().length < 2) { setError('Enter your full name (min 2 chars)'); return; }
        setError('');
        setStep('location');
    };

    // Init Google Maps for Location step
    useEffect(() => {
        if (step !== 'location' || !mapContainerRef.current || googleMapRef.current) return;

        const initMap = (lat = 13.6288, lng = 79.4192) => {
            const map = new window.google.maps.Map(mapContainerRef.current, {
                center: { lat, lng }, zoom: 15,
                disableDefaultUI: true,
                gestureHandling: 'greedy',
                styles: [
                    { featureType: 'poi', stylers: [{ visibility: 'off' }] },
                    { featureType: 'transit', stylers: [{ visibility: 'off' }] },
                ]
            });

            const marker = new window.google.maps.Marker({
                position: { lat, lng }, map, draggable: true,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="36" height="48" viewBox="0 0 36 48">
                            <ellipse cx="18" cy="46" rx="7" ry="2.5" fill="rgba(0,0,0,0.2)"/>
                            <path d="M18 1C10.27 1 4 7.27 4 15c0 10.5 14 32 14 32S32 25.5 32 15C32 7.27 25.73 1 18 1z" fill="#22c55e" stroke="white" stroke-width="1.5"/>
                            <circle cx="18" cy="15" r="5.5" fill="white"/>
                            <circle cx="18" cy="15" r="3" fill="#22c55e"/>
                        </svg>
                    `),
                    scaledSize: new window.google.maps.Size(36, 48),
                    anchor: new window.google.maps.Point(18, 48),
                }
            });

            const doGeo = async (lt, lg) => {
                setLocPos({ lat: lt, lng: lg });
                setLocLoading(true);
                const d = await reverseGeocode(lt, lg);
                if (d) { setLocAddress(d.fullAddress); setLocDetails(d); }
                else { setLocAddress(`${lt.toFixed(5)}, ${lg.toFixed(5)}`); }
                setLocLoading(false);
            };

            marker.addListener('dragend', () => {
                const p = marker.getPosition();
                doGeo(p.lat(), p.lng());
            });
            map.addListener('click', (e) => {
                const lt = e.latLng.lat(), lg = e.latLng.lng();
                marker.setPosition({ lat: lt, lng: lg });
                doGeo(lt, lg);
            });

            // Search box
            if (searchRef.current) {
                const ac = new window.google.maps.places.Autocomplete(searchRef.current, {
                    componentRestrictions: { country: 'IN' },
                    fields: ['geometry', 'formatted_address'],
                });
                ac.addListener('place_changed', () => {
                    const place = ac.getPlace();
                    if (!place.geometry) return;
                    const lt = place.geometry.location.lat();
                    const lg = place.geometry.location.lng();
                    map.setCenter({ lat: lt, lng: lg }); map.setZoom(16);
                    marker.setPosition({ lat: lt, lng: lg });
                    doGeo(lt, lg);
                });
            }

            googleMapRef.current = map;
            markerRef.current = marker;
            doGeo(lat, lng);
        };

        loadGM(() => {
            if (!mapContainerRef.current) return;
            // Try GPS first
            if (navigator.geolocation) {
                navigator.geolocation.getCurrentPosition(
                    (pos) => initMap(pos.coords.latitude, pos.coords.longitude),
                    () => initMap()
                );
            } else {
                initMap();
            }
        });

        return () => { googleMapRef.current = null; markerRef.current = null; };
    }, [step]);

    const useCurrentLocation = () => {
        if (!navigator.geolocation) return;
        setDetecting(true);
        navigator.geolocation.getCurrentPosition(async ({ coords }) => {
            const { latitude: lat, longitude: lng } = coords;
            googleMapRef.current?.setCenter({ lat, lng });
            googleMapRef.current?.setZoom(16);
            markerRef.current?.setPosition({ lat, lng });
            setLocPos({ lat, lng });
            setLocLoading(true);
            const d = await reverseGeocode(lat, lng);
            if (d) { setLocAddress(d.fullAddress); setLocDetails(d); }
            setLocLoading(false);
            setDetecting(false);
        }, () => setDetecting(false));
    };

    const handleLocationDone = async () => {
        setLoading(true);
        try {
            // Save name + location
            await updateProfile({ name: name.trim() });
            // Store location in localStorage for immediate home page use
            if (locPos) {
                localStorage.setItem('userLocation', JSON.stringify({
                    lat: locPos.lat, lng: locPos.lng,
                    address: locAddress,
                    ...locDetails
                }));
            }
            navigate('/home');
        } catch (err) {
            setError('Failed to save. Please try again.');
        } finally { setLoading(false); }
    };

    const handleSkipLocation = async () => {
        setLoading(true);
        try {
            await updateProfile({ name: name.trim() });
        } catch { /* ignore */ }
        setLoading(false);
        navigate('/home');
    };

    // ── Step Progress ──
    const stepCount = { phone: 1, name: 2, location: 3 };
    const current = stepCount[step];

    // ═══════════ LOCATION SCREEN ═══════════
    if (step === 'location') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: '#fff', overflow: 'hidden', fontFamily: "'Inter','Segoe UI',sans-serif" }}>
                {/* Header */}
                <div style={{ padding: '16px 20px 12px', borderBottom: '1px solid #f1f5f9', background: 'white', zIndex: 10, position: 'relative' }}>
                    <button onClick={() => setStep('name')} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#374151', padding: 0, lineHeight: 1 }}>←</button>
                    <h2 style={{ textAlign: 'center', fontSize: 17, fontWeight: 700, color: '#111827', margin: '-22px 0 0' }}>Set Delivery Location</h2>
                </div>

                {/* Search */}
                <div style={{ padding: '10px 16px', background: 'white', zIndex: 9, position: 'relative', boxShadow: '0 2px 6px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', background: '#f8fafc', border: '1.5px solid #e2e8f0', borderRadius: 12, padding: '10px 14px', gap: 10 }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        <input
                            ref={searchRef}
                            type="text"
                            placeholder="Search your area or street..."
                            autoComplete="off"
                            style={{ border: 'none', background: 'none', fontSize: 14, outline: 'none', flex: 1, color: '#111827' }}
                        />
                    </div>
                </div>

                {/* Map */}
                <div style={{ flex: 1, position: 'relative' }}>
                    <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />

                    {/* GPS button */}
                    <button onClick={useCurrentLocation} disabled={detecting}
                        style={{ position: 'absolute', right: 12, bottom: 12, width: 44, height: 44, borderRadius: '50%', background: 'white', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.14)', cursor: 'pointer', zIndex: 5 }}
                    >
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={detecting ? '#22c55e' : '#374151'} strokeWidth="2.3">
                            <circle cx="12" cy="12" r="3" fill={detecting ? '#22c55e' : 'none'}/>
                            <circle cx="12" cy="12" r="7"/>
                            <line x1="12" y1="2" x2="12" y2="5"/>
                            <line x1="12" y1="19" x2="12" y2="22"/>
                            <line x1="2" y1="12" x2="5" y2="12"/>
                            <line x1="19" y1="12" x2="22" y2="12"/>
                        </svg>
                    </button>
                </div>

                {/* Bottom tray */}
                <div style={{ background: 'white', padding: '16px 20px 28px', boxShadow: '0 -4px 16px rgba(0,0,0,0.08)' }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 14 }}>
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="#22c55e"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/><circle cx="12" cy="9" r="2.5" fill="white"/></svg>
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 3 }}>Deliver to</div>
                            <div style={{ fontSize: 14, fontWeight: 600, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {locLoading ? 'Getting address...' : (locAddress || 'Tap the map to set location')}
                            </div>
                        </div>
                    </div>

                    {error && <div style={{ padding: '8px 12px', background: '#fef2f2', color: '#dc2626', borderRadius: 8, fontSize: 12, marginBottom: 12 }}>{error}</div>}

                    <button onClick={handleLocationDone} disabled={loading || !locPos}
                        style={{ width: '100%', padding: '15px', background: locPos ? '#22c55e' : '#d1fae5', color: 'white', border: 'none', borderRadius: 14, fontSize: 15, fontWeight: 700, cursor: locPos ? 'pointer' : 'not-allowed', letterSpacing: '-0.2px', marginBottom: 10, transition: 'all 0.2s' }}>
                        {loading ? '⏳ Saving...' : '✓ Confirm Location'}
                    </button>

                    <button onClick={handleSkipLocation} disabled={loading}
                        style={{ width: '100%', padding: '12px', background: 'none', border: '1.5px solid #e5e7eb', color: '#6b7280', borderRadius: 12, fontSize: 14, cursor: 'pointer', fontWeight: 500 }}>
                        Skip for now →
                    </button>
                </div>
            </div>
        );
    }

    // ═══════════ AUTH CARD SCREENS (Phone / OTP / Name) ═══════════
    return (
        <div className="login-page">
            <div className="login-container">

                {/* Brand Icon – green */}
                <div className="login-brand">
                    <div className="login-brand-icon">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                            <line x1="3" y1="6" x2="21" y2="6" />
                            <path d="M16 10a4 4 0 0 1-8 0" />
                        </svg>
                    </div>
                </div>

                {/* Step dots */}
                <div className="step-indicator">
                    {[1, 2, 3].map(n => (
                        <span key={n} className={`step-dot ${n === current ? 'active' : n < current ? 'done' : ''}`} />
                    ))}
                </div>

                {/* Title */}
                <div className="login-header">
                    <h1>{step === 'phone' ? 'Welcome! 👋' : "What's your name?"}</h1>
                    <p>{step === 'phone' ? 'Sign in with your phone number' : 'Tell us what to call you'}</p>
                </div>

                {error && <div className="error-message">⚠️ {error}</div>}

                {/* ── Phone Step ── */}
                {step === 'phone' && (
                    <form onSubmit={handlePhoneSubmit} className="login-form">
                        <div className="form-group">
                            <label>Phone Number</label>
                            <div className="phone-input-wrapper">
                                <span className="phone-prefix">+91</span>
                                <input
                                    type="tel" className="login-input phone-input"
                                    placeholder="Enter your number"
                                    value={phone} onChange={handlePhoneChange}
                                    maxLength="10" autoFocus
                                />
                            </div>
                            <span className="input-hint">Enter your 10-digit mobile number to continue</span>
                        </div>
                        <button type="submit" className="login-btn login-btn-primary" disabled={loading || phone.length !== 10}>
                            {loading && <span className="btn-spinner" />}
                            {loading ? 'Please wait...' : 'Continue →'}
                        </button>
                    </form>
                )}

                {/* ── Name Step ── */}
                {step === 'name' && (
                    <form onSubmit={handleNameSubmit} className="login-form">
                        <div className="form-group">
                            <label>Your Name</label>
                            <input
                                type="text" className="login-input"
                                placeholder="e.g. Rajesh Kumar"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                autoFocus
                                style={{ fontSize: 17 }}
                            />
                            <span className="input-hint">This will appear on your orders</span>
                        </div>
                        <button type="submit" className="login-btn login-btn-primary" disabled={name.trim().length < 2}>
                            Continue →
                        </button>
                    </form>
                )}

                <div className="login-footer">
                    <p>
                        By continuing, you agree to our{' '}
                        <button
                            type="button"
                            onClick={() => setLegalModal(TERMS_CONDITIONS)}
                            style={{
                                background: 'none', border: 'none', padding: 0,
                                color: '#16a34a', fontWeight: 700, fontSize: 12,
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
                                color: '#16a34a', fontWeight: 700, fontSize: 12,
                                cursor: 'pointer', textDecoration: 'underline',
                                textUnderlineOffset: 2,
                            }}
                        >
                            Privacy Policy
                        </button>
                    </p>
                </div>

                {/* Legal Modals */}
                <LegalModal data={legalModal} onClose={() => setLegalModal(null)} />
            </div>
        </div>
    );
};

export default Login;
