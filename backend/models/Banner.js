import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
    title: {
        type: String,
        trim: true
    },
    image: {
        type: String,
        required: true
    },
    link: {
        type: String
    },
    order: {
        type: Number,
        default: 0
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true
});

// Index for active banners
bannerSchema.index({ isActive: 1, order: 1 });

const Banner = mongoose.model('Banner', bannerSchema);

export default Banner;
