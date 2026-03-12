import mongoose from 'mongoose';
import Order from './models/Order.js';
import Product from './models/Product.js';
import dotenv from 'dotenv';

dotenv.config();

mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://mr7sivasankar:lgtmbysiva7@cluster0.zox4j.mongodb.net/instant-delivery').then(async () => {
  console.log("Connected to MongoDB.");
  const order = await Order.findOne().sort({createdAt: -1});
  console.log("Latest Order ID:", order.orderId, "| Status:", order.status);
  
  for (const item of order.items) {
      console.log(`- Item Name: ${item.name}`);
      console.log(`  Target Product ID: ${item.product}`);
      const product = await Product.findById(item.product);
      if (product) {
          console.log(`  Found Product! Database Stock is: ${product.stock}`);
      } else {
          console.log(`  Product not found in DB!`);
      }
  }
  process.exit(0);
}).catch(e => {
  console.error(e);
  process.exit(1);
});
