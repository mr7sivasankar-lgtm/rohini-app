import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

const run = async () => {
    await mongoose.connect(process.env.MONGODB_URI);
    const Seller = (await import('./models/Seller.js')).default;
    const Product = (await import('./models/Product.js')).default;

    const shop = await Seller.findOne({ shopName: 'Ganesh shop' }).lean();
    console.log('Shop Name:', shop.shopName);
    console.log('Shop Location (lng, lat):', shop.location?.coordinates);

    if (shop.location?.coordinates) {
        const [lng, lat] = shop.location.coordinates;
        const testUrl = `https://rohini-backend-kt1g.onrender.com/api/sellers/nearby?lat=${lat}&lng=${lng}`;
        console.log('\nTest URL with correct coords:', testUrl);

        const res = await fetch(testUrl);
        const data = await res.json();
        console.log('\nAPI Response (count):', data.data?.length);
        
        if (data.data?.length > 0) {
            const s = data.data[0];
            console.log('startingPrice:', s.startingPrice);
            console.log('startingCategory:', s.startingCategory);
        }
    }

    process.exit(0);
};
run();
