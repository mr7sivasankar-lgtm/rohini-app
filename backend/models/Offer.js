import mongoose from 'mongoose';

const offerMessageSchema = new mongoose.Schema({
    from: {
        type: String,
        enum: ['customer', 'seller'],
        required: true
    },
    price: {
        type: Number,
        default: null
    },
    action: {
        type: String,
        enum: ['OFFER', 'COUNTER', 'ACCEPTED', 'REJECTED', 'CUSTOMER_ACCEPTED', 'CUSTOMER_REJECTED'],
        required: true
    },
    note: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const offerSchema = new mongoose.Schema({
    offerId: {
        type: String,
        unique: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Seller',
        required: true,
        index: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    quantity: {
        type: Number,
        required: true,
        min: 1
    },
    originalUnitPrice: {
        type: Number,
        required: true
    },
    offeredUnitPrice: {
        type: Number,
        required: true,
        min: 1
    },
    agreedUnitPrice: {
        type: Number,
        default: null
    },
    totalOfferAmount: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['PENDING', 'ACCEPTED', 'REJECTED', 'COUNTERED', 'CUSTOMER_ACCEPTED', 'CUSTOMER_REJECTED', 'EXPIRED', 'CANCELLED', 'CONVERTED_TO_ORDER'],
        default: 'PENDING'
    },
    roundNumber: {
        type: Number,
        default: 1
    },
    maxRounds: {
        type: Number,
        default: 3
    },
    expiresAt: {
        type: Date,
        required: true
    },
    messages: [offerMessageSchema],
    convertedOrderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    // Snapshot fields for size/color selection at time of offer
    selectedSize: { type: String, default: '' },
    selectedColor: { type: String, default: '' }
}, {
    timestamps: true
});

// Auto-generate offerId
offerSchema.pre('save', async function (next) {
    if (!this.offerId) {
        const count = await mongoose.model('Offer').countDocuments();
        this.offerId = `OFR${Date.now()}${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

offerSchema.index({ customer: 1, createdAt: -1 });
offerSchema.index({ seller: 1, createdAt: -1 });
offerSchema.index({ status: 1 });
offerSchema.index({ expiresAt: 1 });

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;
