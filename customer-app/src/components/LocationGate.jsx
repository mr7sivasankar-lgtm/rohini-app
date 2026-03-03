import { useLocation } from '../contexts/LocationContext';
import './LocationGate.css';

const LocationGate = ({ children }) => {
    const { serviceable, loading, fullAddress } = useLocation();

    // Still checking location
    if (loading) {
        return (
            <div className="location-gate-loading">
                <div className="location-gate-icon">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                    </svg>
                </div>
                <p className="location-gate-text">Detecting your location...</p>
                <div className="location-gate-spinner"></div>
            </div>
        );
    }

    // Not serviceable — show blocking screen
    if (serviceable === false) {
        return (
            <div className="location-gate-blocked">
                <div className="location-gate-blocked-content">
                    <div className="location-gate-blocked-icon">
                        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                            <circle cx="12" cy="10" r="3" />
                        </svg>
                    </div>
                    <h2>We're Not Here Yet!</h2>
                    <p className="location-gate-blocked-area">
                        {fullAddress || 'Your area'}
                    </p>
                    <p className="location-gate-blocked-msg">
                        Currently we are not servicing your area.<br />
                        We will be there soon.
                    </p>
                    <div className="location-gate-blocked-wave">
                        <span>🚀</span>
                    </div>
                </div>
            </div>
        );
    }

    // Serviceable — render normal app
    return children;
};

export default LocationGate;
