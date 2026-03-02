import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const fixCategoryIndex = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        const db = mongoose.connection.db;
        const collection = db.collection('categories');

        // List existing indexes
        const indexes = await collection.indexes();
        console.log('\nExisting indexes:');
        indexes.forEach(idx => console.log(' -', JSON.stringify(idx.key), idx.unique ? '(unique)' : ''));

        // Drop the unique name index if it exists
        const nameIdx = indexes.find(i => i.key && i.key.name === 1 && i.unique);
        if (nameIdx) {
            await collection.dropIndex(nameIdx.name);
            console.log(`\n✅ Dropped unique name index: ${nameIdx.name}`);
        } else {
            console.log('\nℹ️  No standalone unique name index found, checking for name_1...');
            try {
                await collection.dropIndex('name_1');
                console.log('✅ Dropped index name_1');
            } catch (e) {
                console.log('  (name_1 not found or already gone)');
            }
        }

        // Optionally create a compound unique index: name + parentCategory
        await collection.createIndex(
            { name: 1, parentCategory: 1 },
            { unique: true, name: 'name_parentCategory_unique' }
        );
        console.log('✅ Created compound unique index: name + parentCategory');

        await mongoose.connection.close();
        console.log('\n✅ Done. Run seedKidsCategories.js now.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
};

fixCategoryIndex();
