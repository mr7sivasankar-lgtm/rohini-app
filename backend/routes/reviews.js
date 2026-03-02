import express from 'express';
import Review from '../models/Review.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// @route   GET /api/reviews/:productId
// @desc    Get all reviews for a product
// @access  Public
router.get('/:productId', async (req, res) => {
    try {
        const reviews = await Review.find({ product: req.params.productId })
            .populate('user', 'name phone')
            .sort({ createdAt: -1 });

        // Calculate stats
        const total = reviews.length;
        const avgRating = total > 0
            ? (reviews.reduce((sum, r) => sum + r.rating, 0) / total).toFixed(1)
            : 0;

        const distribution = [0, 0, 0, 0, 0]; // index 0 = 1-star, index 4 = 5-star
        reviews.forEach(r => { distribution[r.rating - 1]++; });

        res.status(200).json({
            success: true,
            data: reviews,
            stats: {
                total,
                avgRating: parseFloat(avgRating),
                distribution
            }
        });
    } catch (error) {
        console.error('Get reviews error:', error);
        res.status(500).json({ success: false, message: 'Error fetching reviews' });
    }
});

// @route   POST /api/reviews/:productId
// @desc    Add a review
// @access  Private
router.post('/:productId', protect, async (req, res) => {
    try {
        const { rating, title, comment } = req.body;

        // Check if user already reviewed
        const existing = await Review.findOne({
            product: req.params.productId,
            user: req.user._id
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this product'
            });
        }

        const review = await Review.create({
            product: req.params.productId,
            user: req.user._id,
            rating,
            title,
            comment
        });

        const populated = await Review.findById(review._id).populate('user', 'name phone');

        res.status(201).json({
            success: true,
            message: 'Review added successfully',
            data: populated
        });
    } catch (error) {
        console.error('Add review error:', error);
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'You have already reviewed this product'
            });
        }
        res.status(500).json({ success: false, message: 'Error adding review' });
    }
});

// @route   PUT /api/reviews/:reviewId
// @desc    Update a review
// @access  Private
router.put('/:reviewId', protect, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        if (review.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const { rating, title, comment } = req.body;
        if (rating) review.rating = rating;
        if (title !== undefined) review.title = title;
        if (comment) review.comment = comment;

        await review.save();
        const populated = await Review.findById(review._id).populate('user', 'name phone');

        res.status(200).json({
            success: true,
            message: 'Review updated successfully',
            data: populated
        });
    } catch (error) {
        console.error('Update review error:', error);
        res.status(500).json({ success: false, message: 'Error updating review' });
    }
});

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete a review
// @access  Private
router.delete('/:reviewId', protect, async (req, res) => {
    try {
        const review = await Review.findById(req.params.reviewId);

        if (!review) {
            return res.status(404).json({ success: false, message: 'Review not found' });
        }

        if (review.user.toString() !== req.user._id.toString()) {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        await Review.findByIdAndDelete(req.params.reviewId);

        res.status(200).json({
            success: true,
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ success: false, message: 'Error deleting review' });
    }
});

export default router;
