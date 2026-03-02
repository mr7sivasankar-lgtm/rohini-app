import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const updateAdminRole = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        // Define minimal User schema
        const userSchema = new mongoose.Schema({}, { strict: false });
        const User = mongoose.models.User || mongoose.model('User', userSchema);

        const adminPhone = process.env.ADMIN_PHONE || '+919999999999';

        console.log(`Looking for user with phone: ${adminPhone}`);

        // Find the user
        const user = await User.findOne({ phone: adminPhone });

        if (user) {
            console.log(`Found user: ${user._id}, Current Role: ${user.role}`);

            // Update role to admin
            const result = await User.updateOne(
                { _id: user._id },
                { $set: { role: 'admin', isVerified: true } }
            );

            console.log(`✅ Updated user role to 'admin'. Modified count: ${result.modifiedCount}`);
        } else {
            console.log('❌ User not found. Creating new admin user...');
            await User.create({
                phone: adminPhone,
                name: 'Admin',
                role: 'admin',
                isVerified: true
            });
            console.log('✅ Created new admin user');
        }

        console.log('🎉 Admin setup completed!');
        process.exit(0);
    } catch (error) {
        console.error('Error updating admin role:', error);
        process.exit(1);
    }
};

updateAdminRole();
