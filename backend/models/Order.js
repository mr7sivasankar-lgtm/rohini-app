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
    items: [{
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: String,
        productCode: String,
        image: String,
        price: Number,
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        size: String,
        color: String
    }],
    shippingAddress: {
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
    subtotal: {
        type: Number,
        required: true
    },
    deliveryFee: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
    },
    paymentMethod: {
        type: String,
        enum: ['COD', 'Online'],
        default: 'COD'
    },
    status: {
        type: String,
        enum: ['Placed', 'Accepted', 'Packed', 'Out for Delivery', 'Delivered', 'Cancelled'],
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
    cancelReason: String
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
