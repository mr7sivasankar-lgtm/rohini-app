import mongoose from 'mongoose';

const withdrawalSchema = new mongoose.Schema({
    userType: {
        type: String,
        enum: ['Seller', 'DeliveryPartner'],
        required: true,
        index: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        index: true
    },
    amount: {
        type: Number,
        required: true,
        min: 100 // Example minimum withdrawal
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending',
        index: true
    },
    // Snapshot of bank details at the time of withdrawal request to prevent mismatches
    bankDetails: {
        bankAccountName: { type: String, required: true },
        bankAccountNumber: { type: String, required: true },
        bankIfsc: { type: String, required: true },
        bankName: { type: String, required: true },
        upiId: { type: String, default: '' }
    },
    adminNotes: {
        type: String,
        default: ''
    },
    processedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true
});

const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

export default Withdrawal;
