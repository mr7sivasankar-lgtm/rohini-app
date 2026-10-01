import mongoose from 'mongoose';

const subscriptionPlanSchema = new mongoose.Schema({
    planId: {
        type: String,
        required: true,
        unique: true,
        uppercase: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    price: {
        type: Number,
        required: true,
        min: 1
    },
    duration: {
        type: Number,
        required: true,
        min: 1,
        default: 1
    },
    durationType: {
        type: String,
        enum: ['DAY', 'WEEK', 'MONTH'],
        default: 'DAY'
    },
    description: {
        type: String,
        default: ''
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

const SubscriptionPlan = mongoose.model('SubscriptionPlan', subscriptionPlanSchema);

export default SubscriptionPlan;
