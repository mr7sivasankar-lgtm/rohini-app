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
    email: { type: String, trim: true, default: '' },
    dob: { type: String, trim: true, default: '' },
    gender: { type: String, enum: ['Male', 'Female', 'Other', ''], default: '' },
    aadhaarNumber: { type: String, trim: true, default: '' },
    panNumber: { type: String, trim: true, default: '' },
    bankAccountName: { type: String, trim: true, default: '' },
    bankAccountNumber: { type: String, trim: true, default: '' },
    bankIfsc: { type: String, trim: true, default: '' },
    bankName: { type: String, trim: true, default: '' },
    status: { 
        type: String, 
        enum: ['Pending Approval', 'Approved', 'Rejected'], 
        default: 'Pending Approval' 
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
    address: { type: String, trim: true, default: '' },
    city: { type: String, trim: true, default: '' },
    state: { type: String, trim: true, default: '' },
    pincode: { type: String, trim: true, default: '' },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            default: [0, 0]
        }
    },
    isOnline: {
        type: Boolean,
        default: false
    },
    isActive: {
        type: Boolean,
        default: false
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

// Index for geo-spatial queries
deliveryPartnerSchema.index({ location: '2dsphere' });

const DeliveryPartner = mongoose.model('DeliveryPartner', deliveryPartnerSchema);
export default DeliveryPartner;
