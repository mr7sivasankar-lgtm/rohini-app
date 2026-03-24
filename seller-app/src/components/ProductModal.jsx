import { useState, useEffect } from 'react';
import api from '../utils/api';

const standardSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'Free Size'];
const numericSizes = ['26', '28', '30', '32', '34', '36', '38', '40', '42', '44', '46'];
const kidsSizes = [
    '0-1 Year', '1-2 Years', '2-3 Years', '3-5 Years',
    '5-7 Years', '7-9 Years', '9-12 Years', '12-15 Years (Teen)'
];

const FABRIC_OPTIONS = ['Cotton', 'Silk', 'Denim', 'Polyester', 'Linen', 'Wool', 'Rayon', 'Chiffon', 'Georgette', 'Jersey', 'Lycra', 'Viscose', 'Net', 'Satin', 'Velvet', 'Fleece', 'Nylon', 'Blended', 'Other'];
const PATTERN_OPTIONS = ['Printed', 'Plain', 'Floral', 'Checked', 'Striped', 'Polka Dot', 'Abstract', 'Self Design', 'Embroidered', 'Solid', 'Graphic', 'Animal Print', 'Tie & Dye', 'Geometric', 'Other'];
const FIT_OPTIONS = ['Regular Fit', 'Slim Fit', 'Oversized', 'Relaxed Fit', 'Skinny Fit', 'Straight Fit', 'A-Line', 'Flared', 'Tailored Fit', 'Loose Fit', 'Other'];
const SLEEVE_OPTIONS = ['Full Sleeve', 'Half Sleeve', 'Sleeveless', '3/4 Sleeve', 'Cap Sleeve', 'Short Sleeve', 'Bell Sleeve', 'Puff Sleeve', 'Raglan Sleeve', 'Other'];
const NECK_OPTIONS = ['', 'Round Neck', 'V Neck', 'Collar', 'Turtle Neck', 'Boat Neck', 'Polo Neck', 'Hooded', 'Square Neck', 'Halter Neck', 'Scoop Neck', 'Off Shoulder', 'Other'];
const OCCASION_OPTIONS = ['', 'Casual', 'Formal', 'Party Wear', 'Festive', 'Sports', 'Ethnic', 'Office Wear', 'Beach Wear', 'Lounge Wear', 'Bridal', 'Daily Wear', 'Other'];

const COLOR_PALETTE = [
    { name: 'White',       hex: '#FFFFFF', border: '#e5e7eb' },
    { name: 'Off White',   hex: '#FAF7F0', border: '#d1c9b8' },
    { name: 'Cream',       hex: '#FEF3C7', border: '#d4c47a' },
    { name: 'Beige',       hex: '#E8D5B7', border: '#c4a97d' },
    { name: 'Black',       hex: '#1a1a1a' },
    { name: 'Charcoal',    hex: '#374151' },
    { name: 'Grey',        hex: '#6B7280' },
    { name: 'Silver',      hex: '#D1D5DB' },
    { name: 'Red',         hex: '#EF4444' },
    { name: 'Maroon',      hex: '#7F1D1D' },
    { name: 'Dark Red',    hex: '#991B1B' },
    { name: 'Pink',        hex: '#EC4899' },
    { name: 'Baby Pink',   hex: '#FBCFE8' },
    { name: 'Hot Pink',    hex: '#F472B6' },
    { name: 'Orange',      hex: '#F97316' },
    { name: 'Peach',       hex: '#FDBA74' },
    { name: 'Yellow',      hex: '#EAB308' },
    { name: 'Gold',        hex: '#D97706' },
    { name: 'Mustard',     hex: '#CA8A04' },
    { name: 'Green',       hex: '#22C55E' },
    { name: 'Olive',       hex: '#65A30D' },
    { name: 'Dark Green',  hex: '#15803D' },
    { name: 'Teal',        hex: '#0D9488' },
    { name: 'Mint',        hex: '#A7F3D0' },
    { name: 'Cyan',        hex: '#06B6D4' },
    { name: 'Sky Blue',    hex: '#38BDF8' },
    { name: 'Blue',        hex: '#3B82F6' },
    { name: 'Navy',        hex: '#1E3A8A' },
    { name: 'Royal Blue',  hex: '#2563EB' },
    { name: 'Purple',      hex: '#A855F7' },
    { name: 'Lavender',    hex: '#C4B5FD' },
    { name: 'Violet',      hex: '#7C3AED' },
    { name: 'Brown',       hex: '#92400E' },
    { name: 'Tan',         hex: '#B45309' },
    { name: 'Copper',      hex: '#B87333' },
];

const ProductModal = ({ product, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '', productCode: '', brand: '', gender: '', description: '',
        sellingPrice: '', mrpPrice: '', stock: '',
        sizes: [], colors: [],
        fabric: '', fit: '', pattern: '', sleeve: '', neck: '', occasion: '',
        returnPolicy: 'No Returns',
        featured: false, trending: false, newArrival: false, bestSeller: false,
        category: '', subcategory: [], images: []
    });
    const [files, setFiles] = useState([]);
    const [removedImages, setRemovedImages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [commission, setCommission] = useState(20);

    // Pricing calculator state
    const [pricingMode, setPricingMode] = useState('direct'); // 'direct' | 'calculator'
    const [costPrice, setCostPrice] = useState('');
    const [desiredProfit, setDesiredProfit] = useState('');

    // Categories
    const [allCategories, setAllCategories] = useState([]);
    const [parentCategories, setParentCategories] = useState([]);
    const [subCategories, setSubCategories] = useState([]);

    const isKids = formData.gender === 'Kids';

    useEffect(() => {
        api.get('/categories').then(res => {
            if (res.data.success) setAllCategories(res.data.data || []);
        }).catch(() => {});
        api.get('/config').then(res => {
            if (res.data.success && res.data.data) {
                setCommission(res.data.data.commissionPercentage || 20);
            }
        }).catch(() => {});
    }, []);

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
                occasion: product.occasion || '',
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

    const handleColorToggle = (colorName) => {
        setFormData(prev => ({
            ...prev,
            colors: prev.colors.includes(colorName)
                ? prev.colors.filter(c => c !== colorName)
                : [...prev.colors, colorName]
        }));
    };

    const handleFileChange = (e) => {
        setFiles(prev => [...prev, ...Array.from(e.target.files)]);
        e.target.value = '';
    };

    const removeExistingImage = (img) => {
        setRemovedImages(prev => [...prev, img]);
        setFormData(prev => ({ ...prev, images: prev.images.filter(i => i !== img) }));
    };

    // Pricing calculator
    const cost = parseFloat(costPrice) || 0;
    const profit = parseFloat(desiredProfit) || 0;
    const commissionRate = commission / 100;
    const recommendedPrice = cost > 0 && profit > 0
        ? Math.ceil((cost + profit) / (1 - commissionRate))
        : 0;
    const adminCommissionAmt = recommendedPrice * commissionRate;
    const youReceive = recommendedPrice - adminCommissionAmt;

    const applyCalculatedPrice = () => {
        if (recommendedPrice > 0) {
            setFormData(prev => ({ ...prev, sellingPrice: recommendedPrice }));
            setPricingMode('direct');
        }
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

    // Shared styles
    const sec = { marginBottom: 28, paddingBottom: 28, borderBottom: '1.5px solid #f1f5f9' };
    const h3 = { fontSize: 15, color: '#4f46e5', fontWeight: 700, marginBottom: 16, marginTop: 0, display: 'flex', alignItems: 'center', gap: 8 };
    const row = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 };
    const inp = { padding: '10px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 14, width: '100%', boxSizing: 'border-box', fontFamily: 'inherit', background: '#fafbfc' };
    const lbl = { fontSize: 12, fontWeight: 700, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.4px', display: 'block', marginBottom: 5 };
    const sizeBtn = (selected) => ({
        padding: '6px 13px', borderRadius: 8, border: `1.5px solid ${selected ? '#6366f1' : '#e2e8f0'}`,
        background: selected ? '#e0e7ff' : '#f8fafc', cursor: 'pointer', fontSize: 13, fontWeight: selected ? 700 : 500,
        color: selected ? '#4f46e5' : '#475569', transition: 'all 0.15s'
    });

    const mkSelect = (name, options, placeholder = '') => (
        <select name={name} value={formData[name]} onChange={handleChange} style={inp}>
            <option value="">{placeholder || `-- Select ${name} --`}</option>
            {options.filter(o => o !== '').map(o => <option key={o} value={o}>{o}</option>)}
        </select>
    );

    const checkboxLabel = (label, name) => (
        <label style={{ display: 'inline-flex', alignItems: 'center', gap: 7, marginRight: 18, fontSize: 14, cursor: 'pointer', padding: '6px 12px', borderRadius: 8, background: formData[name] ? '#e0e7ff' : '#f1f5f9', border: `1px solid ${formData[name] ? '#818cf8' : 'transparent'}` }}>
            <input type="checkbox" name={name} checked={formData[name]} onChange={handleChange} />
            {label}
        </label>
    );

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 200, padding: '12px' }}>
            <div style={{ background: 'white', borderRadius: 20, width: '100%', maxWidth: 720, maxHeight: '94vh', overflowY: 'auto', padding: '32px 36px' }}>

                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
                    <div>
                        <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{product ? '✏️ Edit Product' : '📦 Add New Product'}</h2>
                        <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>Fill in the details below. Pricing comes at the final step.</p>
                    </div>
                    <button onClick={onClose} style={{ background: '#f1f5f9', border: 'none', width: 36, height: 36, borderRadius: '50%', fontSize: 18, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
                </div>

                {error && <div style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 14 }}>{error}</div>}

                <form onSubmit={handleSubmit}>

                    {/* ── 1. BASIC INFO ─────────────────────────────────── */}
                    <div style={sec}>
                        <h3 style={h3}>📋 Basic Information</h3>
                        <div style={{ marginBottom: 14 }}>
                            <label style={lbl}>Product Title *</label>
                            <input name="name" value={formData.name} onChange={handleChange} required style={inp} placeholder="e.g. Cotton Kurta with Embroidery" />
                        </div>
                        <div style={{ ...row, marginBottom: 14 }}>
                            <div><label style={lbl}>Product Code / SKU</label><input name="productCode" value={formData.productCode} onChange={handleChange} style={inp} placeholder="e.g. KRT-001" /></div>
                            <div><label style={lbl}>Brand Name</label><input name="brand" value={formData.brand} onChange={handleChange} style={inp} placeholder="e.g. Biba, W, etc." /></div>
                            <div>
                                <label style={lbl}>Gender *</label>
                                <select name="gender" value={formData.gender} onChange={handleChange} required style={inp}>
                                    <option value="">Select Gender</option>
                                    {['Male', 'Female', 'Kids', 'Unisex'].map(g => <option key={g} value={g}>{g}</option>)}
                                </select>
                            </div>
                        </div>
                        <div style={{ ...row, marginBottom: 14 }}>
                            <div>
                                <label style={lbl}>Category *</label>
                                <select name="category" value={formData.category} onChange={handleChange} required disabled={!formData.gender} style={inp}>
                                    <option value="">Select Category</option>
                                    {parentCategories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label style={lbl}>Subcategories</label>
                                {!formData.category ? (
                                    <p style={{ fontSize: 13, color: '#94a3b8', marginTop: 4 }}>Select a category first</p>
                                ) : (
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                                        {subCategories.map(c => (
                                            <label key={c._id} style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '4px 10px', background: formData.subcategory.includes(c._id) ? '#e0e7ff' : '#f1f5f9', border: `1px solid ${formData.subcategory.includes(c._id) ? '#818cf8' : 'transparent'}`, borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                                                <input type="checkbox" checked={formData.subcategory.includes(c._id)} onChange={() => handleSubcategoryToggle(c._id)} />
                                                {c.name.split(' (')[0]}
                                            </label>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                        <div>
                            <label style={lbl}>Description *</label>
                            <textarea name="description" value={formData.description} onChange={handleChange} required style={{ ...inp, resize: 'vertical' }} rows={4} placeholder="Describe the product clearly — material, style, wash instructions, etc." />
                        </div>
                    </div>

                    {/* ── 2. FABRIC & STYLE DETAILS ─────────────────────── */}
                    <div style={sec}>
                        <h3 style={h3}>🧵 Fabric & Style Details</h3>
                        <div style={{ ...row, marginBottom: 16 }}>
                            <div>
                                <label style={lbl}>Fabric / Material</label>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>e.g. Cotton, Silk, Denim...</small>
                                {mkSelect('fabric', FABRIC_OPTIONS, 'Select Fabric')}
                            </div>
                            <div>
                                <label style={lbl}>Pattern / Design</label>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>e.g. Printed, Plain, Floral...</small>
                                {mkSelect('pattern', PATTERN_OPTIONS, 'Select Pattern')}
                            </div>
                            <div>
                                <label style={lbl}>Fit Type</label>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>e.g. Regular, Slim, Oversized...</small>
                                {mkSelect('fit', FIT_OPTIONS, 'Select Fit')}
                            </div>
                        </div>
                        <div style={row}>
                            <div>
                                <label style={lbl}>Sleeve Type</label>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>e.g. Full, Half, Sleeveless...</small>
                                {mkSelect('sleeve', SLEEVE_OPTIONS, 'Select Sleeve')}
                            </div>
                            <div>
                                <label style={lbl}>Neck Type <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>e.g. Round, V-Neck, Collar...</small>
                                {mkSelect('neck', NECK_OPTIONS.filter(o => o !== ''), 'Select Neck Type')}
                            </div>
                            <div>
                                <label style={lbl}>Occasion <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span></label>
                                <small style={{ display: 'block', color: '#94a3b8', fontSize: 11, marginBottom: 6 }}>e.g. Casual, Formal, Festive...</small>
                                {mkSelect('occasion', OCCASION_OPTIONS.filter(o => o !== ''), 'Select Occasion')}
                            </div>
                        </div>
                    </div>

                    {/* ── 3. VARIANTS – SIZES ───────────────────────────── */}
                    <div style={sec}>
                        <h3 style={h3}>📐 Sizes & Colors</h3>

                        {/* Standard Sizes */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={lbl}>Clothing Sizes</label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                                {standardSizes.map(s => (
                                    <button key={s} type="button" onClick={() => handleSizeToggle(s)} style={sizeBtn(formData.sizes.includes(s))}>{s}</button>
                                ))}
                            </div>
                        </div>

                        {/* Numeric Sizes */}
                        <div style={{ marginBottom: 14 }}>
                            <label style={lbl}>Numeric Sizes <span style={{ color: '#94a3b8', fontWeight: 400 }}>(Waist / Inch)</span></label>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                                {numericSizes.map(s => (
                                    <button key={s} type="button" onClick={() => handleSizeToggle(s)} style={sizeBtn(formData.sizes.includes(s))}>{s}</button>
                                ))}
                            </div>
                        </div>

                        {/* Kids Sizes */}
                        {isKids && (
                            <div style={{ marginBottom: 14 }}>
                                <label style={lbl}>Kids Age Group</label>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6 }}>
                                    {kidsSizes.map(s => (
                                        <button key={s} type="button" onClick={() => handleSizeToggle(s)} style={sizeBtn(formData.sizes.includes(s))}>{s}</button>
                                    ))}
                                </div>
                            </div>
                        )}

                        {formData.sizes.length > 0 && (
                            <div style={{ marginBottom: 16, padding: '10px 14px', background: '#f0fdf4', borderRadius: 8, border: '1px solid #bbf7d0', fontSize: 13, color: '#166534' }}>
                                ✅ Selected: {formData.sizes.join(', ')}
                            </div>
                        )}

                        {/* Color Swatches */}
                        <div>
                            <label style={lbl}>Available Colors</label>
                            <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 0, marginBottom: 10 }}>Click to select colors that match this product</p>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(60px, 1fr))', gap: 8 }}>
                                {COLOR_PALETTE.map(({ name, hex, border }) => {
                                    const selected = formData.colors.includes(name);
                                    return (
                                        <button
                                            key={name}
                                            type="button"
                                            onClick={() => handleColorToggle(name)}
                                            title={name}
                                            style={{
                                                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                                                padding: '8px 4px', borderRadius: 10, cursor: 'pointer',
                                                border: selected ? '2px solid #4f46e5' : '2px solid transparent',
                                                background: selected ? '#eff6ff' : 'transparent',
                                                transition: 'all 0.15s', boxSizing: 'border-box'
                                            }}
                                        >
                                            <div style={{
                                                width: 30, height: 30, borderRadius: '50%',
                                                background: hex,
                                                border: `1.5px solid ${border || '#00000020'}`,
                                                boxShadow: selected ? '0 0 0 2px #6366f1' : 'none',
                                                flexShrink: 0
                                            }} />
                                            <span style={{ fontSize: 9, color: selected ? '#4f46e5' : '#64748b', fontWeight: selected ? 700 : 400, textAlign: 'center', lineHeight: 1.2 }}>{name}</span>
                                        </button>
                                    );
                                })}
                            </div>
                            {formData.colors.length > 0 && (
                                <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                                    <span style={{ fontSize: 12, fontWeight: 600, color: '#475569' }}>Selected:</span>
                                    {formData.colors.map(c => {
                                        const p = COLOR_PALETTE.find(x => x.name === c);
                                        return (
                                            <span key={c} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, background: '#eff6ff', borderRadius: 999, padding: '3px 10px 3px 7px', fontSize: 12, fontWeight: 600, color: '#4f46e5', border: '1px solid #c7d2fe' }}>
                                                <span style={{ width: 12, height: 12, borderRadius: '50%', background: p?.hex || '#ddd', border: '1px solid #00000020', flexShrink: 0 }} />
                                                {c}
                                                <button type="button" onClick={() => handleColorToggle(c)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#6366f1', fontSize: 15, padding: 0, lineHeight: 1 }}>×</button>
                                            </span>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* ── 4. IMAGES ─────────────────────────────────────── */}
                    <div style={sec}>
                        <h3 style={h3}>🖼️ Product Images</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(90px, 1fr))', gap: 10, marginBottom: 10 }}>
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
                                <span style={{ fontSize: 11, color: '#6366f1', fontWeight: 600 }}>Add Photo</span>
                            </label>
                        </div>
                        <small style={{ color: '#94a3b8', fontSize: 12 }}>Upload up to 10 images (front, back, side, detail views) • First image is the primary image</small>
                    </div>

                    {/* ── 5. ADVANCED ───────────────────────────────────── */}
                    <div style={sec}>
                        <h3 style={h3}>⚙️ Advanced Settings</h3>
                        <div style={{ marginBottom: 16 }}>
                            <label style={lbl}>Return Policy</label>
                            <select name="returnPolicy" value={formData.returnPolicy} onChange={handleChange} style={inp}>
                                <option value="No Returns">No Returns</option>
                                <option value="2 Hours">2 Hours Return Window</option>
                                <option value="3 Hours">3 Hours Return Window</option>
                                <option value="Same Day">Same Day Return</option>
                                <option value="7 Days">7 Days Return</option>
                            </select>
                        </div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {checkboxLabel('⭐ Featured', 'featured')}
                            {checkboxLabel('🔥 Trending', 'trending')}
                            {checkboxLabel('🆕 New Arrival', 'newArrival')}
                            {checkboxLabel('🏆 Best Seller', 'bestSeller')}
                        </div>
                    </div>

                    {/* ── 6. PRICING & STOCK (LAST STEP) ────────────────── */}
                    <div style={{ marginBottom: 28 }}>
                        <h3 style={{ ...h3, color: '#059669' }}>💰 Pricing & Stock</h3>
                        <p style={{ margin: '0 0 16px', fontSize: 13, color: '#475569', background: '#f0fdf4', padding: '10px 14px', borderRadius: 8, border: '1px solid #bbf7d0' }}>
                            ℹ️ Platform commission is <strong>{commission}%</strong> of your selling price. You receive the rest.
                        </p>

                        {/* Pricing mode toggle */}
                        <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
                            <button type="button" onClick={() => setPricingMode('direct')}
                                style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${pricingMode === 'direct' ? '#6366f1' : '#e2e8f0'}`, background: pricingMode === 'direct' ? '#eff6ff' : '#f8fafc', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: pricingMode === 'direct' ? '#4f46e5' : '#64748b' }}>
                                ✏️ Enter Price Directly
                            </button>
                            <button type="button" onClick={() => setPricingMode('calculator')}
                                style={{ flex: 1, padding: '10px', borderRadius: 10, border: `2px solid ${pricingMode === 'calculator' ? '#6366f1' : '#e2e8f0'}`, background: pricingMode === 'calculator' ? '#eff6ff' : '#f8fafc', fontWeight: 700, fontSize: 13, cursor: 'pointer', color: pricingMode === 'calculator' ? '#4f46e5' : '#64748b' }}>
                                🧮 Profit Calculator
                            </button>
                        </div>

                        {/* Direct Entry Mode */}
                        {pricingMode === 'direct' && (
                            <div style={row}>
                                <div>
                                    <label style={lbl}>MRP (Original Price)</label>
                                    <input type="number" name="mrpPrice" value={formData.mrpPrice} onChange={handleChange} style={inp} min="0" placeholder="₹ 0" />
                                </div>
                                <div>
                                    <label style={lbl}>Selling Price *</label>
                                    <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} required style={inp} min="0" placeholder="₹ 0" />
                                    {formData.sellingPrice > 0 && (
                                        <div style={{ marginTop: 10, padding: '12px 14px', background: '#ecfdf5', borderRadius: 10, border: '1px solid #6ee7b7' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 6 }}>
                                                <span style={{ color: '#047857' }}>Platform Commission ({commission}%)</span>
                                                <span style={{ fontWeight: 700, color: '#047857' }}>₹{((formData.sellingPrice * commission) / 100).toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}>
                                                <span style={{ color: '#065f46', fontWeight: 700 }}>💵 You Will Receive</span>
                                                <span style={{ fontWeight: 800, color: '#065f46' }}>₹{(formData.sellingPrice - (formData.sellingPrice * commission) / 100).toFixed(2)}</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <label style={lbl}>Stock (Qty) *</label>
                                    <input type="number" name="stock" value={formData.stock} onChange={handleChange} required style={inp} min="0" placeholder="0" />
                                    <small style={{ color: Number(formData.stock) > 0 ? '#16a34a' : '#dc2626', fontSize: 12 }}>
                                        {Number(formData.stock) > 0 ? '✅ In Stock' : '❌ Out of Stock'}
                                    </small>
                                </div>
                            </div>
                        )}

                        {/* Profit Calculator Mode */}
                        {pricingMode === 'calculator' && (
                            <div style={{ background: 'linear-gradient(135deg, #f0fdf4, #eff6ff)', borderRadius: 14, padding: 20, border: '1.5px solid #a5f3fc' }}>
                                <div style={{ ...row, marginBottom: 16 }}>
                                    <div>
                                        <label style={{ ...lbl, color: '#065f46' }}>Cost Price (₹)</label>
                                        <small style={{ display: 'block', color: '#6b7280', fontSize: 11, marginBottom: 5 }}>What you spend to make/buy this</small>
                                        <input type="number" value={costPrice} onChange={e => setCostPrice(e.target.value)} style={{ ...inp, borderColor: '#6ee7b7' }} min="0" placeholder="₹ 400" />
                                    </div>
                                    <div>
                                        <label style={{ ...lbl, color: '#065f46' }}>Desired Profit (₹)</label>
                                        <small style={{ display: 'block', color: '#6b7280', fontSize: 11, marginBottom: 5 }}>How much you want to earn</small>
                                        <input type="number" value={desiredProfit} onChange={e => setDesiredProfit(e.target.value)} style={{ ...inp, borderColor: '#6ee7b7' }} min="0" placeholder="₹ 100" />
                                    </div>
                                </div>

                                {recommendedPrice > 0 && (
                                    <div style={{ background: 'white', borderRadius: 12, padding: 18, border: '1.5px solid #6ee7b7', marginBottom: 16 }}>
                                        <div style={{ fontSize: 13, color: '#374151', marginBottom: 12, fontWeight: 600, textAlign: 'center', letterSpacing: '0.3px', textTransform: 'uppercase' }}>📊 Price Breakdown</div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#374151' }}>
                                                <span>Cost Price</span><span style={{ fontWeight: 600 }}>₹{cost.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, color: '#374151' }}>
                                                <span>Your Desired Profit</span><span style={{ fontWeight: 600 }}>₹{profit.toFixed(2)}</span>
                                            </div>
                                            <div style={{ borderTop: '1px dashed #d1d5db', margin: '4px 0' }} />
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, background: '#eff6ff', borderRadius: 8, padding: '8px 12px' }}>
                                                <span style={{ fontWeight: 700, color: '#1e40af' }}>🏷️ Recommended Selling Price</span>
                                                <span style={{ fontWeight: 800, color: '#1e40af', fontSize: 16 }}>₹{recommendedPrice}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#6b7280' }}>
                                                <span>Admin Commission ({commission}%)</span><span style={{ fontWeight: 600 }}>₹{adminCommissionAmt.toFixed(2)}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 15, background: '#ecfdf5', borderRadius: 8, padding: '8px 12px' }}>
                                                <span style={{ fontWeight: 700, color: '#065f46' }}>💵 You Will Receive</span>
                                                <span style={{ fontWeight: 800, color: '#065f46', fontSize: 16 }}>₹{youReceive.toFixed(2)}</span>
                                            </div>
                                        </div>
                                        <button type="button" onClick={applyCalculatedPrice}
                                            style={{ marginTop: 14, width: '100%', padding: '11px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg, #10b981, #059669)', color: 'white', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>
                                            ✅ Use Selling Price ₹{recommendedPrice}
                                        </button>
                                    </div>
                                )}

                                {/* Still need MRP + Stock */}
                                <div style={row}>
                                    <div>
                                        <label style={lbl}>MRP (Original Price)</label>
                                        <input type="number" name="mrpPrice" value={formData.mrpPrice} onChange={handleChange} style={inp} min="0" placeholder="₹ 0" />
                                    </div>
                                    <div>
                                        <label style={lbl}>Selling Price *</label>
                                        <input type="number" name="sellingPrice" value={formData.sellingPrice} onChange={handleChange} required style={{ ...inp, borderColor: formData.sellingPrice ? '#6ee7b7' : '#e2e8f0', fontWeight: formData.sellingPrice ? 700 : 400 }} min="0" placeholder="₹ use calculator above" />
                                    </div>
                                    <div>
                                        <label style={lbl}>Stock (Qty) *</label>
                                        <input type="number" name="stock" value={formData.stock} onChange={handleChange} required style={inp} min="0" placeholder="0" />
                                        <small style={{ color: Number(formData.stock) > 0 ? '#16a34a' : '#dc2626', fontSize: 12 }}>
                                            {Number(formData.stock) > 0 ? '✅ In Stock' : '❌ Out of Stock'}
                                        </small>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 12 }}>
                        <button type="button" onClick={onClose} style={{ flex: 1, padding: '14px', borderRadius: 12, border: '1.5px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>Cancel</button>
                        <button type="submit" disabled={loading} style={{ flex: 2, padding: '14px', borderRadius: 12, border: 'none', background: 'linear-gradient(135deg, #6366f1, #4f46e5)', color: 'white', cursor: loading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, boxShadow: '0 4px 12px rgba(99,102,241,0.3)' }}>
                            {loading ? 'Saving...' : (product ? '✅ Update Product' : '🚀 Add Product')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
