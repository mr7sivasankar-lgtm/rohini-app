import mongoose from 'mongoose';

const adminConfigSchema = new mongoose.Schema({
    // There should theoretically only ever be 1 document in this collection
    singletonKey: {
        type: String,
        default: 'SYSTEM_CONFIG',
        unique: true
    },
    commissionPercentage: {
        type: Number,
        default: 20 // 20%
    },
    platformFee: {
        type: Number,
        default: 10 // ₹10
    },
    deliveryChargePerKm: {
        type: Number,
        default: 5 // ₹5
    },
    baseDeliveryCharge: {
        type: Number,
        default: 20 // ₹20
    },
    baseDeliveryDistance: {
        type: Number,
        default: 2 // First 2 KM are covered by baseDeliveryCharge
    },
    paymentGatewayPercentage: {
        type: Number,
        default: 2 // 2% of total order amount
    },
    freeDeliveryThreshold: {
        type: Number,
        default: 0 // ₹0 means disabled unless specified
    },
    // === Welcome Promo (Free Delivery for New Users) ===
    welcomePromoEnabled: {
        type: Boolean,
        default: false
    },
    welcomePromoCode: {
        type: String,
        default: 'WELCOME',
        trim: true,
        uppercase: true
    },
    welcomePromoUsageCount: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

const AdminConfig = mongoose.model('AdminConfig', adminConfigSchema);

// Helper function to get config, creating it if it doesn't exist
AdminConfig.getConfig = async function() {
    let config = await this.findOne({ singletonKey: 'SYSTEM_CONFIG' });
    if (!config) {
        config = await this.create({ singletonKey: 'SYSTEM_CONFIG' });
    }
    return config;
};

export default AdminConfig;
