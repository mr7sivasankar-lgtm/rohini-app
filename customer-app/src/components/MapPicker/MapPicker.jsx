import { useEffect, useRef, useState } from 'react';
import api from '../../utils/api';
import './MapPicker.css';

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
    const [addrDetails, setAddrDetails] = useState(null);
    const [loadingAddr, setLoadingAddr] = useState(false);

    const reverseGeocode = async (lat, lng) => {
        setLoadingAddr(true);
        try {
            const res = await api.get(`/serviceability/geocode/reverse?lat=${lat}&lon=${lng}`);
            if (res.data.success && res.data.data) {
                const d = res.data.data;
                const parts = [d.address, d.city, d.state].filter(Boolean);
                setAddressText(parts.join(', '));
                setAddrDetails(d);
            } else {
                setAddressText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
                setAddrDetails(null);
            }
        } catch {
            setAddressText(`${lat.toFixed(5)}, ${lng.toFixed(5)}`);
            setAddrDetails(null);
        } finally {
            setLoadingAddr(false);
        }
    };

    useEffect(() => {
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
                zoom: 17,
                zoomControl: false // Hide zoom buttons for aesthetics
            });

            L.tileLayer('https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}', {
                attribution: '© Google',
                maxZoom: 20
            }).addTo(map);

            const icon = L.divIcon({
                html: `
                    <div style="position:relative; width:48px; height:48px; display:flex; justify-content:center;">
                        <div class="map-tooltip">Your order will be delivered here<br/>Move pin to your exact location</div>
                        <svg width="42" height="42" viewBox="0 0 24 24" fill="#ef4444" style="filter: drop-shadow(0px 4px 6px rgba(0,0,0,0.3));">
                            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 10.5c-1.93 0-3.5-1.57-3.5-3.5s1.57-3.5 3.5-3.5 3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5z"/>
                            <circle cx="12" cy="9" r="2.5" fill="white"/>
                        </svg>
                    </div>
                `,
                className: '',
                iconSize: [48, 48],
                iconAnchor: [24, 48]
            });

            const marker = L.marker([pos.lat, pos.lng], {
                draggable: true,
                icon
            }).addTo(map);

            marker.on('dragstart', () => {
                document.querySelector('.map-tooltip').style.display = 'none';
            });

            marker.on('dragend', (e) => {
                const { lat, lng } = e.target.getLatLng();
                setPos({ lat, lng });
                reverseGeocode(lat, lng);
                document.querySelector('.map-tooltip').style.display = 'block';
            });

            map.on('move', () => {
                const { lat, lng } = map.getCenter();
                marker.setLatLng([lat, lng]);
            });
            
            map.on('movestart', () => {
                document.querySelector('.map-tooltip').style.display = 'none';
            });

            map.on('moveend', () => {
                const { lat, lng } = map.getCenter();
                setPos({ lat, lng });
                reverseGeocode(lat, lng);
                document.querySelector('.map-tooltip').style.display = 'block';
            });

            leafletMapRef.current = map;
            markerRef.current = marker;

            reverseGeocode(pos.lat, pos.lng);
            setTimeout(() => map.invalidateSize(), 300);
        };

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
                <div className="map-floating-search">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                    <input type="text" placeholder="Search for area, street name..." />
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
                        <button className="map-tray-change" onClick={() => document.querySelector('.map-floating-search input').focus()}>CHANGE</button>
                    </div>
                    <div className="map-tray-sub">
                        {loadingAddr ? 'Fetching exact address...' : addressText}
                    </div>

                    <button className="map-tray-confirm" onClick={handleConfirm} disabled={loadingAddr}>
                        Add more address details
                    </button>
                </div>
            </div>
        </div>
    );
};

export default MapPicker;
