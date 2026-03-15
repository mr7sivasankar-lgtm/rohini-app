import { createContext, useContext, useState, useEffect } from 'react';
import api from '../utils/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [partner, setPartner] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('deliveryToken');
        const saved = localStorage.getItem('deliveryPartner');
        if (token && saved) {
            setPartner(JSON.parse(saved));
        }
        setLoading(false);
    }, []);

    const login = async (phone, password) => {
        const res = await api.post('/delivery/login', { phone, password });
        const { token, partner } = res.data.data;
        localStorage.setItem('deliveryToken', token);
        localStorage.setItem('deliveryPartner', JSON.stringify(partner));
        setPartner(partner);
        return partner;
    };

    const register = async (data) => {
        const res = await api.post('/delivery/register', data);
        const { token, partner } = res.data.data;
        localStorage.setItem('deliveryToken', token);
        localStorage.setItem('deliveryPartner', JSON.stringify(partner));
        setPartner(partner);
        return partner;
    };

    const logout = () => {
        localStorage.removeItem('deliveryToken');
        localStorage.removeItem('deliveryPartner');
        setPartner(null);
    };

    const updatePartner = (data) => {
        const updated = { ...partner, ...data };
        setPartner(updated);
        localStorage.setItem('deliveryPartner', JSON.stringify(updated));
    };

    return (
        <AuthContext.Provider value={{ partner, loading, login, register, logout, updatePartner }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
