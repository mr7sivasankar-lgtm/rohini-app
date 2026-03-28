import { useEffect, useRef, useState, useCallback } from 'react';
import './MapPicker.css';

const GMAP_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY;
const DEFAULT_LAT = 13.6288;
const DEFAULT_LNG = 79.4192;

/* ── Load Google Maps script once ── */
let gmapsLoaded = false;
let gmapsLoading = false;
const gmapsCallbacks = [];

function loadGoogleMaps(callback) {
    if (gmapsLoaded) return callback();
    gmapsCallbacks.push(callback);
    if (gmapsLoading) return;
    gmapsLoading = true;
    window.__gmapsReady = () => {
        gmapsLoaded = true;
        gmapsLoading = false;
        gmapsCallbacks.forEach(cb => cb());
        gmapsCallbacks.length = 0;
    };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAP_KEY}&libraries=places&callback=__gmapsReady`;
    s.async = true;
    s.defer = true;
    document.head.appendChild(s);
}

/* ── Reverse geocode using Google Geocoding API ── */
async function reverseGeocodeGoogle(lat, lng) {
    try {
        const res = await fetch(
            `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GMAP_KEY}`
        );
        const data = await res.json();
        if (data.status === 'OK' && data.results[0]) {
            const r = data.results[0];
            const get = (type) => r.address_components.find(c => c.types.includes(type))?.long_name || '';
            return {
                fullAddress: r.formatted_address,
                address: [get('sublocality_level_1') || get('sublocality'), get('route')].filter(Boolean).join(', ') || r.formatted_address,
                locality: get('sublocality_level_1') || get('sublocality') || get('neighborhood'),
                city: get('locality'),
                state: get('administrative_area_level_1'),
                pincode: get('postal_code'),
            };
        }
    } catch { /* silent */ }
    return null;
}

const MapPicker = ({ initialLat, initialLng, onConfirm, onClose }) => {
    const mapRef = useRef(null);
    const googleMapRef = useRef(null);
    const markerRef = useRef(null);
    const autocompleteRef = useRef(null);
    const searchInputRef = useRef(null);

    const [pos, setPos] = useState({ lat: initialLat || DEFAULT_LAT, lng: initialLng || DEFAULT_LNG });
    const [detecting, setDetecting] = useState(false);
    const [addressText, setAddressText] = useState('');
    const [addrDetails, setAddrDetails] = useState(null);
    const [loadingAddr, setLoadingAddr] = useState(false);
    const [ready, setReady] = useState(false);

    const doReverseGeocode = useCallback(async (lat, lng) => {
        setLoadingAddr(true);
        const d = await reverseGeocodeGoogle(lat, lng);
        if (d) {
            setAddressText(d.fullAddress);
            setAddrDetails(d);
        } else {
            setAddressText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            setAddrDetails(null);
        }
        setLoadingAddr(false);
    }, []);

    /* ── Init Google Map ── */
    useEffect(() => {
        loadGoogleMaps(() => {
            if (!mapRef.current || googleMapRef.current) return;

            const map = new window.google.maps.Map(mapRef.current, {
                center: { lat: pos.lat, lng: pos.lng },
                zoom: 17,
                disableDefaultUI: false,
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: false,
                gestureHandling: 'greedy',
                styles: [
                    { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
                ]
            });

            const marker = new window.google.maps.Marker({
                position: { lat: pos.lat, lng: pos.lng },
                map,
                draggable: true,
                icon: {
                    url: 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(`
                        <svg xmlns="http://www.w3.org/2000/svg" width="40" height="50" viewBox="0 0 40 50">
                            <ellipse cx="20" cy="48" rx="8" ry="3" fill="rgba(0,0,0,0.2)"/>
                            <path d="M20 2C12.27 2 6 8.27 6 16c0 10.5 14 32 14 32s14-21.5 14-32C34 8.27 27.73 2 20 2z" fill="#ef4444" stroke="white" stroke-width="1.5"/>
                            <circle cx="20" cy="16" r="6" fill="white"/>
                            <circle cx="20" cy="16" r="3.5" fill="#ef4444"/>
                        </svg>
                    `),
                    scaledSize: new window.google.maps.Size(40, 50),
                    anchor: new window.google.maps.Point(20, 50),
                }
            });

            marker.addListener('dragend', () => {
                const p = marker.getPosition();
                const lat = p.lat(); const lng = p.lng();
                setPos({ lat, lng });
                doReverseGeocode(lat, lng);
            });

            map.addListener('click', (e) => {
                const lat = e.latLng.lat(); const lng = e.latLng.lng();
                marker.setPosition({ lat, lng });
                setPos({ lat, lng });
                doReverseGeocode(lat, lng);
            });

            googleMapRef.current = map;
            markerRef.current = marker;
            setReady(true);
            doReverseGeocode(pos.lat, pos.lng);

            /* ── Places Autocomplete ── */
            if (searchInputRef.current) {
                const ac = new window.google.maps.places.Autocomplete(searchInputRef.current, {
                    componentRestrictions: { country: 'IN' },
                    fields: ['geometry', 'formatted_address', 'address_components', 'name'],
                });
                ac.addListener('place_changed', () => {
                    const place = ac.getPlace();
                    if (!place.geometry) return;
                    const lat = place.geometry.location.lat();
                    const lng = place.geometry.location.lng();
                    map.setCenter({ lat, lng });
                    map.setZoom(17);
                    marker.setPosition({ lat, lng });
                    setPos({ lat, lng });
                    doReverseGeocode(lat, lng);
                });
                autocompleteRef.current = ac;
            }
        });

        return () => {
            googleMapRef.current = null;
            markerRef.current = null;
            autocompleteRef.current = null;
        };
    }, []);

    const useMyLocation = () => {
        if (!navigator.geolocation) return;
        setDetecting(true);
        navigator.geolocation.getCurrentPosition(
            ({ coords }) => {
                const lat = coords.latitude; const lng = coords.longitude;
                setPos({ lat, lng });
                googleMapRef.current?.setCenter({ lat, lng });
                googleMapRef.current?.setZoom(17);
                markerRef.current?.setPosition({ lat, lng });
                doReverseGeocode(lat, lng);
                setDetecting(false);
            },
            () => { alert('Location access denied.'); setDetecting(false); }
        );
    };

    const handleConfirm = () => {
        onConfirm(pos.lat, pos.lng, addressText, addrDetails);
    };

    const displayTitle = addrDetails?.locality || addrDetails?.city || (addressText ? addressText.split(',')[0] : 'Detecting...');

    return (
        <div className="map-picker-overlay">
            <div className="map-picker-header-full">
                <button className="map-picker-back" onClick={onClose}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1a1a2e" strokeWidth="2.5"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
                </button>
                <h3>Confirm delivery location</h3>
            </div>

            <div className="map-picker-body-full">
                {/* Google Places Search */}
                <div className="map-floating-search">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input
                        ref={searchInputRef}
                        type="text"
                        placeholder="Search for area, street name..."
                        autoComplete="off"
                    />
                </div>

                <div ref={mapRef} className="map-picker-map" />

                <div className="map-bottom-tray">
                    <button className="map-floating-btn" onClick={useMyLocation} disabled={detecting}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/><line x1="12" y1="2" x2="12" y2="6"/><line x1="12" y1="18" x2="12" y2="22"/><line x1="2" y1="12" x2="6" y2="12"/><line x1="18" y1="12" x2="22" y2="12"/></svg>
                        {detecting ? 'Detecting...' : 'Use current location'}
                    </button>

                    <div className="map-tray-label">Delivering your order to</div>
                    <div className="map-tray-title-row">
                        <div className="map-tray-title">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>
                            {loadingAddr ? 'Locating...' : displayTitle}
                        </div>
                    </div>
                    <div className="map-tray-sub">
                        {loadingAddr ? 'Fetching exact address...' : addressText}
                    </div>

                    <button className="map-tray-confirm" onClick={handleConfirm} disabled={loadingAddr || !ready}>
                        {loadingAddr ? 'Detecting address...' : 'Confirm this location'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MapPicker;
