import React, { useState, useEffect, useRef, useCallback } from 'react';
import api, { getImageUrl } from '../utils/api';

/* ─────────────────────────────────────────────────────────────
   Canvas-based Crop Tool
   Aspect ratio fixed to banner dimensions: 375 × 200 (1.875:1)
───────────────────────────────────────────────────────────────*/
const CropTool = ({ imageUrl, onApply, onCancel }) => {
    const ASPECT = 1.875; // 375:200 banner ratio
    const canvasRef = useRef(null);
    const imgRef = useRef(null);
    const [cropBox, setCropBox] = useState(null);
    const [dragging, setDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, bx: 0, by: 0 });

    // Load image into canvas
    useEffect(() => {
        const img = new Image();
        img.onload = () => {
            imgRef.current = img;
            const canvas = canvasRef.current;
            if (!canvas) return;
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            // Initial crop: full width, centered height
            const boxW = img.naturalWidth;
            const boxH = Math.round(boxW / ASPECT);
            const boxY = Math.max(0, Math.round((img.naturalHeight - boxH) / 2));
            setCropBox({ x: 0, y: boxY, w: boxW, h: Math.min(boxH, img.naturalHeight) });
        };
        img.src = imageUrl;
    }, [imageUrl]);

    // Redraw whenever cropBox changes
    useEffect(() => {
        if (!imgRef.current || !cropBox || !canvasRef.current) return;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        const img = imgRef.current;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);

        // Dark overlay outside crop
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        ctx.fillRect(0, 0, canvas.width, cropBox.y);
        ctx.fillRect(0, cropBox.y + cropBox.h, canvas.width, canvas.height - cropBox.y - cropBox.h);
        ctx.fillRect(0, cropBox.y, cropBox.x, cropBox.h);
        ctx.fillRect(cropBox.x + cropBox.w, cropBox.y, canvas.width - cropBox.x - cropBox.w, cropBox.h);

        // Crop border
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 3;
        ctx.setLineDash([]);
        ctx.strokeRect(cropBox.x + 1.5, cropBox.y + 1.5, cropBox.w - 3, cropBox.h - 3);

        // Rule-of-thirds grid
        ctx.strokeStyle = 'rgba(255,255,255,0.5)';
        ctx.lineWidth = 1;
        for (let i = 1; i < 3; i++) {
            ctx.beginPath();
            ctx.moveTo(cropBox.x + (cropBox.w / 3) * i, cropBox.y);
            ctx.lineTo(cropBox.x + (cropBox.w / 3) * i, cropBox.y + cropBox.h);
            ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(cropBox.x, cropBox.y + (cropBox.h / 3) * i);
            ctx.lineTo(cropBox.x + cropBox.w, cropBox.y + (cropBox.h / 3) * i);
            ctx.stroke();
        }

        // Corner handles
        const hs = 12;
        ctx.fillStyle = '#fff';
        [[cropBox.x, cropBox.y], [cropBox.x + cropBox.w - hs, cropBox.y],
         [cropBox.x, cropBox.y + cropBox.h - hs], [cropBox.x + cropBox.w - hs, cropBox.y + cropBox.h - hs]]
            .forEach(([hx, hy]) => ctx.fillRect(hx, hy, hs, hs));
    }, [cropBox]);

    const getCoords = (e, canvas) => {
        const rect = canvas.getBoundingClientRect();
        const sx = canvas.width / rect.width;
        const sy = canvas.height / rect.height;
        const cx = e.touches ? e.touches[0].clientX : e.clientX;
        const cy = e.touches ? e.touches[0].clientY : e.clientY;
        return { x: (cx - rect.left) * sx, y: (cy - rect.top) * sy };
    };

    const onMouseDown = (e) => {
        e.preventDefault();
        if (!cropBox) return;
        const { x, y } = getCoords(e, canvasRef.current);
        if (x >= cropBox.x && x <= cropBox.x + cropBox.w && y >= cropBox.y && y <= cropBox.y + cropBox.h) {
            setDragging(true);
            setDragStart({ x, y, bx: cropBox.x, by: cropBox.y });
        }
    };

    const onMouseMove = useCallback((e) => {
        if (!dragging || !imgRef.current || !cropBox) return;
        e.preventDefault();
        const { x, y } = getCoords(e, canvasRef.current);
        const dx = x - dragStart.x;
        const dy = y - dragStart.y;
        const img = imgRef.current;
        const newX = Math.max(0, Math.min(dragStart.bx + dx, img.naturalWidth - cropBox.w));
        const newY = Math.max(0, Math.min(dragStart.by + dy, img.naturalHeight - cropBox.h));
        setCropBox(prev => ({ ...prev, x: newX, y: newY }));
    }, [dragging, dragStart, cropBox]);

    const onMouseUp = () => setDragging(false);

    const applyCrop = () => {
        if (!imgRef.current || !cropBox) return;
        const out = document.createElement('canvas');
        out.width = cropBox.w;
        out.height = cropBox.h;
        out.getContext('2d').drawImage(imgRef.current, cropBox.x, cropBox.y, cropBox.w, cropBox.h, 0, 0, cropBox.w, cropBox.h);
        out.toBlob(blob => {
            const file = new File([blob], 'cropped-banner.jpg', { type: 'image/jpeg' });
            onApply(file, URL.createObjectURL(blob));
        }, 'image/jpeg', 0.92);
    };

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ background: '#fff', borderRadius: '16px', padding: '24px', maxWidth: '820px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                    <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: '#0f172a' }}>✂️ Crop Banner Image</h3>
                    <span style={{ fontSize: '12px', color: '#64748b', background: '#f1f5f9', padding: '4px 10px', borderRadius: '20px' }}>
                        Ratio: 375 × 200 px (banner size)
                    </span>
                </div>
                <p style={{ margin: '0 0 14px', fontSize: '13px', color: '#64748b' }}>
                    Drag the highlighted area to reposition. The selected region will be your banner.
                </p>
                <canvas
                    ref={canvasRef}
                    style={{ width: '100%', cursor: dragging ? 'grabbing' : 'grab', borderRadius: '8px', border: '1px solid #e2e8f0', touchAction: 'none' }}
                    onMouseDown={onMouseDown}
                    onMouseMove={onMouseMove}
                    onMouseUp={onMouseUp}
                    onMouseLeave={onMouseUp}
                    onTouchStart={onMouseDown}
                    onTouchMove={onMouseMove}
                    onTouchEnd={onMouseUp}
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '16px' }}>
                    <button onClick={onCancel} style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', color: '#475569' }}>
                        Cancel
                    </button>
                    <button onClick={applyCrop} style={{ padding: '10px 24px', background: 'linear-gradient(135deg,#22c55e,#16a34a)', border: 'none', borderRadius: '8px', fontWeight: 700, cursor: 'pointer', color: '#fff' }}>
                        ✔ Apply Crop
                    </button>
                </div>
            </div>
        </div>
    );
};

/* ─────────────────────────────────────────────────────────────
   Mobile Preview Panel
───────────────────────────────────────────────────────────────*/
const MobilePreview = ({ previewUrl, title }) => (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
        <p style={{ margin: 0, fontSize: '12px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>📱 Mobile Preview</p>
        {/* Phone shell */}
        <div style={{
            width: '220px',
            background: '#0f172a',
            borderRadius: '28px',
            padding: '12px 8px',
            boxShadow: '0 20px 60px rgba(0,0,0,0.3), inset 0 0 0 2px #1e293b',
            position: 'relative'
        }}>
            {/* Notch */}
            <div style={{ width: '60px', height: '10px', background: '#1e293b', borderRadius: '10px', margin: '0 auto 8px', position: 'relative', zIndex: 1 }} />
            {/* Screen */}
            <div style={{ background: '#f8fafc', borderRadius: '18px', overflow: 'hidden', minHeight: '360px' }}>
                {/* Status bar */}
                <div style={{ background: '#22c55e', height: '28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px' }}>
                    <span style={{ fontSize: '9px', color: '#fff', fontWeight: 700 }}>📍 Your Location</span>
                    <span style={{ fontSize: '9px', color: '#fff' }}>9:41</span>
                </div>
                {/* Banner slot */}
                <div style={{ margin: '6px 6px', borderRadius: '10px', overflow: 'hidden', height: '100px', background: previewUrl ? 'transparent' : 'linear-gradient(135deg,#e2e8f0,#cbd5e1)', display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                    {previewUrl ? (
                        <>
                            <img src={previewUrl} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            {title && (
                                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(transparent,rgba(0,0,0,0.6))', padding: '6px 8px' }}>
                                    <span style={{ color: '#fff', fontSize: '8px', fontWeight: 700 }}>{title}</span>
                                </div>
                            )}
                        </>
                    ) : (
                        <span style={{ fontSize: '8px', color: '#94a3b8' }}>Banner will appear here</span>
                    )}
                </div>
                {/* Mock categories */}
                <div style={{ padding: '6px 8px' }}>
                    <div style={{ fontSize: '8px', fontWeight: 700, color: '#0f172a', marginBottom: '6px' }}>Categories</div>
                    <div style={{ display: 'flex', gap: '6px', overflowX: 'hidden' }}>
                        {['👖', '👕', '🩳', '👗'].map((e, i) => (
                            <div key={i} style={{ textAlign: 'center', flexShrink: 0 }}>
                                <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px' }}>{e}</div>
                                <div style={{ fontSize: '6px', marginTop: '2px', color: '#64748b' }}>Item {i + 1}</div>
                            </div>
                        ))}
                    </div>
                </div>
                {/* Mock shop cards */}
                <div style={{ padding: '0 8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {[1, 2].map(i => (
                        <div key={i} style={{ background: '#fff', borderRadius: '8px', padding: '6px', display: 'flex', gap: '8px', alignItems: 'center', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                            <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#e2e8f0', flexShrink: 0 }} />
                            <div style={{ flex: 1 }}>
                                <div style={{ height: '5px', background: '#e2e8f0', borderRadius: '4px', marginBottom: '3px', width: '60%' }} />
                                <div style={{ height: '4px', background: '#f1f5f9', borderRadius: '4px', width: '40%' }} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
            {/* Home indicator */}
            <div style={{ width: '40px', height: '4px', background: '#334155', borderRadius: '4px', margin: '10px auto 0' }} />
        </div>
    </div>
);

/* ─────────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────────────*/
const TopRatedShops = () => {
    const [sellers, setSellers] = useState([]);
    const [banners, setBanners] = useState([]);
    const [cities, setCities] = useState([]);
    const [loading, setLoading] = useState(true);

    // Form state
    const [bannerTitle, setBannerTitle] = useState('');
    const [bannerLink, setBannerLink] = useState('');
    const [bannerTargetType, setBannerTargetType] = useState('all');
    const [bannerTargetCity, setBannerTargetCity] = useState('');
    const [bannerTargetPincode, setBannerTargetPincode] = useState('');
    const [bannerImage, setBannerImage] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(null);
    const [uploadingBanner, setUploadingBanner] = useState(false);
    const [showCrop, setShowCrop] = useState(false);
    const [rawPreviewUrl, setRawPreviewUrl] = useState(null); // original for crop

    const fileInputRef = useRef(null);

    const fetchSellersAndBanners = async () => {
        try {
            setLoading(true);
            const [sellersRes, bannersRes, areasRes] = await Promise.all([
                api.get('/sellers/admin/all'),
                api.get('/banners'),
                api.get('/serviceability/areas').catch(() => ({ data: { data: [] } }))
            ]);

            if (sellersRes.data.success) {
                setSellers(sellersRes.data.data.filter(s => s.status === 'Approved'));
            }
            if (bannersRes.data.success) {
                setBanners(bannersRes.data.data);
            }
            // Extract unique city names from serviceable areas
            const areaData = areasRes?.data?.data || areasRes?.data || [];
            if (Array.isArray(areaData)) {
                const cityList = Array.from(new Set(
                    areaData.map(a => a.city || a.name || '').filter(Boolean)
                )).sort();
                setCities(cityList);
            }
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchSellersAndBanners(); }, []);

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const url = URL.createObjectURL(file);
        setBannerImage(file);
        setPreviewUrl(url);
        setRawPreviewUrl(url);
    };

    const handleCropApply = (croppedFile, croppedUrl) => {
        setBannerImage(croppedFile);
        setPreviewUrl(croppedUrl);
        setShowCrop(false);
    };

    const toggleFeatured = async (sellerId, currentStatus) => {
        try {
            const resp = await api.put(`/admin/sellers/${sellerId}/featured`, { is_featured: !currentStatus });
            if (resp.data.success) {
                setSellers(prev => prev.map(s => s._id === sellerId ? { ...s, is_featured: !currentStatus } : s));
            }
        } catch (error) {
            console.error('Error toggling featured status:', error);
            alert('Failed to update featured status.');
        }
    };

    const handleUploadBanner = async (e) => {
        e.preventDefault();
        if (!bannerImage) return alert('Please select an image first.');

        const formData = new FormData();
        formData.append('image', bannerImage);
        if (bannerTitle) formData.append('title', bannerTitle);
        if (bannerLink) formData.append('link', bannerLink);
        formData.append('targetType', bannerTargetType);
        if (bannerTargetType === 'city' && bannerTargetCity) formData.append('targetCity', bannerTargetCity);
        if (bannerTargetType === 'pincode' && bannerTargetPincode) formData.append('targetPincode', bannerTargetPincode);

        try {
            setUploadingBanner(true);
            const res = await api.post('/banners', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
            if (res.data.success) {
                setBanners(prev => [res.data.data, ...prev]);
                setBannerTitle(''); setBannerLink(''); setBannerImage(null);
                setPreviewUrl(null); setRawPreviewUrl(null);
                setBannerTargetType('all'); setBannerTargetCity(''); setBannerTargetPincode('');
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        } catch (error) {
            console.error('Error uploading banner:', error);
            alert('Failed to upload banner');
        } finally {
            setUploadingBanner(false);
        }
    };

    const handleDeleteBanner = async (id) => {
        if (!window.confirm('Are you sure you want to delete this banner?')) return;
        try {
            const res = await api.delete(`/banners/${id}`);
            if (res.data.success) setBanners(prev => prev.filter(b => b._id !== id));
        } catch (error) {
            alert('Failed to delete banner');
        }
    };

    if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading...</div>;

    const featuredShops = sellers.filter(s => s.is_featured);
    const regularShops = sellers.filter(s => !s.is_featured).sort((a, b) => {
        if (b.rating !== a.rating) return b.rating - a.rating;
        return b.numReviews - a.numReviews;
    });

    const targetLabel = (b) => {
        if (!b.targetType || b.targetType === 'all') return { text: '🌐 All Users', color: '#16a34a', bg: '#dcfce7' };
        if (b.targetType === 'city') return { text: `🏙️ City: ${b.targetCity}`, color: '#1d4ed8', bg: '#dbeafe' };
        if (b.targetType === 'pincode') return { text: `📮 PIN: ${b.targetPincode}`, color: '#7c3aed', bg: '#ede9fe' };
    };

    return (
        <div>
            {showCrop && rawPreviewUrl && (
                <CropTool
                    imageUrl={rawPreviewUrl}
                    onApply={handleCropApply}
                    onCancel={() => setShowCrop(false)}
                />
            )}

            <div className="page-header" style={{ marginBottom: '24px' }}>
                <h1>📢 Ad Banners / Advertising</h1>
                <p>Create location-targeted promotional banners for the customer app.</p>
            </div>

            {/* ── Banner Upload Form ──────────────────────────────────── */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>🖼️ Create New Ad Banner</h3>

                <form onSubmit={handleUploadBanner}>
                    <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-start' }}>

                        {/* Left: Form fields */}
                        <div style={{ flex: 1, minWidth: '300px', display: 'flex', flexDirection: 'column', gap: '14px' }}>

                            {/* Row 1: Title + Link */}
                            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                <div style={{ flex: 1, minWidth: '160px' }}>
                                    <label style={labelStyle}>Banner Title (Optional)</label>
                                    <input type="text" className="input" placeholder="e.g. Diwali Sale 🪔" value={bannerTitle} onChange={e => setBannerTitle(e.target.value)} />
                                </div>
                                <div style={{ flex: 1, minWidth: '160px' }}>
                                    <label style={labelStyle}>Link to Shop (Optional)</label>
                                    <select className="input" style={{ height: '40px', background: 'white' }} value={bannerLink} onChange={e => setBannerLink(e.target.value)}>
                                        <option value="">No Link (Display only)</option>
                                        {sellers.map(shop => (
                                            <option key={shop._id} value={`/shop/${shop._id}`}>
                                                {shop.shopName} ({shop.ownerName})
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Row 2: Audience targeting */}
                            <div>
                                <label style={labelStyle}>Show This Ad To</label>
                                <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '4px' }}>
                                    {[
                                        { val: 'all', label: '🌐 All Users' },
                                        { val: 'city', label: '🏙️ Specific City' },
                                        { val: 'pincode', label: '📮 Specific Pincode' }
                                    ].map(opt => (
                                        <button
                                            key={opt.val}
                                            type="button"
                                            onClick={() => { setBannerTargetType(opt.val); setBannerTargetCity(''); setBannerTargetPincode(''); }}
                                            style={{
                                                padding: '8px 14px', borderRadius: '20px', border: '2px solid',
                                                borderColor: bannerTargetType === opt.val ? '#22c55e' : '#e2e8f0',
                                                background: bannerTargetType === opt.val ? '#f0fdf4' : '#fff',
                                                color: bannerTargetType === opt.val ? '#15803d' : '#475569',
                                                fontWeight: 600, fontSize: '13px', cursor: 'pointer', transition: 'all 0.15s'
                                            }}
                                        >{opt.label}</button>
                                    ))}
                                </div>

                                {bannerTargetType === 'city' && (
                                    <div style={{ marginTop: '10px' }}>
                                        <label style={labelStyle}>Select City</label>
                                        {cities.length > 0 ? (
                                            <select className="input" style={{ height: '40px', background: 'white' }} value={bannerTargetCity} onChange={e => setBannerTargetCity(e.target.value)} required>
                                                <option value="">-- Choose a city --</option>
                                                {cities.map(c => <option key={c} value={c}>{c}</option>)}
                                            </select>
                                        ) : (
                                            <input type="text" className="input" placeholder="e.g. Tirupati" value={bannerTargetCity} onChange={e => setBannerTargetCity(e.target.value)} required />
                                        )}
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>Only customers in this city will see the banner.</p>
                                    </div>
                                )}

                                {bannerTargetType === 'pincode' && (
                                    <div style={{ marginTop: '10px' }}>
                                        <label style={labelStyle}>Target Pincode(s)</label>
                                        <input type="text" className="input" placeholder="e.g. 517501, 517502" value={bannerTargetPincode} onChange={e => setBannerTargetPincode(e.target.value)} required />
                                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>Comma-separated for multiple pincodes. Only customers in these areas will see the banner.</p>
                                    </div>
                                )}
                            </div>

                            {/* Row 3: Image upload + crop */}
                            <div>
                                <label style={labelStyle}>Banner Image (Required)</label>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexWrap: 'wrap' }}>
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept="image/*"
                                        className="input"
                                        style={{ flex: 1, minWidth: '160px' }}
                                        onChange={handleImageChange}
                                        required={!bannerImage}
                                    />
                                    {previewUrl && (
                                        <button
                                            type="button"
                                            onClick={() => setShowCrop(true)}
                                            style={{ padding: '8px 14px', background: '#f1f5f9', border: '1.5px solid #e2e8f0', borderRadius: '8px', fontWeight: 600, fontSize: '13px', cursor: 'pointer', color: '#475569', whiteSpace: 'nowrap' }}
                                        >
                                            ✂️ Crop
                                        </button>
                                    )}
                                </div>
                                <p style={{ fontSize: '11px', color: '#94a3b8', margin: '4px 0 0' }}>Recommended: 750 × 400 px (16:8.5). Use the Crop tool to adjust framing.</p>
                            </div>

                            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                <button type="submit" disabled={uploadingBanner} className="btn btn-primary" style={{ height: '44px', padding: '0 28px', fontSize: '14px' }}>
                                    {uploadingBanner ? '⏳ Uploading...' : '🚀 Publish Banner'}
                                </button>
                            </div>
                        </div>

                        {/* Right: Mobile Preview */}
                        <div style={{ flexShrink: 0 }}>
                            <MobilePreview previewUrl={previewUrl} title={bannerTitle} />
                        </div>
                    </div>
                </form>
            </div>

            {/* ── Existing Banners ───────────────────────────────────── */}
            <div className="card" style={{ marginBottom: '24px' }}>
                <h3 style={{ margin: '0 0 16px 0', color: '#1e293b' }}>📋 Published Banners</h3>
                {banners.length > 0 ? (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '16px' }}>
                        {banners.map(banner => {
                            const linkedSeller = sellers.find(s => `/shop/${s._id}` === banner.link);
                            const tl = targetLabel(banner);
                            return (
                                <div key={banner._id} style={{ borderRadius: '14px', overflow: 'hidden', border: '1px solid #e2e8f0', background: '#fff', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' }}>
                                    <img
                                        src={getImageUrl(banner.image)}
                                        alt={banner.title || 'Banner'}
                                        style={{ width: '100%', height: '130px', objectFit: 'cover', display: 'block' }}
                                        onError={e => { e.target.style.background = '#f1f5f9'; e.target.alt = 'Image error'; }}
                                    />
                                    <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                            <span style={{ fontWeight: 700, fontSize: '14px', color: '#0f172a' }}>{banner.title || 'Untitled Banner'}</span>
                                            <button onClick={() => handleDeleteBanner(banner._id)} style={{ background: '#fee2e2', color: '#ef4444', border: 'none', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', flexShrink: 0, marginLeft: '8px' }}>Delete</button>
                                        </div>
                                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px', fontWeight: 600, color: tl.color, background: tl.bg, padding: '3px 10px', borderRadius: '20px', alignSelf: 'flex-start' }}>
                                            {tl.text}
                                        </span>
                                        {banner.link && (
                                            <div style={{ fontSize: '12px', color: '#2563eb', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                <span>🔗</span>
                                                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {linkedSeller ? `→ ${linkedSeller.shopName}` : banner.link}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '14px', background: '#f8fafc', borderRadius: '12px', border: '2px dashed #e2e8f0' }}>
                        📭 No banners published yet. Create your first ad above!
                    </div>
                )}
            </div>

            {/* ── Featured Shops Table ───────────────────────────────── */}
            <div className="card" style={{ marginBottom: '24px', background: '#f8fafc', borderLeft: '4px solid #3b82f6' }}>
                <h3 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>⭐ Featured Shops (Slider)</h3>
                <p style={{ margin: 0, color: '#475569', fontSize: '14px', lineHeight: '1.5' }}>
                    Shops with <strong>Featured</strong> enabled appear in the customer app's shop slider first.
                    Remaining slots are filled by shops with <b>Rating ≥ 4.0</b> and <b>Reviews ≥ 5</b>.
                </p>
            </div>

            <div className="card">
                <div className="table-responsive">
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Shop Name</th>
                                <th>Rating</th>
                                <th>Reviews</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {featuredShops.map(shop => (
                                <tr key={shop._id} style={{ background: '#f0fdf4' }}>
                                    <td>
                                        <div style={{ fontWeight: 600, color: '#166534' }}>{shop.shopName}</div>
                                        <div style={{ fontSize: '12px', color: '#6b7280' }}>{shop.ownerName} • {shop.phone}</div>
                                    </td>
                                    <td><span style={{ color: '#fbbf24' }}>★</span> <strong>{shop.rating?.toFixed(1) || '0.0'}</strong></td>
                                    <td><span style={{ fontWeight: 500, color: '#475569' }}>{shop.numReviews || 0}</span></td>
                                    <td><span style={{ display: 'inline-block', padding: '4px 10px', background: '#dcfce7', color: '#166534', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>Featured ⭐</span></td>
                                    <td>
                                        <select value="Select Action" onChange={e => { if (e.target.value === 'remove') toggleFeatured(shop._id, shop.is_featured); e.target.value = 'Select Action'; }} style={selectStyle}>
                                            <option value="Select Action" disabled hidden>Select Action</option>
                                            <option value="remove">Remove from Featured</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                            {regularShops.map(shop => {
                                const isAuto = shop.rating >= 4.0 && shop.numReviews >= 5;
                                return (
                                    <tr key={shop._id}>
                                        <td>
                                            <div style={{ fontWeight: 500 }}>{shop.shopName}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280' }}>{shop.ownerName} • {shop.phone}</div>
                                        </td>
                                        <td><span style={{ color: '#fbbf24' }}>★</span> <strong style={{ color: shop.rating >= 4.0 ? '#16a34a' : '#374151' }}>{shop.rating?.toFixed(1) || '0.0'}</strong></td>
                                        <td><span style={{ fontWeight: 500, color: '#475569' }}>{shop.numReviews || 0}</span></td>
                                        <td>
                                            {isAuto
                                                ? <span style={{ display: 'inline-block', padding: '4px 10px', background: '#f3f4f6', color: '#4b5563', borderRadius: '20px', fontSize: '12px', fontWeight: 500 }}>Auto Top-Rated</span>
                                                : <span style={{ color: '#9ca3af', fontSize: '12px' }}>Normal</span>
                                            }
                                        </td>
                                        <td>
                                            <select value="Select Action" onChange={e => { if (e.target.value === 'add') toggleFeatured(shop._id, shop.is_featured); e.target.value = 'Select Action'; }} style={selectStyle}>
                                                <option value="Select Action" disabled hidden>Select Action</option>
                                                <option value="add">Add to Featured</option>
                                            </select>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

const labelStyle = { display: 'block', marginBottom: '5px', fontSize: '12px', fontWeight: 600, color: '#475569', textTransform: 'uppercase', letterSpacing: '0.3px' };
const selectStyle = { padding: '6px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: 'white', fontWeight: 500, fontSize: '13px', color: '#334155', width: '100%' };

export default TopRatedShops;
