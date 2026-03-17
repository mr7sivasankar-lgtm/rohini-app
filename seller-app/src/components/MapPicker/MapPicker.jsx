import { useEffect, useRef, useState } from 'react';
import api from '../../utils/api';
import './MapPicker.css';

// Leaflet loaded via CDN (index.html) to avoid bundler issues
// Falls back to iframe-based picker if Leaflet not available

const DEFAULT_LAT = 13.6288;
const DEFAULT_LNG = 79.4192;

const MapPicker = ({ initialLat, initialLng, onConfirm, onClose }) => {
    const mapRef = useRef(null);
    const leafletMapRef = useRef(null);
    const markerRef = useRef(null);
    const [pos, setPos] = useState({
        lat: initialLat || DEFAULT_LAT,
        lng: initialLng || DEFAULT_LNG
    });
    const [detecting, setDetecting] = useState(false);
    const [addressText, setAddressText] = useState('');
    const [loadingAddr, setLoadingAddr] = useState(false);

    // Reverse geocode via backend
    const reverseGeocode = async (lat, lng) => {
        setLoadingAddr(true);
        try {
            const res = await api.get(`/serviceability/geocode/reverse?lat=${lat}&lon=${lng}`);
            if (res.data.success && res.data.data) {
                const d = res.data.data;
                const parts = [d.displayName || d.locality || d.city].filter(Boolean);
                setAddressText(parts.join(', '));
            } else {
                setAddressText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            }
        } catch {
            setAddressText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
        } finally {
            setLoadingAddr(false);
        }
    };

    useEffect(() => {
        // Dynamically load Leaflet CSS if not already present
        if (!document.getElementById('leaflet-css')) {
            const link = document.createElement('link');
            link.id = 'leaflet-css';
            link.rel = 'stylesheet';
            link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
            document.head.appendChild(link);
        }

        const initMap = () => {
            if (!window.L || leafletMapRef.current) return;
            const L = window.L;

            const map = L.map(mapRef.current, {
                center: [pos.lat, pos.lng],
                zoom: 16,
                zoomControl: true
            });

            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors',
                maxZoom: 19
            }).addTo(map);

            // Custom red pin icon
            const icon = L.divIcon({
                html: `<div class="map-pin-icon">📍</div>`,
                className: '',
                iconSize: [40, 40],
                iconAnchor: [20, 40]
            });

            const marker = L.marker([pos.lat, pos.lng], {
                draggable: true,
                icon
            }).addTo(map);

            marker.on('dragend', (e) => {
                const { lat, lng } = e.target.getLatLng();
                setPos({ lat, lng });
                reverseGeocode(lat, lng);
            });

            map.on('click', (e) => {
                const { lat, lng } = e.latlng;
                marker.setLatLng([lat, lng]);
                setPos({ lat, lng });
                reverseGeocode(lat, lng);
            });

            leafletMapRef.current = map;
            markerRef.current = marker;

            // Initial reverse geocode
            reverseGeocode(pos.lat, pos.lng);

            // Fix map size after mount
            setTimeout(() => map.invalidateSize(), 300);
        };

        // Load Leaflet JS if not already loaded
        if (window.L) {
            initMap();
        } else {
            const script = document.createElement('script');
            script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
            script.onload = initMap;
            document.head.appendChild(script);
        }

        return () => {
            if (leafletMapRef.current) {
                leafletMapRef.current.remove();
                leafletMapRef.current = null;
                markerRef.current = null;
            }
        };
    }, []);

    const useMyLocation = () => {
        if (!navigator.geolocation) return;
        setDetecting(true);
        navigator.geolocation.getCurrentPosition(
            (p) => {
                const lat = p.coords.latitude;
                const lng = p.coords.longitude;
                setPos({ lat, lng });
                reverseGeocode(lat, lng);
                if (leafletMapRef.current) {
                    leafletMapRef.current.setView([lat, lng], 17);
                    markerRef.current?.setLatLng([lat, lng]);
                }
                setDetecting(false);
            },
            () => { alert('Location access denied.'); setDetecting(false); }
        );
    };

    const handleConfirm = () => {
        onConfirm(pos.lat, pos.lng, addressText);
    };

    return (
        <div className="map-picker-overlay" onClick={onClose}>
            <div className="map-picker-modal" onClick={(e) => e.stopPropagation()}>
                {/* Header */}
                <div className="map-picker-header">
                    <div>
                        <h3>📍 Place Your Location</h3>
                        <p>Drag the pin or tap on the map to set your exact location</p>
                    </div>
                    <button className="map-picker-close" onClick={onClose}>✕</button>
                </div>

                <div className="map-picker-body" style={{ display: 'flex', flexDirection: 'column', flex: 1, overflowY: 'auto' }}>
                    {/* Use My Location */}
                    <button className="map-use-location-btn" onClick={useMyLocation} disabled={detecting}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <circle cx="12" cy="12" r="3" />
                            <line x1="12" y1="2" x2="12" y2="6" />
                            <line x1="12" y1="18" x2="12" y2="22" />
                            <line x1="2" y1="12" x2="6" y2="12" />
                            <line x1="18" y1="12" x2="22" y2="12" />
                        </svg>
                        {detecting ? 'Detecting…' : 'Use My Current Location'}
                    </button>

                    {/* Map Container */}
                    <div ref={mapRef} className="map-picker-map" />

                    {/* Address preview */}
                    <div className="map-picker-address">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#667eea" strokeWidth="2">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                        <span>{loadingAddr ? 'Getting address…' : (addressText || `${pos.lat.toFixed(5)}, ${pos.lng.toFixed(5)}`)}</span>
                    </div>

                    {/* Confirm */}
                    <button className="map-picker-confirm-btn" onClick={handleConfirm}>
                        ✓ Confirm Location
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MapPicker;
