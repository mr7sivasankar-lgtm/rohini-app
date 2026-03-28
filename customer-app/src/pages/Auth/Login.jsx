import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import './Login.css';

const GMAP_KEY = 'AIzaSyCXNIpwQ6rNmeH6oLU0j7y1bMECzZ65BpA';

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

async function reverseGeocode(lat, lng) {
    try {
        const r = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAP_KEY}`);
        const d = await r.json();
        if (d.status === 'OK' && d.results[0]) {
            const res = d.results[0];
            const get = (t) => res.address_components.find(c => c.types.includes(t))?.long_name || '';
            return {
                fullAddress: res.formatted_address,
                locality: get('sublocality_level_1') || get('sublocality') || get('locality'),
                city: get('locality'),
                state: get('administrative_area_level_1'),
                pincode: get('postal_code'),
            };
        }
    } catch { /* silent */ }
    return null;
}

const Login = () => {
    const navigate = useNavigate();
    const { sendOTP, verifyOTP, updateProfile } = useAuth();

    // Steps: 'phone' | 'otp' | 'name' | 'location'
    const [step, setStep] = useState('phone');
    const [phone, setPhone] = useState('');
    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [name, setName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [resendTimer, setResendTimer] = useState(0);

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

    const otpRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

    // Resend countdown
    useEffect(() => {
        if (resendTimer <= 0) return;
        const t = setTimeout(() => setResendTimer(r => r - 1), 1000);
        return () => clearTimeout(t);
    }, [resendTimer]);

    const handlePhoneChange = (e) => {
        const v = e.target.value.replace(/\D/g, '');
        if (v.length <= 10) setPhone(v);
    };

    const handleSendOTP = async (e) => {
        e.preventDefault();
        setError('');
        if (phone.length !== 10) { setError('Enter a valid 10-digit number'); return; }
        setLoading(true);
        try {
            const res = await sendOTP(`+91${phone}`);
            if (res.success) {
                setStep('otp');
                setResendTimer(30);
                if (res.data?.otp) alert(`Your OTP: ${res.data.otp}`);
            }
        } catch (err) { setError(err.message || 'Failed to send OTP'); }
        finally { setLoading(false); }
    };

    const handleOTPChange = (i, val) => {
        if (!/^\d?$/.test(val)) return;
        const next = [...otp];
        next[i] = val;
        setOtp(next);
        if (val && i < 5) otpRefs[i + 1].current?.focus();
        if (!val && i > 0) otpRefs[i - 1].current?.focus();
    };

    const handleOTPPaste = (e) => {
        const paste = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (paste.length === 6) {
            setOtp(paste.split(''));
            otpRefs[5].current?.focus();
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        const otpVal = otp.join('');
        if (otpVal.length !== 6) { setError('Enter all 6 digits'); return; }
        setError('');
        setLoading(true);
        try {
            const res = await verifyOTP(`+91${phone}`, otpVal);
            if (res.success) {
                if (res.data.isNewUser) {
                    setStep('name');
                } else {
                    navigate('/home');
                }
            }
        } catch (err) { setError(err.message || 'Invalid OTP'); }
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
    const stepCount = { phone: 1, otp: 2, name: 3, location: 4 };
    const stepLabel = { phone: 'Phone', otp: 'Verify', name: 'Profile', location: 'Location' };
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
                    {[1, 2, 3, 4].map(n => (
                        <span key={n} className={`step-dot ${n === current ? 'active' : n < current ? 'done' : ''}`} />
                    ))}
                </div>

                {/* Title */}
                <div className="login-header">
                    <h1>{step === 'phone' ? 'Welcome! 👋' : step === 'otp' ? 'Enter OTP' : "What's your name?"}</h1>
                    <p>{step === 'phone' ? 'Sign in with your phone number' : step === 'otp' ? `Code sent to +91 ${phone}` : 'Tell us what to call you'}</p>
                </div>

                {error && <div className="error-message">⚠️ {error}</div>}

                {/* ── Phone Step ── */}
                {step === 'phone' && (
                    <form onSubmit={handleSendOTP} className="login-form">
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
                            <span className="input-hint">We'll send a one-time verification code</span>
                        </div>
                        <button type="submit" className="login-btn login-btn-primary" disabled={loading || phone.length !== 10}>
                            {loading && <span className="btn-spinner" />}
                            {loading ? 'Sending OTP...' : 'Continue →'}
                        </button>
                    </form>
                )}

                {/* ── OTP Step ── */}
                {step === 'otp' && (
                    <form onSubmit={handleVerifyOTP} className="login-form">
                        <div className="otp-sent-info">
                            <small>OTP sent to</small>
                            <div className="otp-phone">+91 {phone}</div>
                        </div>

                        {/* 6-box OTP input */}
                        <div style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
                            {otp.map((digit, i) => (
                                <input
                                    key={i}
                                    ref={otpRefs[i]}
                                    type="text" inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleOTPChange(i, e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Backspace' && !digit && i > 0) otpRefs[i - 1].current?.focus(); }}
                                    onPaste={i === 0 ? handleOTPPaste : undefined}
                                    style={{
                                        width: 44, height: 52, textAlign: 'center', fontSize: 22, fontWeight: 700,
                                        border: `2px solid ${digit ? '#22c55e' : '#e2e8f0'}`,
                                        borderRadius: 12, outline: 'none', background: digit ? '#f0fdf4' : '#f8fafc',
                                        color: '#111827', transition: 'all 0.2s', caretColor: '#22c55e',
                                    }}
                                    autoFocus={i === 0}
                                />
                            ))}
                        </div>

                        <button type="submit" className="login-btn login-btn-primary" disabled={loading || otp.join('').length !== 6}>
                            {loading && <span className="btn-spinner" />}
                            {loading ? 'Verifying...' : 'Verify & Continue →'}
                        </button>

                        <div style={{ textAlign: 'center' }}>
                            {resendTimer > 0 ? (
                                <span style={{ fontSize: 13, color: '#9ca3af' }}>Resend OTP in <strong style={{ color: '#22c55e' }}>{resendTimer}s</strong></span>
                            ) : (
                                <button type="button" style={{ background: 'none', border: 'none', color: '#22c55e', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                                    onClick={() => { setStep('phone'); setOtp(['', '', '', '', '', '']); setError(''); }}>
                                    ← Change number or Resend OTP
                                </button>
                            )}
                        </div>
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
                    <p>By continuing, you agree to our Terms &amp; Privacy Policy</p>
                </div>
            </div>
        </div>
    );
};

export default Login;
