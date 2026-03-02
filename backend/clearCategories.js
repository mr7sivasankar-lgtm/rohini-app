import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config();

const clearCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        // Define Category Schema (inline since we just want to delete)
        const categorySchema = new mongoose.Schema({
            name: {
                type: String,
                required: [true, 'Please add a category name'],
                unique: true,
                trim: true,
                maxlength: [50, 'Name can not be more than 50 characters']
            },
            // other fields don't matter for deletion
        }, { strict: false }); // strict: false allows deleting documents even if schema doesn't match exactly

        // Check if model already exists to avoid OverwriteModelError
        const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

        // Delete all categories
        const result = await Category.deleteMany({});
        console.log(`✅ Deleted ${result.deletedCount} categories`);

        console.log('🎉 Database cleared successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error clearing categories:', error);
        process.exit(1);
    }
};

clearCategories();
