import mongoose from 'mongoose';
import Order from './models/Order.js';
import Product from './models/Product.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mr7sivasankar:lgtmbysiva7@cluster0.zox4j.mongodb.net/instant-delivery').then(async () => {
    console.log("Connected to MongoDB.");
    const order = await Order.findOne({ orderId: 'ORD17733028954640004' });
    console.log("Order Status History:", order.statusHistory);
    console.log("Current order items:", order.items.map(i => ({name: i.name, product: i.product, product_id: i.product?._id})));
    process.exit(0);
}).catch(console.error);
