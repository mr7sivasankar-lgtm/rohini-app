import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Categories.css';

const Categories = () => {
    const navigate = useNavigate();
    const [activeGender, setActiveGender] = useState('Female');
    const [expandedCategory, setExpandedCategory] = useState('Clothing');

    const categoryData = {
        Female: {
            Clothing: {
                icon: '👗',
                gradient: 'linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%)',
                subcategories: ['Dresses', 'Pants', 'Skirts', 'Shorts', 'Jackets', 'Hoodies', 'Shirts', 'Polo', 'T-Shirts', 'Tunics']
            },
            'Ethnic Wear': {
                icon: '🥻',
                gradient: 'linear-gradient(135deg, #a18cd1 0%, #fbc2eb 100%)',
                subcategories: ['Sarees', 'Salwar Kameez', 'Lehengas & Ghagras', 'Ethnic Tops', 'Kurtis & Tunics', 'Dupattas & Stoles', 'Blouses & Cholis', 'Ethnic Jackets']
            },
            'Lingerie & Bras': {
                icon: '👙',
                gradient: 'linear-gradient(135deg, #fbc2eb 0%, #a6c1ee 100%)',
                subcategories: ['Bras', 'Night Suits', 'Nightdress', 'Lounge Pants', 'Shapewear']
            }
        },
        Male: {
            'Casual Wear': {
                icon: '👕',
                gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                subcategories: ['Shirts', 'T-Shirts', 'Jeans', 'Trousers', 'Shorts', 'Track Pants', 'Jackets', 'Sweatshirts', 'Sweaters', 'Hoodies']
            },
            'Formal Wear': {
                icon: '👔',
                gradient: 'linear-gradient(135deg, #0c3483 0%, #a2b6df 100%)',
                subcategories: ['Formal Shirts', 'Formal Trousers', 'Coats', 'Blazers']
            },
            'Traditional Wear': {
                icon: '🧥',
                gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                subcategories: ['Kurtas & Sets', 'Nehru Jackets', 'Sherwani', 'Kurta Sets', 'Ethnic Pajamas', 'Dhoti Pants', 'Jodhpuri Suits']
            },
            'Sports Wear': {
                icon: '🏃‍♂️',
                gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
                subcategories: ['T-Shirts', 'Track Pants', 'Jackets', 'Shorts', 'Sweatshirts', 'Tracksuits']
            }
        },
        Kids: {
            Boys: {
                icon: '👦',
                gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
                subcategories: ['T-Shirts & Shirts', 'Jeans & Trousers', 'Dresses & Skirts', 'Jackets & Hoodies', 'Night Suits', 'Lehenga Choli']
            },
            Girls: {
                icon: '👧',
                gradient: 'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
                subcategories: ['T-Shirts & Shirts', 'Jeans & Trousers', 'Dresses & Skirts', 'Jackets & Hoodies', 'Night Suits', 'Lehenga Choli']
            },
            'Age Group': {
                icon: '🎂',
                gradient: 'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)',
                subcategories: ['0-1 Year (Newborn)', '1-2 Years', '2-3 Years', '3-5 Years', '5-7 Years', '7-9 Years', '9-12 Years', '12-15 Years (Teen)']
            }
        }
    };

    const genderMeta = {
        Female: { label: "Women", emoji: "👩", color: "#ec4899" },
        Male: { label: "Men", emoji: "👨", color: "#3b82f6" },
        Kids: { label: "Kids", emoji: "👶", color: "#f59e0b" }
    };

    const toggleCategory = (category) => {
        setExpandedCategory(expandedCategory === category ? null : category);
    };

    return (
        <div className="categories-page">
            {/* Header */}
            <div className="categories-header">
                <button className="cat-back-btn" onClick={() => navigate(-1)}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M19 12H5M12 19l-7-7 7-7" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
                <h1>Explore</h1>
                <button className="cat-close-btn" onClick={() => navigate('/home')}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>

            {/* Gender Tabs */}
            <div className="gender-tabs">
                {Object.entries(genderMeta).map(([key, meta]) => (
                    <button
                        key={key}
                        className={`gender-tab ${activeGender === key ? 'active' : ''}`}
                        onClick={() => { setActiveGender(key); setExpandedCategory(null); }}
                        style={activeGender === key ? { '--tab-color': meta.color } : {}}
                    >
                        <span className="tab-emoji">{meta.emoji}</span>
                        <span className="tab-label">{meta.label}</span>
                    </button>
                ))}
            </div>

            {/* Categories List */}
            <div className="categories-list">
                {Object.entries(categoryData[activeGender]).map(([categoryName, categoryInfo], index) => (
                    <div
                        key={categoryName}
                        className={`category-group ${expandedCategory === categoryName ? 'expanded' : ''}`}
                        style={{ animationDelay: `${index * 0.08}s` }}
                    >
                        <button
                            className="category-header"
                            onClick={() => toggleCategory(categoryName)}
                        >
                            <div className="category-icon-wrap" style={{ background: categoryInfo.gradient }}>
                                <span className="category-icon">{categoryInfo.icon}</span>
                            </div>
                            <div className="category-meta">
                                <span className="category-name">{categoryName}</span>
                                <span className="category-count">{categoryInfo.subcategories.length} items</span>
                            </div>
                            <div className={`chevron-wrap ${expandedCategory === categoryName ? 'expanded' : ''}`}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <path d="m6 9 6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                            </div>
                        </button>

                        {expandedCategory === categoryName && (
                            <div className="subcategories-grid">
                                {categoryInfo.subcategories.map((subcat, i) => (
                                    <button
                                        key={subcat}
                                        className="subcategory-chip"
                                        onClick={() => navigate(`/search?q=${encodeURIComponent(subcat)}`)}
                                        style={{ animationDelay: `${i * 0.04}s` }}
                                    >
                                        <span className="chip-text">{subcat}</span>
                                        <svg className="chip-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                            <path d="M9 18l6-6-6-6" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Categories;
