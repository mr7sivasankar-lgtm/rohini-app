import mongoose from 'mongoose';

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Both', 'Kids', 'Unisex'],
        required: true
    },
    icon: {
        type: String
    },
    image: {
        type: String
    },
    parentCategory: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        default: null
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

// Index for faster queries
categorySchema.index({ gender: 1, parentCategory: 1 });

const Category = mongoose.model('Category', categorySchema);

export default Category;
