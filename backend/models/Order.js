import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true
    },
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: String,
        productCode: String,
        image: String,
        mrpPrice: Number,
        sellingPrice: Number,
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        size: String,
        color: String,
        status: {
            type: String,
            enum: ['Active', 'Cancelled', 'Return Requested', 'Return Approved', 'Return Completed', 'Return Rejected', 'Exchange Requested', 'Exchange Approved', 'Exchange Completed', 'Exchange Rejected'],
            default: 'Active'
        },
        exchangeSize: String,
        exchangeColor: String,
        actionReason: {
            type: String,
            default: ''
        },
        cancelledBy: {
            type: String,
            enum: ['Customer', 'Admin', ''],
            default: ''
        },
        cancelledAt: {
            type: Date,
            default: null
        },
        returnRequestedAt: { type: Date, default: null },
        returnApprovedAt: { type: Date, default: null },
        returnCompletedAt: { type: Date, default: null },
        returnRejectedAt: { type: Date, default: null },
        exchangeRequestedAt: { type: Date, default: null },
        exchangeApprovedAt: { type: Date, default: null },
        exchangeCompletedAt: { type: Date, default: null },
        exchangeRejectedAt: { type: Date, default: null }
    }],
    shippingAddress: {
        fullName: { type: String },
        fullAddress: { type: String, required: true },
        city: String,
        district: String,
        pincode: String,
        latitude: Number,
        longitude: Number
    },
    contactInfo: {
        phone: { type: String, required: true },
        email: String
    },
    mrpTotal: {
        type: Number,
        default: 0
    },
    sellingPriceTotal: {
        type: Number,
        required: true
    },
    deliveryFee: {
        type: Number,
        default: 0
    },
    platformFee: {
        type: Number,
        default: 0
    },
    commissionAmount: {
        type: Number,
        default: 0
    },
    sellerEarning: {
        type: Number,
        default: 0
    },
    deliveryEarning: {
        type: Number,
        default: 0
    },
    totalAmount: {
        type: Number,
        required: true
    },
    walletSettlementStatus: {
        type: String,
        enum: ['Pending', 'Settled', 'Refunded'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Online'],
        default: 'COD'
    },
    status: {
        type: String,
        enum: ['Placed', 'Accepted', 'Ready for Pickup', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'],
        default: 'Placed'
    },
    statusHistory: [{
        status: String,
        timestamp: {
            type: Date,
            default: Date.now
        },
        note: String
    }],
    cancelReason: String,

    // Seller Pickup Details (Snapshot at order time)
    sellerShopName: String,
    sellerShopAddress: String,
    sellerLocation: {
        lat: Number,
        lng: Number
    },
    // Delivery Partner Assignment
    deliveryPartner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPartner',
        default: null
    },
    deliveryStatus: {
        type: String,
        enum: ['', 'Assigned', 'Picked Up', 'Out for Delivery', 'Delivered'],
        default: ''
    },
    deliveryType: {
        type: String,
        enum: ['Normal', 'Return Pickup', 'Exchange Pickup'],
        default: 'Normal'
    },
    deliveredAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

// Index for user's orders
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderId: 1 });
orderSchema.index({ status: 1 });

// Generate order ID before saving
orderSchema.pre('save', async function (next) {
    if (!this.orderId) {
        const count = await mongoose.model('Order').countDocuments();
        this.orderId = `ORD${Date.now()}${String(count + 1).padStart(4, '0')}`;
    }

    // Add to status history
    if (this.isNew) {
        this.statusHistory.push({
            status: this.status,
            timestamp: new Date()
        });
    }

    next();
});

const Order = mongoose.model('Order', orderSchema);

export default Order;
