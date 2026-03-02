import mongoose from 'mongoose';

const addressSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true
    },
    street: {
        type: String,
        required: [true, 'Street address is required'],
        trim: true
    },
    landmark: {
        type: String,
        trim: true
    },
    city: {
        type: String,
        required: [true, 'City is required'],
        trim: true
    },
    state: {
        type: String,
        required: [true, 'State is required'],
        trim: true
    },
    pincode: {
        type: String,
        required: [true, 'Pincode is required'],
        validate: {
            validator: function (v) {
                return /^\d{6}$/.test(v);
            },
            message: 'Pincode must be exactly 6 digits'
        }
    },
    phone: {
        type: String,
        required: [true, 'Phone number is required'],
        validate: {
            validator: function (v) {
                return /^\d{10}$/.test(v);
            },
            message: 'Phone number must be exactly 10 digits'
        }
    },
    addressType: {
        type: String,
        enum: ['Home', 'Work', 'Other'],
        default: 'Home'
    },
    isDefault: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Index for faster queries
addressSchema.index({ userId: 1, isDefault: 1 });

// Ensure only one default address per user
addressSchema.pre('save', async function (next) {
    if (this.isDefault) {
        await mongoose.model('Address').updateMany(
            { userId: this.userId, _id: { $ne: this._id } },
            { $set: { isDefault: false } }
        );
    }
    next();
});

const Address = mongoose.model('Address', addressSchema);

export default Address;
