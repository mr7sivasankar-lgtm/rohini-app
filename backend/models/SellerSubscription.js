import mongoose from 'mongoose';

const sellerSubscriptionSchema = new mongoose.Schema({
    subscriptionId: {
        type: String,
        unique: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true,
        index: true
    },
    planId: {
        type: String,
        required: true
    },
    planName: {
        type: String,
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    startDate: {
        type: Date,
        required: true
    },
    expiryDate: {
        type: Date,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACTIVE', 'EXPIRED', 'CANCELLED', 'SUSPENDED'],
        default: 'PENDING'
    },
    razorpayOrderId: {
        type: String,
        default: null
    },
    razorpayPaymentId: {
        type: String,
        default: null
    },
    paymentStatus: {
        type: String,
        enum: ['PENDING', 'SUCCESS', 'FAILED', 'REFUNDED'],
        default: 'PENDING'
    }
}, {
    timestamps: true
});

// Auto-generate subscriptionId
sellerSubscriptionSchema.pre('save', async function (next) {
    if (!this.subscriptionId) {
        const count = await mongoose.model('SellerSubscription').countDocuments();
        this.subscriptionId = `SUB${Date.now()}${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

sellerSubscriptionSchema.index({ seller: 1, createdAt: -1 });
sellerSubscriptionSchema.index({ status: 1 });
sellerSubscriptionSchema.index({ expiryDate: 1 });

const SellerSubscription = mongoose.model('SellerSubscription', sellerSubscriptionSchema);

export default SellerSubscription;
