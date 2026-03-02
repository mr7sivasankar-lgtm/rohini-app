import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true,
        index: true
    },
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    rating: {
        type: Number,
        required: [true, 'Please add a rating'],
        min: 1,
        max: 5
    },
    title: {
        type: String,
        trim: true,
        maxlength: 100
    },
    comment: {
        type: String,
        required: [true, 'Please add a comment'],
        trim: true,
        maxlength: 500
    }
}, {
    timestamps: true
});

// One review per user per product
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

const Review = mongoose.models.Review || mongoose.model('Review', reviewSchema);

export default Review;
