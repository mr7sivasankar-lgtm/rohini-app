import { useState, useEffect } from 'react';
import api from '../utils/api';

const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
const kidsSizes = [
    '0-1 Year (Newborn)', '1-2 Years', '2-3 Years', '3-5 Years',
    '5-7 Years', '7-9 Years', '9-12 Years', '12-15 Years (Teen)'
];

const ProductModal = ({ product, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '', productCode: '', brand: '', gender: '', description: '',
        sellingPrice: '', mrpPrice: '', stock: '',
        sizes: [], colors: [],
        fabric: '', fit: '', pattern: '', sleeve: '', neck: '',
        returnPolicy: 'No Returns',
        featured: false, trending: false, newArrival: false, bestSeller: false,
        category: '', subcategory: [], images: []
    });
    const [files, setFiles] = useState([]);
    const [removedImages, setRemovedImages] = useState([]);
    const [colorInput, setColorInput] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [commission, setCommission] = useState(5); // Fallback standard

    // Categories
    const [allCategories, setAllCategories] = useState([]);
    const [parentCategories, setParentCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);

    const isKids = formData.gender === 'Kids';

    // Fetch categories on mount
    useEffect(() => {
        api.get('/categories').then(res => {
            if (res.data.success) setAllCategories(res.data.data || []);
        }).catch(() => {});
        
        api.get('/config').then(res => {
            if (res.data.success && res.data.data) {
                setCommission(res.data.data.commissionPercentage || 5);
            }
        }).catch(() => {});
    }, []);

    // Populate form when editing
    useEffect(() => {
        if (product) {
            setFormData({
                name: product.name || '',
                productCode: product.productCode || '',
                brand: product.brand || '',
                gender: product.gender || '',
                description: product.description || '',
                sellingPrice: product.sellingPrice || '',
                mrpPrice: product.mrpPrice || '',
                stock: product.stock || '',
                sizes: product.sizes || [],
                colors: product.colors || [],
                fabric: product.fabric || '',
                fit: product.fit || '',
                pattern: product.pattern || '',
                sleeve: product.sleeve || '',
                neck: product.neck || '',
                returnPolicy: product.returnPolicy || 'No Returns',
                featured: product.featured || false,
                trending: product.trending || false,
                newArrival: product.newArrival || false,
                bestSeller: product.bestSeller || false,
                category: product.category?._id || product.category || '',
                subcategory: Array.isArray(product.subcategory)
                    ? product.subcategory.map(s => s._id || s) : [],
                images: product.images || []
            });
        }
    }, [product]);

    // Filter parent categories by gender
    useEffect(() => {
        if (!formData.gender) { setParentCategories([]); return; }
        const genderMap = { 'Male': 'Male', 'Female': 'Female', 'Kids': 'Kids', 'Unisex': null };
        const mapped = genderMap[formData.gender];
        const roots = allCategories.filter(c => !c.parentCategory &&
            (mapped === null || c.gender === mapped));
        const rootIds = roots.map(r => r._id);
        const parents = allCategories.filter(c =>
            c.parentCategory && rootIds.includes(c.parentCategory._id || c.parentCategory)
            && c.name !== 'Age Group'
        );
        setParentCategories(parents);
        setFormData(prev => ({ ...prev, category: '', subcategory: [], sizes: [] }));
    }, [formData.gender, allCategories]);

    // Filter subcategories by selected parent
    useEffect(() => {
        if (!formData.category) { setSubCategories([]); return; }
        const subs = allCategories.filter(c =>
            c.parentCategory &&
            (c.parentCategory._id === formData.category || c.parentCategory === formData.category)
        );
        setSubCategories(subs);
        setFormData(prev => ({ ...prev, subcategory: [] }));
    }, [formData.category, allCategories]);

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    };

    const handleSizeToggle = (size) => {
        setFormData(prev => ({
            ...prev,
            sizes: prev.sizes.includes(size) ? prev.sizes.filter(s => s !== size) : [...prev.sizes, size]
        }));
    };

    const handleSubcategoryToggle = (id) => {
        setFormData(prev => ({
            ...prev,
            subcategory: prev.subcategory.includes(id)
                ? prev.subcategory.filter(x => x !== id)
                : [...prev.subcategory, id]
        }));
    };

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

    const handleFileChange = (e) => {
        setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        e.target.value = '';
    };

    const removeExistingImage = (img) => {
        setRemovedImages(prev => [...prev, img]);
        setFormData(prev => ({ ...prev, images: prev.images.filter(i => i !== img) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = new FormData();
            const payload = { ...formData, removedImages };
            data.append('data', JSON.stringify(payload));
            files.forEach(f => data.append('images', f));

            let res;
            if (product) {
                res = await api.put(`/products/${product._id}`, data, { headers: { 'Content-Type': 'multipart/form-data' } });
            } else {
                res = await api.post('/products', data, { headers: { 'Content-Type': 'multipart/form-data' } });
            }
            if (res.data.success) { onSuccess(); onClose(); }
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to save product');
        } finally {
            setLoading(false);
        }
    };

    const sectionStyle = { marginBottom: 24, paddingBottom: 24, borderBottom: '1px solid #f1f5f9' };
    const h3Style = { fontSize: 15, color: '#4f46e5', fontWeight: 700, marginBottom: 14, marginTop: 0 };
    const rowStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 };
    const inputStyle = { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit' };
    const imgBoxStyle = { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10, marginBottom: 8 };
    const checkboxLabel = (label, name) => (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginRight: 16, fontSize: 14, cursor: 'pointer' }}>
            <input type="checkbox" name={name} checked={formData[name]} onChange={handleChange} />
            {label}
        </label>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200 }}>
            <div style={{ background: 'white', borderRadius: 18, width: '100%', maxWidth: 680, maxHeight: '92vh', overflowY: 'auto', padding: 32 }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
                    <h2 style={{ margin: 0, fontSize: 20 }}>{product ? 'Edit Product' : 'Add New Product'}</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748b' }}>✕</button>
                </div>

                {error && <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>{error}</div>}

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>

                    {/* 1. Basic Info */}
                    <div style={sectionStyle}>
                        <h3 style={h3Style}>📦 Basic Information</h3>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Product Title *</label>
                            <input name="name" value={formData.name} onChange={handleChange} required style={inputStyle} placeholder="e.g. Cotton T-Shirt" />
                        </div>
                        <div style={rowStyle}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Product Code / SKU</label>
                                <input name="productCode" value={formData.productCode} onChange={handleChange} style={inputStyle} placeholder="e.g. TSHIRT-001" />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Brand Name</label>
                                <input name="brand" value={formData.brand} onChange={handleChange} style={inputStyle} placeholder="e.g. Nike, ZARA" />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Gender *</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} required style={inputStyle}>
                                    <option value="">Select Gender</option>
                                    {['Male', 'Female', 'Kids', 'Unisex'].map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>

                        <div style={{ ...rowStyle, marginTop: 14 }}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Category *</label>
                                <select name="category" value={formData.category} onChange={handleChange} required disabled={!formData.gender} style={inputStyle}>
                                    <option value="">Select Category</option>
                                    {parentCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Subcategories</label>
                                {!formData.category ? (
                                    <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 8 }}>Select a category first</p>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
                                        {subCategories.map(c => (
                                            <label key={c._id} style={{
                                                display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px',
                                                background: formData.subcategory.includes(c._id) ? '#e0e7ff' : '#f1f5f9',
                                                border: `1px solid ${formData.subcategory.includes(c._id) ? '#818cf8' : 'transparent'}`,
                                                borderRadius: 6, cursor: 'pointer', fontSize: 13
                                            }}>
                                                <input type="checkbox" checked={formData.subcategory.includes(c._id)} onChange={() => handleSubcategoryToggle(c._id)} />
                                                {c.name.split(' (')[0]}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        <div style={{ marginTop: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Description *</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} required style={{ ...inputStyle, resize: 'vertical' }} rows={4} />
                        </div>
                    </div>

                    {/* 2. Pricing & Stock */}
                    <div style={sectionStyle}>
                        <h3 style={h3Style}>💰 Pricing & Stock</h3>
                        <div style={rowStyle}>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>MRP (Original Price)</label>
                                <input type="number" name="mrpPrice" value={formData.mrpPrice} onChange={handleChange} style={inputStyle} min="0" />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Selling Price *</label>
                                <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} required style={inputStyle} min="0" />
                            </div>
                            <div>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Stock (Qty) *</label>
                                <input type="number" name="stock" value={formData.stock} onChange={handleChange} required style={inputStyle} min="0" />
                                <small style={{ color: Number(formData.stock) > 0 ? '#16a34a' : '#dc2626', fontSize: 12 }}>
                                    {Number(formData.stock) > 0 ? 'In Stock' : 'Out of Stock'}
                                </small>
                            </div>
                        </div>
                        {formData.sellingPrice && (
                            <div style={{ marginTop: 14, padding: 12, background: '#f0fdfa', borderRadius: 8, border: '1px solid #ccfbf1', display: 'flex', justifyContent: 'space-between', fontSize: 13, flexWrap: 'wrap', gap: 8 }}>
                                <span style={{ color: '#0f766e', fontWeight: 600 }}>Platform Commission ({commission}%): ₹{((formData.sellingPrice * commission) / 100).toFixed(2)}</span>
                                <span style={{ color: '#047857', fontWeight: 800, background: '#d1fae5', padding: '4px 8px', borderRadius: 6 }}>You Earn: ₹{(formData.sellingPrice - (formData.sellingPrice * commission) / 100).toFixed(2)}</span>
                            </div>
                        )}
                    </div>

                    {/* 3. Sizes & Colors */}
                    <div style={sectionStyle}>
                        <h3 style={h3Style}>📐 Variants</h3>
                        <div>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Available Sizes</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                {standardSizes.map(s => (
                                    <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: formData.sizes.includes(s) ? '#e0e7ff' : '#f1f5f9', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                                        <input type="checkbox" checked={formData.sizes.includes(s)} onChange={() => handleSizeToggle(s)} /> {s}
                                    </label>
                                ))}
                            </div>
                        </div>
                        {isKids && (
                            <div style={{ marginTop: 12 }}>
                                <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Age Group</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 8 }}>
                                    {kidsSizes.map(s => (
                                        <label key={s} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', background: formData.sizes.includes(s) ? '#d1fae5' : '#f1f5f9', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                                            <input type="checkbox" checked={formData.sizes.includes(s)} onChange={() => handleSizeToggle(s)} /> {s}
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div style={{ marginTop: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Available Colors</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', minHeight: 44, background: '#fff', marginTop: 6, cursor: 'text' }}
                                onClick={() => document.getElementById('sellerColorInput').focus()}>
                                {formData.colors.map(c => (
                                    <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#e0e7ff', color: '#3730a3', borderRadius: 999, padding: '3px 10px', fontSize: 13, fontWeight: 600 }}>
                                        {c}
                                        <button type="button" onClick={() => setFormData(prev => ({ ...prev, colors: prev.colors.filter(x => x !== c) }))}
                                            style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 14, padding: 0 }}>×</button>
                                    </span>
                                ))}
                                <input id="sellerColorInput" value={colorInput} onChange={e => setColorInput(e.target.value)} onKeyDown={handleColorKeyDown}
                                    placeholder={formData.colors.length === 0 ? 'Type a color, press Enter or comma to add...' : ''}
                                    style={{ border: 'none', outline: 'none', flex: 1, minWidth: 140, fontSize: 14 }} />
                            </div>
                            <small style={{ color: '#94a3b8', fontSize: 12 }}>Press Enter or , after each color • Backspace to remove last</small>
                        </div>
                    </div>

                    {/* 4. Fabric Details */}
                    <div style={sectionStyle}>
                        <h3 style={h3Style}>🧵 Fabric & Details</h3>
                        <div style={rowStyle}>
                            <div><label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Fabric</label><input name="fabric" value={formData.fabric} onChange={handleChange} style={inputStyle} /></div>
                            <div><label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Fit</label><input name="fit" value={formData.fit} onChange={handleChange} style={inputStyle} /></div>
                        </div>
                        <div style={{ ...rowStyle, marginTop: 14 }}>
                            <div><label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Pattern</label><input name="pattern" value={formData.pattern} onChange={handleChange} style={inputStyle} /></div>
                            <div><label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Sleeve</label><input name="sleeve" value={formData.sleeve} onChange={handleChange} style={inputStyle} /></div>
                            <div><label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Neck</label><input name="neck" value={formData.neck} onChange={handleChange} style={inputStyle} /></div>
                        </div>
                    </div>

                    {/* 5. Images */}
                    <div style={sectionStyle}>
                        <h3 style={h3Style}>🖼️ Images *</h3>
                        <div style={imgBoxStyle}>
                            {formData.images.map((img, i) => (
                                <div key={`ex-${i}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '2px solid #e5e7eb' }}>
                                    <img src={img.startsWith('http') ? img : `${import.meta.env.VITE_API_URL?.replace('/api', '')}${img}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button type="button" onClick={() => removeExistingImage(img)} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 11 }}>✕</button>
                                </div>
                            ))}
                            {files.map((f, i) => (
                                <div key={`new-${i}`} style={{ position: 'relative', aspectRatio: '1', borderRadius: 10, overflow: 'hidden', border: '2px solid #86efac' }}>
                                    <img src={URL.createObjectURL(f)} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    <button type="button" onClick={() => setFiles(prev => prev.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 4, right: 4, width: 22, height: 22, background: 'rgba(0,0,0,0.6)', color: '#fff', border: 'none', borderRadius: '50%', cursor: 'pointer', fontSize: 11 }}>✕</button>
                                </div>
                            ))}
                            <label style={{ aspectRatio: '1', border: '2px dashed #c7d2fe', borderRadius: 10, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: '#f5f3ff', gap: 4 }}>
                                <input type="file" multiple accept="image/*" onChange={handleFileChange} style={{ display: 'none' }} />
                                <span style={{ fontSize: 28, color: '#6366f1' }}>＋</span>
                                <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Add Images</span>
                            </label>
                        </div>
                        <small style={{ color: '#94a3b8', fontSize: 12 }}>Upload up to 10 images (front, back, side views etc.) • First image is the primary image</small>
                    </div>

                    {/* 6. Advanced */}
                    <div style={{ marginBottom: 24 }}>
                        <h3 style={h3Style}>⚙️ Advanced</h3>
                        <div style={{ marginBottom: 14 }}>
                            <label style={{ fontSize: 13, fontWeight: 600, color: '#475569' }}>Return Policy</label>
                            <select name="returnPolicy" value={formData.returnPolicy} onChange={handleChange} style={inputStyle}>
                                <option value="No Returns">No Returns</option>
                                <option value="2 Hours">2 Hours Return Window</option>
                                <option value="3 Hours">3 Hours Return Window</option>
                                <option value="Same Day">Same Day Return</option>
                                <option value="7 Days">7 Days Return</option>
                            </select>
                        </div>
                        <div>
                            {checkboxLabel('Featured', 'featured')}
                            {checkboxLabel('Trending', 'trending')}
                            {checkboxLabel('New Arrival', 'newArrival')}
                            {checkboxLabel('Best Seller', 'bestSeller')}
                        </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '13px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Cancel</button>
                        <button type="submit" disabled={loading} style={{ flex: 1, padding: '13px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', cursor: 'pointer', fontSize: 14, fontWeight: 700 }}>
                            {loading ? 'Saving...' : (product ? 'Update Product' : 'Add Product')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
