import mongoose from 'mongoose';

const supportTicketSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        required: true,
        refPath: 'userModel'
    },
    userModel: {
        type: String,
        required: true,
        enum: ['User', 'Seller', 'DeliveryPartner']
    },
    subject: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    status: {
        type: String,
        enum: ['Open', 'In Progress', 'Resolved'],
        default: 'Open'
    },
    replies: [{
        senderType: {
            type: String,
            enum: ['User', 'Admin'],
            required: true
        },
        senderName: {
            type: String,
            required: true
        },
        message: {
            type: String,
            required: true
        },
        createdAt: {
            type: Date,
            default: Date.now
        }
    }]
}, {
    timestamps: true
});

// Generate ticket ID before validation
supportTicketSchema.pre('validate', async function(next) {
    if (!this.ticketId) {
        const count = await mongoose.model('SupportTicket').countDocuments();
        this.ticketId = `SUP-${String(count + 1).padStart(4, '0')}`;
    }
    next();
});

const SupportTicket = mongoose.model('SupportTicket', supportTicketSchema);
export default SupportTicket;
