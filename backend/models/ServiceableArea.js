import mongoose from 'mongoose';

const serviceableAreaSchema = new mongoose.Schema({
    type: {
        type: String,
        enum: ['city', 'pincode', 'radius'],
        required: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    city: {
        type: String,
        trim: true
    },
    state: {
        type: String,
        trim: true
    },
    pincode: {
        type: String,
        trim: true
    },
    latitude: {
        type: Number
    },
    longitude: {
        type: Number
    },
    radiusKm: {
        type: Number,
        default: 5
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, { timestamps: true });

const ServiceableArea = mongoose.model('ServiceableArea', serviceableAreaSchema);

export default ServiceableArea;
