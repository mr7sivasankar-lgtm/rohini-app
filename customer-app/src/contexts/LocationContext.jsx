import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const LocationContext = createContext();

export const useLocation = () => useContext(LocationContext);

export const LocationProvider = ({ children }) => {
    const [location, setLocation] = useState({
        latitude: null,
        longitude: null,
        locality: '',
        city: '',
        state: '',
        pincode: '',
        fullAddress: '',
        serviceable: null, // null = checking, true/false = result
        loading: true,
        error: null,
        permissionDenied: false
    });

    useEffect(() => {
        detectLocation();
    }, []);

    const detectLocation = () => {
        setLocation(prev => ({ ...prev, loading: true, error: null }));

        if (!navigator.geolocation) {
            setLocation(prev => ({
                ...prev,
                loading: false,
                error: 'Geolocation is not supported by your browser'
            }));
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                await reverseGeocodeAndCheck(latitude, longitude);
            },
            (error) => {
                let errorMsg = 'Unable to detect your location';
                let permissionDenied = false;

                if (error.code === 1) {
                    errorMsg = 'Location permission denied. Please allow location access or enter your pincode manually.';
                    permissionDenied = true;
                } else if (error.code === 2) {
                    errorMsg = 'Unable to determine your location. Please enter your pincode manually.';
                } else if (error.code === 3) {
                    errorMsg = 'Location request timed out. Please try again.';
                }

                setLocation(prev => ({
                    ...prev,
                    loading: false,
                    error: errorMsg,
                    permissionDenied,
                    serviceable: true // default to serviceable if can't detect
                }));
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    };

    const reverseGeocodeAndCheck = async (latitude, longitude) => {
        try {
            // Reverse geocode using OpenStreetMap Nominatim (free, no API key)
            const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const geoData = await geoRes.json();

            const address = geoData.address || {};
            const locality = address.suburb || address.neighbourhood || address.village || address.town || '';
            const city = address.city || address.state_district || address.county || '';
            const state = address.state || '';
            const pincode = address.postcode || '';
            const fullAddress = `${locality}${locality && city ? ', ' : ''}${city}`;

            // Check serviceability with backend
            let serviceable = true;
            try {
                const checkRes = await api.post('/serviceability/check', {
                    latitude, longitude, pincode, city
                });
                serviceable = checkRes.data.serviceable;
            } catch (err) {
                console.error('Serviceability check failed, defaulting to serviceable:', err);
                serviceable = true; // default to open if check fails
            }

            setLocation({
                latitude,
                longitude,
                locality,
                city,
                state,
                pincode,
                fullAddress,
                serviceable,
                loading: false,
                error: null,
                permissionDenied: false
            });
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            setLocation(prev => ({
                ...prev,
                latitude,
                longitude,
                loading: false,
                serviceable: true, // default to serviceable if geocoding fails
                error: 'Could not detect area name'
            }));
        }
    };

    const setManualPincode = async (pincode) => {
        setLocation(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Geocode pincode using Nominatim
            const geoRes = await fetch(
                `https://nominatim.openstreetmap.org/search?postalcode=${pincode}&country=India&format=json&addressdetails=1&limit=1`,
                { headers: { 'Accept-Language': 'en' } }
            );
            const geoData = await geoRes.json();

            if (geoData.length === 0) {
                setLocation(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Invalid pincode. Please try again.'
                }));
                return;
            }

            const result = geoData[0];
            const latitude = parseFloat(result.lat);
            const longitude = parseFloat(result.lon);
            const address = result.address || {};
            const locality = address.suburb || address.neighbourhood || address.village || address.town || '';
            const city = address.city || address.state_district || address.county || '';
            const state = address.state || '';
            const fullAddress = `${locality}${locality && city ? ', ' : ''}${city}`;

            // Check serviceability
            let serviceable = true;
            try {
                const checkRes = await api.post('/serviceability/check', {
                    latitude, longitude, pincode, city
                });
                serviceable = checkRes.data.serviceable;
            } catch (err) {
                serviceable = true;
            }

            setLocation({
                latitude,
                longitude,
                locality,
                city,
                state,
                pincode,
                fullAddress,
                serviceable,
                loading: false,
                error: null,
                permissionDenied: false
            });
        } catch (error) {
            setLocation(prev => ({
                ...prev,
                loading: false,
                error: 'Error looking up pincode'
            }));
        }
    };

    return (
        <LocationContext.Provider value={{
            ...location,
            detectLocation,
            setManualPincode
        }}>
            {children}
        </LocationContext.Provider>
    );
};

export default LocationContext;
