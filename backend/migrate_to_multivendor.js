import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env') });

import Seller from './models/Seller.js';
import Product from './models/Product.js';
import Order from './models/Order.js';

async function migrateData() {
    try {
        await mongoose.connect(process.env.MONGO_URI);
        console.log('MongoDB Connected');

        // Create a default Admin Seller if it doesn't exist
        let defaultSeller = await Seller.findOne({ phone: '+910000000000' });
        if (!defaultSeller) {
            defaultSeller = await Seller.create({
                shopName: 'Rohini Main Store',
                ownerName: 'Admin',
                phone: '+910000000000',
                password: 'adminpassword123',
                shopAddress: 'Headquarters, India',
                location: {
                    type: 'Point',
                    coordinates: [79.4192, 13.6288] // Tirupati default coords
                },
                status: 'Approved',
                rating: 5,
                numReviews: 100,
                bannerImage: '/images/default_shop_banner.jpg',
                description: 'The original official store.'
            });
            console.log('Created Default Seller:', defaultSeller._id);
        } else {
            console.log('Default Seller already exists:', defaultSeller._id);
        }

        // Migrate Products
        const productResult = await Product.updateMany(
            { seller: { $exists: false } },
            { $set: { seller: defaultSeller._id } }
        );
        console.log(`Migrated ${productResult.modifiedCount} products.`);

        // Migrate Orders
        const orderResult = await Order.updateMany(
            { seller: { $exists: false } },
            { $set: { seller: defaultSeller._id } }
        );
        console.log(`Migrated ${orderResult.modifiedCount} orders.`);

        console.log('Migration Complete!');
        process.exit(0);

    } catch (error) {
        console.error('Migration Failed:', error);
        process.exit(1);
    }
}

migrateData();
