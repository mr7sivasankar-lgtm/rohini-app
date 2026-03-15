import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const deliveryPartnerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Please add a name'],
        trim: true
    },
    phone: {
        type: String,
        required: [true, 'Please add a phone number'],
        unique: true,
        trim: true
    },
    password: {
        type: String,
        required: [true, 'Please add a password'],
        minlength: 6,
        select: false
    },
    vehicleType: {
        type: String,
        enum: ['Bike', 'Scooter', 'Bicycle', 'Car', 'Other'],
        default: 'Bike'
    },
    vehicleNumber: {
        type: String,
        trim: true,
        default: ''
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: true
    },
    activeOrdersCount: {
        type: Number,
        default: 0
    },
    totalDeliveries: {
        type: Number,
        default: 0
    }
}, {
    timestamps: true
});

// Hash password before saving
deliveryPartnerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
});

// Match password
deliveryPartnerSchema.methods.matchPassword = async function (enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
export default DeliveryPartner;
