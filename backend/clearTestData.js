/**
 * clearTestData.js
 * Wipes ALL user / seller / delivery-partner / order data for a clean test.
 * PRESERVES: Admin user, Categories, Banners, GlobalConfig/AdminSettings, Products.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config();

const ADMIN_PHONE = process.env.ADMIN_PHONE || '+919999999999';

// ── Flexible schemas (strict:false reads any document) ──────────────────────
const S = (name) =>
    mongoose.models[name] || mongoose.model(name, new mongoose.Schema({}, { strict: false, collection: name.toLowerCase() + 's' }));

const flex = (name, collection) =>
    mongoose.models[name] ||
    mongoose.model(name, new mongoose.Schema({}, { strict: false }), collection);

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected\n');

    // ── 1. Keep admin user, delete all other Users ────────────────────────────
    const User = flex('User', 'users');
    const admin = await User.findOne({ phone: ADMIN_PHONE });
    if (!admin) {
        console.warn(`⚠️  Admin not found (phone: ${ADMIN_PHONE}). Aborting to be safe.`);
        process.exit(1);
    }
    const deletedUsers = await User.deleteMany({ _id: { $ne: admin._id } });
    console.log(`🗑️  Users deleted       : ${deletedUsers.deletedCount}  (admin preserved)`);

    // ── 2. Delete all Sellers ─────────────────────────────────────────────────
    const Seller = flex('Seller', 'sellers');
    const deletedSellers = await Seller.deleteMany({});
    console.log(`🗑️  Sellers deleted     : ${deletedSellers.deletedCount}`);

    // ── 3. Delete all Delivery Partners ──────────────────────────────────────
    const DeliveryPartner = flex('DeliveryPartner', 'deliverypartners');
    const deletedPartners = await DeliveryPartner.deleteMany({});
    console.log(`🗑️  Delivery partners   : ${deletedPartners.deletedCount}`);

    // ── 4. Delete all Orders ──────────────────────────────────────────────────
    const Order = flex('Order', 'orders');
    const deletedOrders = await Order.deleteMany({});
    console.log(`🗑️  Orders deleted      : ${deletedOrders.deletedCount}`);

    // ── 5. Delete all Wallet Transactions ──────────────────────────────────────
    const WalletTransaction = flex('WalletTransaction', 'wallettransactions');
    const deletedWallet = await WalletTransaction.deleteMany({});
    console.log(`🗑️  Wallet Txns deleted : ${deletedWallet.deletedCount}`);

    // ── 6. Delete all Addresses ────────────────────────────────────────────────
    const Address = flex('Address', 'addresses');
    const deletedAddr = await Address.deleteMany({});
    console.log(`🗑️  Addresses deleted   : ${deletedAddr.deletedCount}`);

    // ── 7. Delete all Cart items ──────────────────────────────────────────────
    const Cart = flex('Cart', 'carts');
    const deletedCart = await Cart.deleteMany({});
    console.log(`🗑️  Carts deleted       : ${deletedCart.deletedCount}`);

    // ── 8. Delete all Reviews ─────────────────────────────────────────────────
    const Review = flex('Review', 'reviews');
    const deletedReviews = await Review.deleteMany({});
    console.log(`🗑️  Reviews deleted     : ${deletedReviews.deletedCount}`);

    // ── 9. Delete PartnerStatusLogs ───────────────────────────────────────────
    const PartnerStatusLog = flex('PartnerStatusLog', 'partnerstatuslogs');
    const deletedLogs = await PartnerStatusLog.deleteMany({});
    console.log(`🗑️  Partner logs deleted: ${deletedLogs.deletedCount}`);

    // ── 10. Delete OTPs ───────────────────────────────────────────────────────
    const OTP = flex('OTP', 'otps');
    const deletedOtps = await OTP.deleteMany({});
    console.log(`🗑️  OTPs deleted        : ${deletedOtps.deletedCount}`);

    console.log('\n✅ Test data cleared. PRESERVED: Admin, Categories, Banners, Config, Products.\n');
    process.exit(0);
};

run().catch(err => {
    console.error('❌ Error:', err.message);
    process.exit(1);
});
