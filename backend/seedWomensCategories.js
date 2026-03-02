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

const seedWomensCategories = async () => {
    try {
        console.log('🌱 Starting Women\'s Wear categories seed...\n');

        // Step 1: Update "Female" to "Women's Wear" or create if doesn't exist
        let mainCategory = await Category.findOne({ name: 'Female', parentCategory: null });

        if (mainCategory) {
            mainCategory.name = "Women's Wear";
            await mainCategory.save();
            console.log('✅ Updated main category to "Women\'s Wear"');
        } else {
            mainCategory = await Category.create({
                name: "Women's Wear",
                gender: 'Female',
                order: 1,
                isActive: true
            });
            console.log('✅ Created main category "Women\'s Wear"');
        }

        // Step 2: Create/Update the 4 main parent categories
        const parentCategories = [
            { name: "Women's Western Wear", order: 1 },
            { name: "Indian & Ethnic Wear", order: 2 },
            { name: "Lingerie & Bras", order: 3 },
            { name: "Sportswear", order: 4 }
        ];

        const createdParents = {};

        for (const parentCat of parentCategories) {
            let category = await Category.findOne({
                name: parentCat.name,
                parentCategory: mainCategory._id
            });

            if (!category) {
                category = await Category.create({
                    name: parentCat.name,
                    gender: 'Female',
                    parentCategory: mainCategory._id,
                    order: parentCat.order,
                    isActive: true
                });
                console.log(`✅ Created parent category: ${parentCat.name}`);
            } else {
                category.order = parentCat.order;
                await category.save();
                console.log(`✅ Updated parent category: ${parentCat.name}`);
            }

            createdParents[parentCat.name] = category._id;
        }

        // Step 3: Create all subcategories
        const subcategories = [
            // Women's Western Wear (14 items)
            { name: "Tops", parent: "Women's Western Wear", order: 1 },
            { name: "T-Shirts", parent: "Women's Western Wear", order: 2 },
            { name: "Shirts", parent: "Women's Western Wear", order: 3 },
            { name: "Dresses", parent: "Women's Western Wear", order: 4 },
            { name: "Skirts", parent: "Women's Western Wear", order: 5 },
            { name: "Jeans", parent: "Women's Western Wear", order: 6 },
            { name: "Pants & Trousers", parent: "Women's Western Wear", order: 7 },
            { name: "Shorts", parent: "Women's Western Wear", order: 8 },
            { name: "Jumpsuits & Rompers", parent: "Women's Western Wear", order: 9 },
            { name: "Sweaters & Cardigans", parent: "Women's Western Wear", order: 10 },
            { name: "Jackets & Coats", parent: "Women's Western Wear", order: 11 },
            { name: "Leggings", parent: "Women's Western Wear", order: 12 },
            { name: "Sports Bras", parent: "Women's Western Wear", order: 13 },

            // Indian & Ethnic Wear (8 items)
            { name: "Sarees", parent: "Indian & Ethnic Wear", order: 1 },
            { name: "Salwar Kameez", parent: "Indian & Ethnic Wear", order: 2 },
            { name: "Lehengas & Ghagras", parent: "Indian & Ethnic Wear", order: 3 },
            { name: "Ethnic Tops", parent: "Indian & Ethnic Wear", order: 4 },
            { name: "Kurtis & Tunics", parent: "Indian & Ethnic Wear", order: 5 },
            { name: "Dupattas & Stoles", parent: "Indian & Ethnic Wear", order: 6 },
            { name: "Blouses & Cholis", parent: "Indian & Ethnic Wear", order: 7 },
            { name: "Ethnic Jackets", parent: "Indian & Ethnic Wear", order: 8 },

            // Lingerie & Bras (5 items)
            { name: "Bras", parent: "Lingerie & Bras", order: 1 },
            { name: "Night Suits", parent: "Lingerie & Bras", order: 2 },
            { name: "Nightdress", parent: "Lingerie & Bras", order: 3 },
            { name: "Lounge Pants", parent: "Lingerie & Bras", order: 4 },
            { name: "Shapewear", parent: "Lingerie & Bras", order: 5 },

            // Sportswear (6 items)
            { name: "T-Shirts", parent: "Sportswear", order: 1 },
            { name: "Track Pants", parent: "Sportswear", order: 2 },
            { name: "Jackets", parent: "Sportswear", order: 3 },
            { name: "Shorts", parent: "Sportswear", order: 4 },
            { name: "Sweatshirts", parent: "Sportswear", order: 5 },
            { name: "Tracksuits", parent: "Sportswear", order: 6 }
        ];

        let createdCount = 0;
        let updatedCount = 0;

        for (const subCat of subcategories) {
            const parentId = createdParents[subCat.parent];

            let category = await Category.findOne({
                name: subCat.name,
                parentCategory: parentId
            });

            if (!category) {
                await Category.create({
                    name: subCat.name,
                    gender: 'Female',
                    parentCategory: parentId,
                    order: subCat.order,
                    isActive: true
                });
                createdCount++;
            } else {
                category.order = subCat.order;
                await category.save();
                updatedCount++;
            }
        }

        console.log(`\n✅ Created ${createdCount} new subcategories`);
        console.log(`✅ Updated ${updatedCount} existing subcategories`);
        console.log('\n🎉 Women\'s Wear categories seed completed successfully!\n');

        // Display summary
        const totalCategories = await Category.countDocuments({
            gender: 'Female',
            isActive: true
        });
        console.log(`📊 Total Women's Wear categories in database: ${totalCategories}\n`);

    } catch (error) {
        console.error('❌ Error seeding categories:', error);
        throw error;
    }
};

const run = async () => {
    await connectDB();
    await seedWomensCategories();
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
};

run();
