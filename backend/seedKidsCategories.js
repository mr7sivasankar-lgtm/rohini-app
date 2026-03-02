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

const seedKidsCategories = async () => {
    try {
        console.log('🌱 Starting Kids Wear categories seed...\n');

        // ── Step 1: Find or create "Kids Wear" main category ──────────────
        let kidsMain = await Category.findOne({
            $or: [
                { name: 'Kids Wear', parentCategory: null },
                { name: 'Kids', parentCategory: null },
                { name: 'Clothing', gender: 'Kids', parentCategory: null }
            ]
        });

        if (kidsMain) {
            kidsMain.name = 'Kids Wear';
            kidsMain.gender = 'Kids';
            await kidsMain.save();
            console.log(`✅ Using main category: "${kidsMain.name}" (id: ${kidsMain._id})`);
        } else {
            kidsMain = await Category.create({
                name: 'Kids Wear',
                gender: 'Kids',
                icon: '👦',
                order: 3,
                isActive: true
            });
            console.log('✅ Created main category "Kids Wear"');
        }

        // ── Step 2: Parent categories — Boys & Girls ────────────────────
        const parentDefs = [
            { name: 'Boys', order: 1, icon: '👦' },
            { name: 'Girls', order: 2, icon: '👧' },
        ];

        const parents = {};

        for (const pd of parentDefs) {
            let cat = await Category.findOne({ name: pd.name, parentCategory: kidsMain._id });
            if (!cat) {
                cat = await Category.create({
                    name: pd.name,
                    gender: 'Kids',
                    icon: pd.icon,
                    parentCategory: kidsMain._id,
                    order: pd.order,
                    isActive: true
                });
                console.log(`✅ Created parent: ${pd.name}`);
            } else {
                cat.order = pd.order;
                cat.icon = pd.icon;
                await cat.save();
                console.log(`✅ Found/updated parent: ${pd.name}`);
            }
            parents[pd.name] = cat._id;
        }

        // ── Step 3: Subcategories for both Boys and Girls ───────────────
        const subDefs = [
            { name: 'T-Shirts & Shirts', order: 1 },
            { name: 'Jeans & Trousers', order: 2 },
            { name: 'Dresses & Skirts', order: 3 },
            { name: 'Jackets & Hoodies', order: 4 },
            { name: 'Night Suits', order: 5 },
            { name: 'Lehenga Choli', order: 6 },
        ];

        let created = 0, updated = 0;

        for (const parentName of ['Boys', 'Girls']) {
            const parentId = parents[parentName];
            for (const sub of subDefs) {
                let cat = await Category.findOne({ name: sub.name, parentCategory: parentId });
                if (!cat) {
                    await Category.create({
                        name: sub.name,
                        gender: 'Kids',
                        parentCategory: parentId,
                        order: sub.order,
                        isActive: true
                    });
                    created++;
                    console.log(`  ✅ Created [${parentName}] → ${sub.name}`);
                } else {
                    cat.order = sub.order;
                    await cat.save();
                    updated++;
                }
            }
        }

        // ── Step 4: Age Groups as subcategories under Kids Wear ─────────
        // These appear as filter options; stored as a separate "Age Group" parent
        let ageGroupParent = await Category.findOne({ name: 'Age Group', parentCategory: kidsMain._id });
        if (!ageGroupParent) {
            ageGroupParent = await Category.create({
                name: 'Age Group',
                gender: 'Kids',
                icon: '🎂',
                parentCategory: kidsMain._id,
                order: 3,
                isActive: true
            });
            console.log('✅ Created parent: Age Group');
        }

        const ageGroups = [
            { name: '0-1 Year (Newborn)', order: 1 },
            { name: '1-2 Years', order: 2 },
            { name: '2-3 Years', order: 3 },
            { name: '3-5 Years', order: 4 },
            { name: '5-7 Years', order: 5 },
            { name: '7-9 Years', order: 6 },
            { name: '9-12 Years', order: 7 },
            { name: '12-15 Years (Teen)', order: 8 },
        ];

        for (const ag of ageGroups) {
            let cat = await Category.findOne({ name: ag.name, parentCategory: ageGroupParent._id });
            if (!cat) {
                await Category.create({
                    name: ag.name,
                    gender: 'Kids',
                    parentCategory: ageGroupParent._id,
                    order: ag.order,
                    isActive: true
                });
                created++;
                console.log(`  ✅ Created [Age Group] → ${ag.name}`);
            } else {
                cat.order = ag.order;
                await cat.save();
                updated++;
            }
        }

        console.log(`\n✅ Created ${created} new categories`);
        console.log(`✅ Updated ${updated} existing categories`);
        console.log('\n🎉 Kids Wear categories seeded successfully!\n');

        const total = await Category.countDocuments({ gender: 'Kids', isActive: true });
        console.log(`📊 Total Kids categories in database: ${total}\n`);

    } catch (error) {
        console.error('❌ Error seeding Kids categories:', error);
        throw error;
    }
};

const run = async () => {
    await connectDB();
    await seedKidsCategories();
    await mongoose.connection.close();
    console.log('✅ Database connection closed');
    process.exit(0);
};

run();
