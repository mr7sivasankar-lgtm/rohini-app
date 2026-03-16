import axios from 'axios';

// Use environment variable, fallback to localhost for development
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

// Add a request interceptor to add the auth token to requests
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('sellerToken');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
    if (!imagePath) return null;
    if (imagePath.startsWith('http')) return imagePath;

    // Check if it's already a full cloudinary URL (just in case)
    if (imagePath.includes('res.cloudinary.com')) return imagePath;

    const baseUrl = API_URL.replace('/api', '');
    return `${baseUrl}${imagePath.startsWith('/') ? '' : '/'}${imagePath}`;
};

export default api;
