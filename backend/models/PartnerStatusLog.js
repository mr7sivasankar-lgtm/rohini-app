import mongoose from 'mongoose';

const partnerStatusLogSchema = new mongoose.Schema({
    partner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DeliveryPartner',
        required: true,
        index: true
    },
    isOnline: {
        type: Boolean,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
}, {
    // No timestamps needed — timestamp field IS the record
});

const PartnerStatusLog = mongoose.model('PartnerStatusLog', partnerStatusLogSchema);
export default PartnerStatusLog;
