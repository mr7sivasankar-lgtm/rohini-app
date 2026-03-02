import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';

dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ MongoDB Connected');

    // Delete any "Clothing" category under Kids Wear
    const result = await Category.deleteMany({
        name: { $in: ['Clothing', 'Kids - Clothing'] },
        gender: 'Kids'
    });
    console.log(`🗑️  Deleted ${result.deletedCount} old Kids "Clothing" categories`);

    // Also remove "Age Group" from parentCategories level (keep only as a reference)
    // — leave it in DB so subcategories still exist, just won't show in Category dropdown

    await mongoose.connection.close();
    console.log('✅ Done');
    process.exit(0);
};

run().catch(e => { console.error(e); process.exit(1); });
