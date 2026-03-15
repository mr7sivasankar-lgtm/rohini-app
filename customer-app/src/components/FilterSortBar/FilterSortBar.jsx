import { useState } from 'react';
import './FilterSortBar.css';

const FilterSortBar = ({ 
    activeSort, 
    onSortChange, 
    activeFilters, 
    onFilterChange, 
    onClearFilters,
    totalResults
}) => {
    const [isSortOpen, setIsSortOpen] = useState(false);
    const [isFilterOpen, setIsFilterOpen] = useState(false);

    // Temp state for filter modal
    const [tempFilters, setTempFilters] = useState(activeFilters);

    const sortOptions = [
        { id: 'newest', label: 'Newest First' },
        { id: 'price_asc', label: 'Price: Low to High' },
        { id: 'price_desc', label: 'Price: High to Low' },
        { id: 'popularity', label: 'Popularity' },
    ];

    const filterOptions = {
        priceRange: [
            { id: '0-500', label: 'Under ₹500', min: 0, max: 500 },
            { id: '500-1000', label: '₹500 - ₹1000', min: 500, max: 1000 },
            { id: '1000-2000', label: '₹1000 - ₹2000', min: 1000, max: 2000 },
            { id: '2000+', label: '₹2000+', min: 2000, max: null }
        ],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        colors: ['Black', 'White', 'Blue', 'Red', 'Green', 'Yellow', 'Pink', 'Purple', 'Grey', 'Brown']
    };

    const handleSortSelect = (sortId) => {
        onSortChange(sortId);
        setIsSortOpen(false);
    };

    const openFilterModal = () => {
        setTempFilters({ ...activeFilters });
        setIsFilterOpen(true);
    };

    const handleFilterApply = () => {
        onFilterChange(tempFilters);
        setIsFilterOpen(false);
    };

    const handleToggleFilter = (key, value) => {
        setTempFilters(prev => {
            const currentArray = prev[key] || [];
            if (currentArray.includes(value)) {
                return { ...prev, [key]: currentArray.filter(v => v !== value) };
            } else {
                return { ...prev, [key]: [...currentArray, value] };
            }
        });
    };

    const handlePriceToggle = (priceId) => {
        setTempFilters(prev => ({
            ...prev,
            priceRange: prev.priceRange === priceId ? '' : priceId
        }));
    };

    const handleClearTemp = () => {
        setTempFilters({ priceRange: '', sizes: [], colors: [], inStock: false });
    };

    // Calculate active filter count
    const activeFilterCount = (activeFilters.priceRange ? 1 : 0) + 
                              (activeFilters.sizes?.length || 0) + 
                              (activeFilters.colors?.length || 0) + 
                              (activeFilters.inStock ? 1 : 0);

    return (
        <div className="filter-sort-wrapper">
            <div className="filter-sort-bar">
                <button className="bar-btn" onClick={() => setIsSortOpen(true)}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <polyline points="19 12 12 19 5 12"></polyline>
                    </svg>
                    Sort {activeSort !== 'newest' && <span className="active-dot"></span>}
                </button>
                <div className="divider"></div>
                <button className="bar-btn" onClick={openFilterModal}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
                    </svg>
                    Filter
                    {activeFilterCount > 0 && <span className="filter-badge">{activeFilterCount}</span>}
                </button>
            </div>

            {/* Sort Bottom Sheet */}
            <div className={`bottom-sheet-overlay ${isSortOpen ? 'open' : ''}`} onClick={() => setIsSortOpen(false)}>
                <div className={`bottom-sheet ${isSortOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
                    <div className="sheet-header">
                        <h3>Sort By</h3>
                        <button className="close-btn" onClick={() => setIsSortOpen(false)}>✕</button>
                    </div>
                    <div className="sheet-content">
                        {sortOptions.map(opt => (
                            <div 
                                key={opt.id} 
                                className={`sort-option ${activeSort === opt.id ? 'selected' : ''}`}
                                onClick={() => handleSortSelect(opt.id)}
                            >
                                <span>{opt.label}</span>
                                {activeSort === opt.id && <span className="check">✓</span>}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Filter Bottom Sheet */}
            <div className={`bottom-sheet-overlay ${isFilterOpen ? 'open' : ''}`} onClick={() => setIsFilterOpen(false)}>
                <div className={`bottom-sheet filter-sheet ${isFilterOpen ? 'open' : ''}`} onClick={e => e.stopPropagation()}>
                    <div className="sheet-header">
                        <h3>Filters</h3>
                        <button className="close-btn" onClick={() => setIsFilterOpen(false)}>✕</button>
                    </div>
                    <div className="sheet-content filter-content">
                        
                        {/* Status */}
                        <div className="filter-group">
                            <h4 className="filter-title">Availability</h4>
                            <label className="toggle-label">
                                <input 
                                    type="checkbox" 
                                    checked={tempFilters.inStock || false}
                                    onChange={(e) => setTempFilters(p => ({ ...p, inStock: e.target.checked }))}
                                />
                                <span>In Stock Only</span>
                            </label>
                        </div>

                        {/* Price Range */}
                        <div className="filter-group">
                            <h4 className="filter-title">Price Range</h4>
                            <div className="pills-grid">
                                {filterOptions.priceRange.map(pr => (
                                    <button 
                                        key={pr.id} 
                                        className={`filter-pill ${tempFilters.priceRange === pr.id ? 'active' : ''}`}
                                        onClick={() => handlePriceToggle(pr.id)}
                                    >
                                        {pr.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Sizes */}
                        <div className="filter-group">
                            <h4 className="filter-title">Sizes</h4>
                            <div className="pills-grid sizes-grid">
                                {filterOptions.sizes.map(size => (
                                    <button 
                                        key={size} 
                                        className={`filter-pill ${(tempFilters.sizes || []).includes(size) ? 'active' : ''}`}
                                        onClick={() => handleToggleFilter('sizes', size)}
                                    >
                                        {size}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Colors */}
                        <div className="filter-group">
                            <h4 className="filter-title">Colors</h4>
                            <div className="pills-grid colors-grid">
                                {filterOptions.colors.map(color => (
                                    <button 
                                        key={color} 
                                        className={`filter-pill ${(tempFilters.colors || []).includes(color) ? 'active' : ''}`}
                                        onClick={() => handleToggleFilter('colors', color)}
                                    >
                                        <span className="color-dot" style={{ backgroundColor: color.toLowerCase() }}></span>
                                        {color}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="sheet-footer-spacer"></div>
                    </div>
                    <div className="sheet-footer">
                        <div className="results-count">
                            {totalResults} Products
                        </div>
                        <div className="action-buttons">
                            <button className="btn-clear" onClick={handleClearTemp}>Clear</button>
                            <button className="btn-apply" onClick={handleFilterApply}>Apply</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FilterSortBar;
