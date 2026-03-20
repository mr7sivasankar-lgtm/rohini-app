import mongoose from 'mongoose';

const walletTransactionSchema = new mongoose.Schema({
    userType: {
        type: String,
        enum: ['Seller', 'DeliveryPartner', 'Admin'],
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
        required: true
    },
    type: {
        type: String,
        enum: ['Order Earning', 'Delivery Earning', 'Commission', 'Withdrawal', 'Refund'],
        required: true
    },
    status: {
        type: String,
        enum: ['Success', 'Pending', 'Failed'],
        default: 'Success'
    },
    orderId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        default: null
    },
    description: {
        type: String,
        required: true
    },
    balanceAfter: {
        type: Number,
        required: true
    }
}, {
    timestamps: true
});

const WalletTransaction = mongoose.model('WalletTransaction', walletTransactionSchema);

export default WalletTransaction;
