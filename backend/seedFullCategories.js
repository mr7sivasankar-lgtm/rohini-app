import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const seedFullCategories = async () => {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('✅ MongoDB Connected');

        // Define Category Schema
        const categorySchema = new mongoose.Schema({
            name: {
                type: String,
                required: [true, 'Please add a category name'],
                unique: true,
                trim: true,
                maxlength: [50, 'Name can not be more than 50 characters']
            },
            image: { type: String, default: 'no-photo.jpg' },
            description: String,
            gender: {
                type: String,
                enum: ['Male', 'Female', 'Kids', 'Unisex'],
                default: 'Unisex'
            },
            parentCategory: {
                type: mongoose.Schema.ObjectId,
                ref: 'Category',
                default: null
            },
            isActive: { type: Boolean, default: true },
            createdAt: { type: Date, default: Date.now }
        });

        // Check if model exists to avoid recompilation error
        const Category = mongoose.models.Category || mongoose.model('Category', categorySchema);

        // Clear existing categories
        await Category.deleteMany({});
        console.log('🗑️ Cleared existing categories');

        // --- Data Structure ---
        const data = {
            "Women's Wear": {
                gender: 'Female',
                image: '/uploads/categories/women.jpg',
                subcategories: {
                    'Clothing': [
                        'Dresses', 'Pants', 'Skirts', 'Shorts', 'Jackets',
                        'Hoodies', 'Shirts', 'Polo', 'T-Shirts', 'Tunics'
                    ],
                    'Ethnic Wear': [
                        'Sarees', 'Salwar Kameez', 'Lehengas & Ghagras', 'Ethnic Tops',
                        'Kurtis & Tunics', 'Dupattas & Stoles', 'Blouses & Cholis', 'Ethnic Jackets'
                    ],
                    'Lingerie & Bras': [
                        'Bras', 'Night Suits', 'Nightdress', 'Lounge Pants', 'Shapewear'
                    ]
                }
            },
            "Men's Wear": {
                gender: 'Male',
                image: '/uploads/categories/men.jpg',
                subcategories: {
                    'Casual Wear': [
                        'Shirts', 'T-Shirts', 'Jeans', 'Trousers', 'Shorts',
                        'Track Pants', 'Jackets', 'Sweatshirts', 'Sweaters', 'Hoodies'
                    ],
                    'Formal Wear': [
                        'Formal Shirts', 'Formal Trousers', 'Coats', 'Blazers'
                    ],
                    'Traditional Wear': [
                        'Kurtas & Sets', 'Nehru Jackets', 'Sherwani', 'Kurta Sets',
                        'Ethnic Pajamas', 'Dhoti Pants', 'Jodhpuri Suits'
                    ],
                    'Sports Wear': [
                        'T-Shirts', 'Track Pants', 'Jackets', 'Shorts', 'Sweatshirts', 'Tracksuits'
                    ]
                }
            },
            "Kids": {
                gender: 'Kids',
                image: '/uploads/categories/kids.jpg',
                subcategories: {
                    'Clothing': [
                        'T-Shirts', 'Dresses', 'Pants', 'Shorts', 'Jackets', 'Hoodies', 'Skirts', 'Rompers'
                    ]
                }
            }
        };

        // --- Seeding Logic ---
        for (const [mainCatName, mainCatData] of Object.entries(data)) {
            // 1. Create Main Category (e.g., Women's Wear)
            const mainCat = await Category.create({
                name: mainCatName,
                gender: mainCatData.gender,
                image: mainCatData.image
            });
            console.log(`✅ Created Main: ${mainCatName}`);

            for (const [parentName, subList] of Object.entries(mainCatData.subcategories)) {
                // 2. Create Parent Category (e.g., Clothing, Ethnic Wear)
                // Use a composite name to avoid duplicate key error if "Clothing" appears in multiple places

                let dbParentName = parentName;
                if (parentName === 'Clothing') {
                    dbParentName = `${mainCatName} - ${parentName}`;
                }

                const parentCat = await Category.create({
                    name: dbParentName,
                    gender: mainCatData.gender,
                    parentCategory: mainCat._id
                });
                console.log(`  👉 Created Parent: ${dbParentName}`);

                // 3. Create Subcategories (e.g., Dresses)
                for (const subName of subList) {
                    // Use parent category to ensure uniqueness
                    // e.g. "T-Shirts (Casual Wear)" vs "T-Shirts (Sports Wear)"
                    const dbSubName = `${subName} (${dbParentName})`;

                    await Category.create({
                        name: dbSubName,
                        gender: mainCatData.gender,
                        parentCategory: parentCat._id
                    });
                }
                console.log(`    Created ${subList.length} subcategories`);
            }
        }

        console.log('🎉 Full category tree seeded successfully!');
        process.exit(0);
    } catch (error) {
        console.error('Error seeding categories:', error);
        process.exit(1);
    }
};

seedFullCategories();
