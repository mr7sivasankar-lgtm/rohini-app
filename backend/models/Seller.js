import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const sellerSchema = new mongoose.Schema({
    shopName: {
        type: String,
        required: [true, 'Please provide shop name']
    },
    ownerName: {
        type: String,
        required: [true, 'Please provide owner name']
    },
    phone: {
        type: String,
        required: [true, 'Please provide phone number'],
        unique: true
    },
    password: {
        type: String,
        required: [true, 'Please provide a password'],
        select: false
    },
    shopAddress: {
        type: String,
        required: [true, 'Please provide full shop address']
    },
    location: {
        type: {
            type: String,
            enum: ['Point'],
            default: 'Point'
        },
        coordinates: {
            type: [Number],
            validate: {
                validator: function(v) {
                    return v && v.length === 2 && v[0] !== null && v[1] !== null;
                },
                message: 'Please provide valid coordinates [longitude, latitude]'
            }
        }
    },
    shopCategory: {
        type: String,
        enum: ['Men Clothing', 'Women Clothing', 'Kids Clothing', 'Mixed Fashion Store'],
        default: 'Mixed Fashion Store'
    },
    businessCategory: {
        type: String,
        default: 'Clothing'
    },
    gstNumber: {
        type: String,
        default: ''
    },
    shopLogo: {
        type: String,
        default: ''
    },
    logoImage: {
        type: String,
        default: ''
    },
    openingTime: {
        type: String,
        default: '10:00'
    },
    closingTime: {
        type: String,
        default: '21:00'
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'Suspended'],
        default: 'Pending'
    },
    rating: {
        type: Number,
        default: 0
    },
    numReviews: {
        type: Number,
        default: 0
    },
    bannerImage: {
        type: String,
        default: ''
    },
    description: {
        type: String,
        default: ''
    },
    isOpen: {
        type: Boolean,
        default: true
    },
    deliveryRadius: {
        type: Number,
        default: 5
    },
    minOrderAmount: {
        type: Number,
        default: 0
    },
    isPhoneVerified: {
        type: Boolean,
        default: false
    },
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false }
}, {
    timestamps: true
});

// Auto-generate starting price field for discovery (can be updated sequentially as products are added)
sellerSchema.virtual('startingPrice').get(function() {
    return this._startingPrice || 199; // Default fallback if not populated via aggregation
});

// Match user entered password to hashed password in database
sellerSchema.methods.matchPassword = async function(enteredPassword) {
    return await bcrypt.compare(enteredPassword, this.password);
};

// Encrypt password using bcrypt
sellerSchema.pre('save', async function(next) {
    if (!this.isModified('password')) {
        next();
    }
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
});

// Create 2dsphere index on location for geo-querying
sellerSchema.index({ location: '2dsphere' });

const Seller = mongoose.model('Seller', sellerSchema);

export default Seller;
