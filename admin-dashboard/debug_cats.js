import axios from 'axios';

async function checkCategories() {
    try {
        const response = await axios.get('http://localhost:5000/api/categories');
        const categories = response.data.data;

        console.log('Total Categories:', categories.length);

        const roots = categories.filter(c => !c.parentCategory);
        console.log('Roots:', roots.map(c => ({ name: c.name, gender: c.gender, id: c._id })));

        const females = categories.filter(c => c.gender === 'Female');
        console.log('Females Total:', females.length);

        // Check structure of parentCategory
        const sampleChild = categories.find(c => c.parentCategory);
        if (sampleChild) {
            console.log('Sample Child Parent Field:', JSON.stringify(sampleChild.parentCategory, null, 2));
        } else {
            console.log('No children found?');
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

checkCategories();
