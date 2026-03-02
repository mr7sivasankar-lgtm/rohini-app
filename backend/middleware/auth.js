import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'Not authorized to access this route'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = await User.findById(decoded.id);

            if (!req.user) {
                return res.status(401).json({
                    success: false,
                    message: 'User no longer exists'
                });
            }

            next();
        } catch (error) {
            return res.status(401).json({
                success: false,
                message: 'Invalid token'
            });
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error in authentication'
        });
    }
};

export const adminOnly = async (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        res.status(403).json({
            success: false,
            message: 'Access denied. Admin only.'
        });
    }
};

// Optional auth - doesn't fail if no token
export const optionalAuth = async (req, res, next) => {
    try {
        let token;

        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];

            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                req.user = await User.findById(decoded.id);
            } catch (error) {
                // Token invalid, but continue without user
                req.user = null;
            }
        }

        next();
    } catch (error) {
        next();
    }
};
