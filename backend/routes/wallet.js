import express from 'express';
import WalletTransaction from '../models/WalletTransaction.js';
import Withdrawal from '../models/Withdrawal.js';
import Seller from '../models/Seller.js';
import DeliveryPartner from '../models/DeliveryPartner.js';
import { protect, adminOnly } from '../middleware/auth.js';
import { sellerProtect } from './sellers.js';
import { protectDelivery } from './delivery.js';

const router = express.Router();

// -------------------------------------------------------------
// SELLER WALLET APIS
// -------------------------------------------------------------

// @desc    Get Seller Wallet Balance & Ledgers
// @route   GET /api/wallet/seller
// @access  Private (Seller)
router.get('/seller', sellerProtect, async (req, res) => {
    try {
        const seller = await Seller.findById(req.seller._id);
        const transactions = await WalletTransaction.find({ userType: 'Seller', userId: seller._id }).sort({ createdAt: -1 });
        const withdrawals = await Withdrawal.find({ userType: 'Seller', userId: seller._id }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: {
                balance: seller.walletBalance || 0,
                transactions,
                withdrawals
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Request Seller Withdrawal
// @route   POST /api/wallet/seller/withdraw
// @access  Private (Seller)
router.post('/seller/withdraw', sellerProtect, async (req, res) => {
    try {
        const { amount } = req.body;
        const seller = await Seller.findById(req.seller._id);

        if (!amount || amount < 100) {
            return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹100' });
        }

        if (seller.walletBalance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        }

        if (!seller.bankAccountNumber || !seller.bankIfsc) {
            return res.status(400).json({ success: false, message: 'Please update your bank details in profile first' });
        }

        // Check if there's already a pending withdrawal
        const activeRequest = await Withdrawal.findOne({ userType: 'Seller', userId: seller._id, status: 'Pending' });
        if (activeRequest) {
            return res.status(400).json({ success: false, message: 'You already have a requested withdrawal pending approval.' });
        }

        const withdrawal = await Withdrawal.create({
            userType: 'Seller',
            userId: seller._id,
            amount: Number(amount),
            bankDetails: {
                bankAccountName: seller.bankAccountName,
                bankAccountNumber: seller.bankAccountNumber,
                bankIfsc: seller.bankIfsc,
                bankName: seller.bankName,
                upiId: seller.upiId
            }
        });

        res.json({ success: true, message: 'Withdrawal request submitted successfully', data: withdrawal });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// -------------------------------------------------------------
// DELIVERY PARTNER WALLET APIS
// -------------------------------------------------------------

// @desc    Get Delivery Partner Wallet Balance & Ledgers
// @route   GET /api/wallet/delivery
// @access  Private (Delivery Partner)
router.get('/delivery', protectDelivery, async (req, res) => {
    try {
        const partner = await DeliveryPartner.findById(req.partner._id);
        const transactions = await WalletTransaction.find({ userType: 'DeliveryPartner', userId: partner._id }).sort({ createdAt: -1 });
        const withdrawals = await Withdrawal.find({ userType: 'DeliveryPartner', userId: partner._id }).sort({ createdAt: -1 });

        res.json({
            success: true,
            data: {
                balance: partner.walletBalance || 0,
                transactions,
                withdrawals
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Request Delivery Partner Withdrawal
// @route   POST /api/wallet/delivery/withdraw
// @access  Private (Delivery)
router.post('/delivery/withdraw', protectDelivery, async (req, res) => {
    try {
        const { amount } = req.body;
        const partner = await DeliveryPartner.findById(req.partner._id);

        if (!amount || amount < 100) {
            return res.status(400).json({ success: false, message: 'Minimum withdrawal amount is ₹100' });
        }

        if (partner.walletBalance < amount) {
            return res.status(400).json({ success: false, message: 'Insufficient wallet balance' });
        }

        if (!partner.bankAccountNumber || !partner.bankIfsc) {
            return res.status(400).json({ success: false, message: 'Please update your bank details in profile first' });
        }

        const activeRequest = await Withdrawal.findOne({ userType: 'DeliveryPartner', userId: partner._id, status: 'Pending' });
        if (activeRequest) {
            return res.status(400).json({ success: false, message: 'You already have a requested withdrawal pending approval.' });
        }

        const withdrawal = await Withdrawal.create({
            userType: 'DeliveryPartner',
            userId: partner._id,
            amount: Number(amount),
            bankDetails: {
                bankAccountName: partner.bankAccountName,
                bankAccountNumber: partner.bankAccountNumber,
                bankIfsc: partner.bankIfsc,
                bankName: partner.bankName
            }
        });

        res.json({ success: true, message: 'Withdrawal request submitted successfully', data: withdrawal });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// -------------------------------------------------------------
// ADMIN PAYOUT APIS
// -------------------------------------------------------------

// @desc    Admin: get all withdrawal requests
// @route   GET /api/wallet/admin/withdrawals
// @access  Private (Admin)
router.get('/admin/withdrawals', protect, adminOnly, async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find({})
            .sort({ createdAt: -1 })
            .populate({ path: 'userId', select: 'shopName ownerName phone name' }); // 'name' handles delivery, 'shopName/owner' handles seller

        res.json({ success: true, data: withdrawals });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

// @desc    Admin: Process withdrawal (Approve/Reject)
// @route   PUT /api/wallet/admin/withdrawals/:id
// @access  Private (Admin)
router.put('/admin/withdrawals/:id', protect, adminOnly, async (req, res) => {
    try {
        const { status, adminNotes } = req.body; // 'Approved' or 'Rejected'
        const withdrawal = await Withdrawal.findById(req.params.id);

        if (!withdrawal) return res.status(404).json({ success: false, message: 'Request not found' });
        if (withdrawal.status !== 'Pending') return res.status(400).json({ success: false, message: 'Already processed' });

        if (status === 'Approved') {
            const Model = withdrawal.userType === 'Seller' ? Seller : DeliveryPartner;
            const user = await Model.findById(withdrawal.userId);

            if (user.walletBalance < withdrawal.amount) {
                return res.status(400).json({ success: false, message: 'User wallet balance depleted below requested amount!' });
            }

            // Deduct from wallet and append negative ledger
            user.walletBalance -= withdrawal.amount;
            await user.save();

            await WalletTransaction.create({
                userType: withdrawal.userType,
                userId: withdrawal.userId,
                amount: -withdrawal.amount, // strict negative debit
                type: 'Withdrawal',
                status: 'Success',
                description: `Bank transfer processing for ₹${withdrawal.amount}`,
                balanceAfter: user.walletBalance
            });
            
            withdrawal.status = 'Approved';

        } else if (status === 'Rejected') {
            withdrawal.status = 'Rejected';
            // No wallet change upon rejection since we didn't deduct during creation.
        }

        withdrawal.adminNotes = adminNotes || '';
        withdrawal.processedAt = new Date();
        await withdrawal.save();

        res.json({ success: true, message: `Withdrawal successfully marked as ${status}`, data: withdrawal });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

export default router;
