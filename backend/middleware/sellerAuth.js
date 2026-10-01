import jwt from 'jsonwebtoken';
import Seller from '../models/Seller.js';

/**
 * Seller JWT middleware — extracted to avoid circular imports.
 * sellers.js, subscriptions.js, and offers.js all import from here.
 */
const sellerProtect = async (req, res, next) => {
    try {
        let token;
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }

        if (!token) return res.status(401).json({ success: false, message: 'Not authorized, no token' });

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            if (decoded.role !== 'seller') {
                return res.status(401).json({ success: false, message: 'Not authorized as seller' });
            }
            req.seller = await Seller.findById(decoded.id);
            if (!req.seller) return res.status(401).json({ success: false, message: 'Seller not found' });
            next();
        } catch (error) {
            return res.status(401).json({ success: false, message: 'Not authorized, token failed' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

export { sellerProtect };
