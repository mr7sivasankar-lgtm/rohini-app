import mongoose from 'mongoose';
import Order from './models/Order.js';
import dotenv from 'dotenv';
dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mr7sivasankar:lgtmbysiva7@cluster0.zox4j.mongodb.net/instant-delivery').then(async () => {
    console.log("Connected to MongoDB.");
    try {
        const order = await Order.findOne({ orderId: 'ORD177330369581890001' }); // From user's screenshot
        if (!order) {
            console.log("Order not found!");
            process.exit(0);
        }
        
        console.log("Order found. Checking items...");
        const item = order.items.find(i => i.status === 'Return Requested');
        if (item) {
            console.log(`Found item requested for return. Attempting to set to Return Rejected...`);
            item.status = 'Return Rejected';
            await order.save();
            console.log("Save successful!");
        } else {
            console.log("No item found with Return Requested status.");
        }
    } catch (err) {
        console.error("Error during save:", err);
    }
    process.exit(0);
}).catch(console.error);
