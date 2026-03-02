import mongoose from 'mongoose';

const productSchema = new mongoose.Schema({
    // Basic Information
    name: {
        type: String,
        required: [true, 'Please add a product name'],
        trim: true,
        index: true
    },
    brand: {
        type: String,
        trim: true,
        index: true
    },
    description: {
        type: String,
        required: [true, 'Please add a description']
    },
    price: {
        type: Number,
        required: [true, 'Please add a price'],
        min: 0
    },
    originalPrice: {
        type: Number,
        min: 0
    },
    discount: {
        type: Number,
        default: 0,
        min: 0,
        max: 100
    },
    stock: {
        type: Number,
        required: [true, 'Please add stock quantity'],
        min: 0,
        default: 0
    },

    // Categorization
    category: { // Main Category (e.g., Women's Wear) or Parent (Clothing)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        required: true,
        index: true
    },
    subcategory: { // Specific Subcategory (e.g., Dresses)
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Category',
        index: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Kids', 'Unisex'],
        required: [true, 'Please select a gender'],
        index: true
    },

    // Product Variants
    sizes: [{
        type: String,
        trim: true
    }],
    colors: [{
        type: String,
        trim: true
    }],

    // Fabric & Details
    fabric: { type: String, trim: true },
    fit: { type: String, trim: true },
    pattern: { type: String, trim: true },
    sleeve: { type: String, trim: true },
    neck: { type: String, trim: true },

    // Images
    images: [{
        type: String,
        required: [true, 'Please add at least one image']
    }],

    // Delivery & Returns
    deliveryTime: {
        type: String,
        default: '3-5 Days'
    },
    returnPolicy: {
        type: String,
        default: 'No Returns'
    },

    // Status & Toggles
    isActive: {
        type: Boolean,
        default: true,
        index: true
    },
    featured: {
        type: Boolean,
        default: false,
        index: true
    },
    trending: {
        type: Boolean,
        default: false,
        index: true
    },
    newArrival: {
        type: Boolean,
        default: false,
        index: true
    },
    bestSeller: {
        type: Boolean,
        default: false,
        index: true
    }
}, {
    timestamps: true
});

// Text Search Index
productSchema.index({ name: 'text', description: 'text', brand: 'text' });

const Product = mongoose.models.Product || mongoose.model('Product', productSchema);

export default Product;
