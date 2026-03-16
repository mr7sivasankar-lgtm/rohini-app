import { useState } from 'react';
import api from '../utils/api';

const ProductModal = ({ onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        price: '',
        stock: '',
        category: '', // Would normally be fetched from API
        subcategory: '',
        brand: '',
        gender: 'Unisex',
    });
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleImageChange = (e) => {
        setImages([...e.target.files]);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        const data = new FormData();
        Object.keys(formData).forEach(key => data.append(key, formData[key]));
        images.forEach(img => data.append('images', img));

        // We normally assign the product to the logged in seller ID on the backend.
        try {
            const res = await api.post('/products', data, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            if (res.data.success) {
                onSuccess();
            }
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add product');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div className="modal-content" style={{ background: 'white', padding: '30px', borderRadius: '16px', width: '100%', maxWidth: '600px', maxHeight: '90vh', overflowY: 'auto' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <h2 style={{ margin: 0 }}>Add New Product</h2>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
                </div>

                <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '16px' }}>
                    <div className="form-group">
                        <label>Product Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} required />
                    </div>
                    
                    <div className="form-group">
                        <label>Description</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="3" required />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label>Price (₹)</label>
                            <input type="number" name="price" value={formData.price} onChange={handleChange} required />
                        </div>
                        <div className="form-group">
                            <label>Stock Quantity</label>
                            <input type="number" name="stock" value={formData.stock} onChange={handleChange} required />
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                        <div className="form-group">
                            <label>Brand</label>
                            <input type="text" name="brand" value={formData.brand} onChange={handleChange} />
                        </div>
                        <div className="form-group">
                            <label>Gender</label>
                            <select name="gender" value={formData.gender} onChange={handleChange} style={{ padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                                <option value="Men">Men</option>
                                <option value="Women">Women</option>
                                <option value="Kids">Kids</option>
                                <option value="Unisex">Unisex</option>
                            </select>
                        </div>
                    </div>

                    <div className="form-group">
                        <label>Product Images</label>
                        <input type="file" multiple accept="image/*" onChange={handleImageChange} required />
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <button type="button" className="btn-secondary" onClick={onClose} style={{ flex: 1 }}>Cancel</button>
                        <button type="submit" className="btn-primary" disabled={loading} style={{ flex: 1 }}>
                            {loading ? 'Adding...' : 'Add Product'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductModal;
