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
                    errorMsg = 'Location permission denied. Please search for your city or enter pincode.';
                    permissionDenied = true;
                } else if (error.code === 2) {
                    errorMsg = 'Unable to determine your location. Please search for your city.';
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
            // Use backend proxy for reverse geocoding (avoids CORS)
            const geoRes = await api.get(`/serviceability/geocode/reverse?lat=${latitude}&lon=${longitude}`);
            const geo = geoRes.data.data || {};

            const locality = geo.locality || '';
            const city = geo.city || '';
            const state = geo.state || '';
            const pincode = geo.pincode || '';
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
            console.error('Reverse geocoding error:', error);
            setLocation(prev => ({
                ...prev,
                latitude,
                longitude,
                loading: false,
                serviceable: true,
                error: 'Could not detect area name'
            }));
        }
    };

    // Search locations (for autocomplete suggestions)
    const searchLocations = async (query) => {
        try {
            const res = await api.get(`/serviceability/geocode/search?q=${encodeURIComponent(query)}`);
            return res.data.data || [];
        } catch (err) {
            console.error('Search locations error:', err);
            return [];
        }
    };

    // Select a location from autocomplete results
    const selectLocation = async (result) => {
        setLocation(prev => ({ ...prev, loading: true, error: null }));

        const { latitude, longitude, locality, city, state, pincode } = result;
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
    };

    const setManualPincode = async (pincode) => {
        setLocation(prev => ({ ...prev, loading: true, error: null }));

        try {
            // Use backend proxy to search by pincode
            const res = await api.get(`/serviceability/geocode/search?q=${pincode}`);
            const results = res.data.data || [];

            if (results.length === 0) {
                setLocation(prev => ({
                    ...prev,
                    loading: false,
                    error: 'Invalid pincode. Please try again.'
                }));
                return;
            }

            await selectLocation(results[0]);
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
            setManualPincode,
            searchLocations,
            selectLocation
        }}>
            {children}
        </LocationContext.Provider>
    );
};

export default LocationContext;
