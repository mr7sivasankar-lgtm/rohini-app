import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from './models/Category.js';

dotenv.config();

const connectDB = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

const undoWomensCategories = async () => {
    try {
        console.log('🔄 Undoing Women\'s Wear categories...\n');

        // Delete all categories created by the seed script
        const result = await Category.deleteMany({
            gender: 'Female'
        });

        console.log(`✅ Deleted ${result.deletedCount} categories`);
        console.log('\n🎉 Undo completed successfully!\n');

    } catch (error) {
        console.error('❌ Error undoing categories:', error);
        throw error;
    }
};

const run = async () => {
    await connectDB();
    await undoWomensCategories();
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
};

run();
