import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../utils/api';

const ProductForm = ({ product, categories, onClose, onSave }) => {
    // Basic Info
    const [formData, setFormData] = useState({
        name: '',
        productCode: '',
        brand: '',
        gender: '',
        category: '', // This will hold the "Parent" category ID (e.g. Clothing)
        subcategory: [], // Array of "Leaf" category IDs (e.g. Dresses, Kurtis)
        description: '',
        price: '',
        originalPrice: '',
        stock: '',

        // Arrays
        sizes: [],
        colors: [], // Array for multi-color tag picker

        // Details
        fabric: '',
        fit: '',
        pattern: '',
        sleeve: '',
        neck: '',

        // Delivery
        deliveryTime: '3-5 Days',
        returnPolicy: 'No Returns',

        // Toggles
        featured: false,
        trending: false,
        newArrival: false,
        bestSeller: false,

        isActive: true, // Default active
        images: []
    });

    const [files, setFiles] = useState([]); // New image files
    const [removedImages, setRemovedImages] = useState([]); // Track removed existing images
    const [loading, setLoading] = useState(false);
    const [colorInput, setColorInput] = useState(''); // For the tag-style color picker

    // Category Logic States
    const [genderOptions] = useState(['Male', 'Female', 'Kids', 'Unisex']);
    // Filtered lists
    const [parentCategories, setParentCategories] = useState([]); // Top-level categories
    const [subCategories, setSubCategories] = useState([]); // Children of selected category

    const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
    const kidsSizes = [
        '0-1 Year (Newborn)',
        '1-2 Years',
        '2-3 Years',
        '3-5 Years',
        '5-7 Years',
        '7-9 Years',
        '9-12 Years',
        '12-15 Years (Teen)'
    ];
    // For Kids we show BOTH age groups and standard clothing sizes
    const isKids = formData.gender === 'Kids';

    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                productCode: product.productCode || '',
                brand: product.brand || '',
                gender: product.gender || '',
                category: product.category?._id || product.category || '',
                subcategory: Array.isArray(product.subcategory)
                    ? product.subcategory.map(s => s._id || s)
                    : (product.subcategory ? [product.subcategory._id || product.subcategory] : []),
                description: product.description || '',
                price: product.price || '',
                originalPrice: product.originalPrice || '',
                stock: product.stock || '',
                sizes: product.sizes || [],
                colors: product.colors || [], // Now array directly
                fabric: product.fabric || '',
                fit: product.fit || '',
                pattern: product.pattern || '',
                sleeve: product.sleeve || '',
                neck: product.neck || '',
                deliveryTime: product.deliveryTime || '3-5 Days',
                returnPolicy: product.returnPolicy || 'No Returns',
                featured: product.featured || false,
                trending: product.trending || false,
                newArrival: product.newArrival || false,
                bestSeller: product.bestSeller || false,
                isActive: product.isActive !== undefined ? product.isActive : true,
                images: product.images || []
            });
        }
    }, [product]);

    // Filter categories by selected gender
    useEffect(() => {
        if (!formData.gender) {
            setParentCategories([]);
            return;
        }

        // Map form gender values to category gender values
        const genderMap = {
            'Male': 'Male',
            'Female': 'Female',
            'Kids': 'Kids',
            'Unisex': null // Show all for Unisex
        };

        const mappedGender = genderMap[formData.gender];

        // Find root categories matching this gender (e.g., "Women's Wear", "Men's Wear", "Kids")
        let rootCats;
        if (mappedGender === null) {
            // Unisex: show all root categories
            rootCats = categories.filter(c => !c.parentCategory);
        } else {
            rootCats = categories.filter(c => !c.parentCategory && c.gender === mappedGender);
        }

        const rootIds = rootCats.map(r => r._id);

        // Find mid-level categories (children of root) — these are the main categories
        // e.g., "Casual Wear", "Formal Wear", "Kids - Clothing"
        // For Kids: show only Boys/Girls (not Age Group) in Category dropdown
        const parents = categories.filter(c =>
            c.parentCategory &&
            rootIds.includes(c.parentCategory._id || c.parentCategory) &&
            c.name !== 'Age Group'
        );

        setParentCategories(parents);

        // Reset category, subcategory & sizes when gender changes
        setFormData(prev => ({ ...prev, category: '', subcategory: [], sizes: [], colors: [] }));
        setColorInput('');
    }, [formData.gender, categories]);

    // Filter subcategories based on selected category
    useEffect(() => {
        if (!formData.category) {
            setSubCategories([]);
            return;
        }
        // Find leaf-level categories (children of selected parent category)
        const subs = categories.filter(c =>
            c.parentCategory &&
            (c.parentCategory._id === formData.category || c.parentCategory === formData.category)
        );
        setSubCategories(subs);

        // Reset subcategory when category changes
        setFormData(prev => ({ ...prev, subcategory: [] }));
    }, [formData.category, categories]);


    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleSizeChange = (size) => {
        setFormData(prev => {
            const newSizes = prev.sizes.includes(size)
                ? prev.sizes.filter(s => s !== size)
                : [...prev.sizes, size];
            return { ...prev, sizes: newSizes };
        });
    };

    // Color tag handlers
    const handleColorKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            const val = colorInput.trim().replace(/,$/, '');
            if (val && !formData.colors.includes(val)) {
                setFormData(prev => ({ ...prev, colors: [...prev.colors, val] }));
            }
            setColorInput('');
        } else if (e.key === 'Backspace' && !colorInput && formData.colors.length > 0) {
            setFormData(prev => ({ ...prev, colors: prev.colors.slice(0, -1) }));
        }
    };

    const removeColor = (color) => {
        setFormData(prev => ({ ...prev, colors: prev.colors.filter(c => c !== color) }));
    };

    const handleFileChange = (e) => {
        const newFiles = Array.from(e.target.files);
        setFiles(prev => [...prev, ...newFiles]);
        e.target.value = ''; // Reset so same file can be re-added
    };

    const removeExistingImage = (imgPath) => {
        setRemovedImages(prev => [...prev, imgPath]);
        setFormData(prev => ({
            ...prev,
            images: prev.images.filter(img => img !== imgPath)
        }));
    };

    const removeNewFile = (index) => {
        setFiles(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const data = new FormData();

            const productPayload = {
                ...formData,
                colors: formData.colors, // Already an array
                category: formData.category,
                subcategory: formData.subcategory.length > 0 ? formData.subcategory : [],
                removedImages: removedImages
            };

            data.append('data', JSON.stringify(productPayload));

            files.forEach(file => {
                data.append('images', file);
            });

            let response;
            if (product) {
                response = await api.put(`/products/${product._id}`, data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            } else {
                response = await api.post('/products', data, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
            }

            if (response.data.success) {
                onSave();
                onClose();
            }
        } catch (error) {
            console.error('Save error:', error);
            alert('Failed to save product: ' + (error.response?.data?.message || error.message));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                    <h2>{product ? 'Edit Product' : 'Add New Product'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer' }}>✖</button>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* 1. Basic Information */}
                    <div className="section">
                        <h3>Basic Information</h3>
                        <div className="form-group">
                            <label>Product Title *</label>
                            <input name="name" value={formData.name} onChange={handleChange} required className="input" placeholder="e.g. Cotton T-Shirt" />
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>Product Code / SKU</label>
                                <input name="productCode" value={formData.productCode} onChange={handleChange} className="input" placeholder="e.g. TSHIRT-001" />
                            </div>
                            <div className="form-group">
                                <label>Brand Name</label>
                                <input name="brand" value={formData.brand} onChange={handleChange} className="input" placeholder="e.g. Nike, ZARA" />
                            </div>
                            <div className="form-group" style={{ maxWidth: '200px' }}>
                                <label>Gender *</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} required className="input">
                                    <option value="">Select Gender</option>
                                    {genderOptions.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>

                        <div className="form-row">
                            <div className="form-group">
                                <label>{isKids ? 'Section (Boys / Girls) *' : 'Category *'}</label>
                                <select name="category" value={formData.category} onChange={handleChange} required className="input" disabled={!formData.gender}>
                                    <option value="">{isKids ? 'Select Section' : 'Select Category'}</option>
                                    {parentCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Subcategories</label>
                                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '8px 0' }}>
                                    {!formData.category ? (
                                        <span style={{ color: '#9ca3af', fontSize: 14 }}>Select a category first</span>
                                    ) : subCategories.length === 0 ? (
                                        <span style={{ color: '#9ca3af', fontSize: 14 }}>No subcategories available</span>
                                    ) : (
                                        subCategories.map(c => (
                                            <label key={c._id} style={{
                                                display: 'flex', alignItems: 'center', gap: 5,
                                                padding: '5px 12px',
                                                background: formData.subcategory.includes(c._id) ? '#e0e7ff' : '#f1f5f9',
                                                borderRadius: 6, cursor: 'pointer', fontSize: 13,
                                                border: formData.subcategory.includes(c._id) ? '1px solid #818cf8' : '1px solid transparent',
                                                transition: 'all 0.15s'
                                            }}>
                                                <input
                                                    type="checkbox"
                                                    checked={formData.subcategory.includes(c._id)}
                                                    onChange={() => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            subcategory: prev.subcategory.includes(c._id)
                                                                ? prev.subcategory.filter(id => id !== c._id)
                                                                : [...prev.subcategory, c._id]
                                                        }));
                                                    }}
                                                />
                                                {c.name.split(' (')[0]}
                                            </label>
                                        ))
                                    )}
                                </div>
                                <small style={{ color: '#888', fontSize: 12 }}>Select all subcategories this product belongs to</small>
                            </div>
                        </div>

                        <div className="form-group">
                            <label>Description *</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} required className="input" rows="4"></textarea>
                        </div>
                    </div>

                    {/* Pricing & Stock */}
                    <div className="section">
                        <h3>Pricing & Stock</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>MRP (Original Price)</label>
                                <input type="number" name="originalPrice" value={formData.originalPrice} onChange={handleChange} className="input" />
                            </div>
                            <div className="form-group">
                                <label>Selling Price *</label>
                                <input type="number" name="price" value={formData.price} onChange={handleChange} required className="input" />
                            </div>
                            <div className="form-group">
                                <label>Stock (Qty) *</label>
                                <input type="number" name="stock" value={formData.stock} onChange={handleChange} required className="input" />
                                <small style={{ color: formData.stock > 0 ? 'green' : 'red' }}>
                                    {formData.stock > 0 ? 'In Stock' : 'Out of Stock'}
                                </small>
                            </div>
                        </div>
                    </div>

                    {/* Sizes & Colors */}
                    <div className="section">
                        <h3>Variants</h3>
                        <div className="form-group">
                            {/* Standard clothing sizes — always shown */}
                            <label>Available Sizes</label>
                            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                {standardSizes.map(size => (
                                    <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: formData.sizes.includes(size) ? '#e0e7ff' : '#f1f5f9', borderRadius: 6, cursor: 'pointer' }}>
                                        <input type="checkbox" checked={formData.sizes.includes(size)} onChange={() => handleSizeChange(size)} />
                                        {size}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Age Groups — shown only for Kids products */}
                        {isKids && (
                            <div className="form-group" style={{ marginTop: 12 }}>
                                <label>Age Group</label>
                                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                                    {kidsSizes.map(size => (
                                        <label key={size} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 10px', background: formData.sizes.includes(size) ? '#d1fae5' : '#f1f5f9', borderRadius: 6, cursor: 'pointer' }}>
                                            <input type="checkbox" checked={formData.sizes.includes(size)} onChange={() => handleSizeChange(size)} />
                                            {size}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Multi-color tag picker */}
                        <div className="form-group" style={{ marginTop: 12 }}>
                            <label>Available Colors</label>
                            <div style={{
                                display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center',
                                border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 10px',
                                minHeight: 44, background: '#fff', cursor: 'text'
                            }}
                                onClick={() => document.getElementById('colorTagInput').focus()}
                            >
                                {formData.colors.map(color => (
                                    <span key={color} style={{
                                        display: 'inline-flex', alignItems: 'center', gap: 4,
                                        background: '#e0e7ff', color: '#3730a3',
                                        borderRadius: 999, padding: '3px 10px', fontSize: 13, fontWeight: 600
                                    }}>
                                        {color}
                                        <button type="button" onClick={() => removeColor(color)}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 14, lineHeight: 1, padding: 0 }}
                                        >×</button>
                                    </span>
                                ))}
                                <input
                                    id="colorTagInput"
                                    value={colorInput}
                                    onChange={e => setColorInput(e.target.value)}
                                    onKeyDown={handleColorKeyDown}
                                    placeholder={formData.colors.length === 0 ? 'Type a color, press Enter or comma to add…' : ''}
                                    style={{ border: 'none', outline: 'none', flex: 1, minWidth: 140, fontSize: 14 }}
                                />
                            </div>
                            <small style={{ color: '#888', fontSize: 12 }}>Press Enter or , after each color • Backspace to remove last</small>
                        </div>
                    </div>

                    {/* Fabric Details */}
                    <div className="section">
                        <h3>Fabric & Details</h3>
                        <div className="form-row">
                            <div className="form-group"><label>Fabric</label><input name="fabric" value={formData.fabric} onChange={handleChange} className="input" /></div>
                            <div className="form-group"><label>Fit</label><input name="fit" value={formData.fit} onChange={handleChange} className="input" /></div>
                        </div>
                        <div className="form-row">
                            <div className="form-group"><label>Pattern</label><input name="pattern" value={formData.pattern} onChange={handleChange} className="input" /></div>
                            <div className="form-group"><label>Sleeve</label><input name="sleeve" value={formData.sleeve} onChange={handleChange} className="input" /></div>
                            <div className="form-group"><label>Neck</label><input name="neck" value={formData.neck} onChange={handleChange} className="input" /></div>
                        </div>
                    </div>

                    {/* Images */}
                    <div className="section">
                        <h3>Images *</h3>
                        <div className="image-grid">
                            {/* Existing images */}
                            {formData.images.map((img, i) => (
                                <div key={`existing-${i}`} className="image-grid-item">
                                    <img src={getImageUrl(img)} alt={`Product ${i + 1}`} />
                                    {i === 0 && files.length === 0 && <span className="primary-badge">Primary</span>}
                                    <button type="button" className="remove-img-btn" onClick={() => removeExistingImage(img)} title="Remove image">✕</button>
                                </div>
                            ))}
                            {/* New file previews */}
                            {files.map((file, i) => (
                                <div key={`new-${i}`} className="image-grid-item new-img">
                                    <img src={URL.createObjectURL(file)} alt={`New ${i + 1}`} />
                                    {formData.images.length === 0 && i === 0 && <span className="primary-badge">Primary</span>}
                                    <button type="button" className="remove-img-btn" onClick={() => removeNewFile(i)} title="Remove image">✕</button>
                                    <span className="new-badge">New</span>
                                </div>
                            ))}
                            {/* Add more button */}
                            <label className="image-add-btn">
                                <input type="file" multiple onChange={handleFileChange} accept="image/*" style={{ display: 'none' }} />
                                <span className="add-icon">＋</span>
                                <span className="add-text">Add Images</span>
                            </label>
                        </div>
                        <small style={{ color: '#888', fontSize: 12 }}>Upload up to 10 images (front, back, side views etc.) • First image is the primary image</small>
                    </div>

                    {/* Delivery & Advanced */}
                    <div className="section">
                        <h3>Delivery & Advanced</h3>
                        <div className="form-row">
                            <div className="form-group">
                                <label>Delivery Time</label>
                                <select name="deliveryTime" value={formData.deliveryTime} onChange={handleChange} className="input">
                                    <option value="30 Mins">30 Mins</option>
                                    <option value="1 Hour">1 Hour</option>
                                    <option value="2 Hours">2 Hours</option>
                                    <option value="Same Day">Same Day</option>
                                    <option value="Next Day">Next Day</option>
                                    <option value="2-3 Days">2-3 Days</option>
                                    <option value="3-5 Days">3-5 Days</option>
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Return Policy</label>
                                <select name="returnPolicy" value={formData.returnPolicy} onChange={handleChange} className="input">
                                    <option value="No Returns">No Returns</option>
                                    <option value="2 Hours">2 Hours Return Window</option>
                                    <option value="3 Hours">3 Hours Return Window</option>
                                    <option value="Same Day">Same Day Return</option>
                                    <option value="7 Days">7 Days Return</option>
                                </select>
                            </div>
                        </div>

                        <div className="form-group" style={{ marginTop: 10 }}>
                            <label style={{ display: 'inline-flex', alignItems: 'center', marginRight: 20 }}>
                                <input type="checkbox" name="featured" checked={formData.featured} onChange={handleChange} style={{ marginRight: 5 }} /> Featured
                            </label>
                            <label style={{ display: 'inline-flex', alignItems: 'center', marginRight: 20 }}>
                                <input type="checkbox" name="trending" checked={formData.trending} onChange={handleChange} style={{ marginRight: 5 }} /> Trending
                            </label>
                            <label style={{ display: 'inline-flex', alignItems: 'center', marginRight: 20 }}>
                                <input type="checkbox" name="newArrival" checked={formData.newArrival} onChange={handleChange} style={{ marginRight: 5 }} /> New Arrival
                            </label>
                            <label style={{ display: 'inline-flex', alignItems: 'center' }}>
                                <input type="checkbox" name="bestSeller" checked={formData.bestSeller} onChange={handleChange} style={{ marginRight: 5 }} /> Best Seller
                            </label>
                        </div>
                    </div>

                    <div className="modal-actions">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Saving Product...' : 'Save Product'}
                        </button>
                    </div>
                </form>

                <style>{`
                    .section {
                        margin-bottom: 24px;
                        padding-bottom: 24px;
                        border-bottom: 1px solid #eee;
                    }
                    .section h3 {
                        font-size: 16px;
                        color: #2563eb;
                        margin-bottom: 16px;
                    }
                    .image-grid {
                        display: grid;
                        grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
                        gap: 12px;
                        margin-bottom: 8px;
                    }
                    .image-grid-item {
                        position: relative;
                        aspect-ratio: 1;
                        border-radius: 10px;
                        overflow: hidden;
                        border: 2px solid #e5e7eb;
                        background: #f9fafb;
                        transition: border-color 0.2s;
                    }
                    .image-grid-item:hover {
                        border-color: #2563eb;
                    }
                    .image-grid-item.new-img {
                        border-color: #a5d6a7;
                    }
                    .image-grid-item img {
                        width: 100%;
                        height: 100%;
                        object-fit: cover;
                    }
                    .remove-img-btn {
                        position: absolute;
                        top: 4px;
                        right: 4px;
                        width: 24px;
                        height: 24px;
                        background: rgba(0,0,0,0.6);
                        color: #fff;
                        border: none;
                        border-radius: 50%;
                        cursor: pointer;
                        font-size: 12px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        opacity: 0;
                        transition: opacity 0.2s;
                    }
                    .image-grid-item:hover .remove-img-btn {
                        opacity: 1;
                    }
                    .primary-badge {
                        position: absolute;
                        bottom: 4px;
                        left: 4px;
                        background: #2563eb;
                        color: #fff;
                        font-size: 10px;
                        font-weight: 700;
                        padding: 2px 8px;
                        border-radius: 4px;
                    }
                    .new-badge {
                        position: absolute;
                        bottom: 4px;
                        right: 4px;
                        background: #16a34a;
                        color: #fff;
                        font-size: 10px;
                        font-weight: 700;
                        padding: 2px 8px;
                        border-radius: 4px;
                    }
                    .image-add-btn {
                        aspect-ratio: 1;
                        border: 2px dashed #d1d5db;
                        border-radius: 10px;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        cursor: pointer;
                        transition: all 0.2s;
                        background: #f9fafb;
                        gap: 4px;
                    }
                    .image-add-btn:hover {
                        border-color: #2563eb;
                        background: #eff6ff;
                    }
                    .add-icon {
                        font-size: 28px;
                        color: #9ca3af;
                        line-height: 1;
                    }
                    .image-add-btn:hover .add-icon {
                        color: #2563eb;
                    }
                    .add-text {
                        font-size: 11px;
                        color: #9ca3af;
                        font-weight: 600;
                    }
                    .image-add-btn:hover .add-text {
                        color: #2563eb;
                    }
                `}</style>
            </div>
        </div>
    );
};

export default ProductForm;
