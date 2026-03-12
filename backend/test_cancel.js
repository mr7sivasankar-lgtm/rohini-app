import mongoose from 'mongoose';
import Order from './models/Order.js';
import Product from './models/Product.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mr7sivasankar:lgtmbysiva7@cluster0.zox4j.mongodb.net/instant-delivery').then(async () => {
    console.log("Connected to MongoDB.");
    const order = await Order.findOne({ orderId: 'ORD17732990262180003' });
    console.log("Current status:", order.status);
    
    // Simulate un-cancelling
    order.status = 'Placed';
    await order.save();
    console.log("Order set to Placed.");
    
    // Now simulate cancelling
    const status = 'Cancelled';
    
    if (status === 'Cancelled' && order.status !== 'Cancelled') {
        console.log(`[Order Cancel] Refunding stock for order ID ${order._id}`);
        for (const item of order.items) {
            const productId = item.product?._id || item.product;
            console.log(`[Order Cancel] Checking item: ${item.name}, item.product: ${productId}`);
            if (!productId) continue;
            
            const product = await Product.findById(productId);
            if (product) {
                console.log(`[Order Cancel] Found product ${product.name}. Old stock: ${product.stock}. Refunding +${item.quantity}`);
                product.stock += item.quantity;
                await product.save();
                console.log(`[Order Cancel] New stock saved: ${product.stock}`);
            } else {
                console.log(`[Order Cancel] Failed to find Product ID: ${productId} in database!`);
            }
        }
    }
    
    order.status = status;
    await order.save();
    console.log("Done.");
    process.exit(0);
}).catch(console.error);
