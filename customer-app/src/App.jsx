import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import SplashScreen from './components/SplashScreen/SplashScreen';
import { App as CapApp } from '@capacitor/app';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { FavoritesProvider } from './contexts/FavoritesContext';
import { LocationProvider } from './contexts/LocationContext';
import ErrorBoundary from './components/ErrorBoundary';

// Components
import BottomNav from './components/BottomNav';

// Pages
import Login from './pages/Auth/Login';
import Home from './pages/Home/Home';
import Search from './pages/Search/Search';
import Categories from './pages/Categories/Categories';
import CategoryProducts from './pages/CategoryProducts/CategoryProducts';
import ProductDetail from './pages/Products/ProductDetail';
import Cart from './pages/Cart/Cart';
import Checkout from './pages/Checkout/Checkout';
import Profile from './pages/Profile/Profile';
import OrderHistory from './pages/Orders/OrderHistory';
import OrderTracking from './pages/Orders/OrderTracking';
import OrderSuccess from './pages/Orders/OrderSuccess';
import Addresses from './pages/Addresses/Addresses';
import AddressForm from './pages/Addresses/AddressForm';
import EditProfile from './pages/EditProfile/EditProfile';
import Wishlist from './pages/Wishlist/Wishlist';
import Favorites from './pages/Favorites/Favorites';
import ShopProfile from './pages/ShopProfile/ShopProfile';

// Protected Route Component
import { useAuth } from './contexts/AuthContext';

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
      </div>
    );
  }

  return isAuthenticated ? children : <Navigate to="/login" />;
};

const AppRoutes = () => {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Android hardware back button
  useEffect(() => {
    const handler = CapApp.addListener('backButton', () => {
      const homePaths = ['/', '/home'];
      if (homePaths.includes(location.pathname)) {
        // On home page — exit app
        CapApp.exitApp();
      } else {
        // Navigate back
        navigate(-1);
      }
    });
    return () => { handler.then(h => h.remove()); };
  }, [location.pathname, navigate]);

  return (
    <>
      <Routes>
        <Route path="/login" element={
          isAuthenticated ? <Navigate to="/home" /> : <Login />
        } />

        <Route path="/home" element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } />

        <Route path="/search" element={
          <ProtectedRoute>
            <Search />
          </ProtectedRoute>
        } />

        <Route path="/categories" element={
          <ProtectedRoute>
            <Categories />
          </ProtectedRoute>
        } />

        <Route path="/category/:categoryId" element={
          <ProtectedRoute>
            <CategoryProducts />
          </ProtectedRoute>
        } />

        <Route path="/product/:id" element={
          <ProtectedRoute>
            <ProductDetail />
          </ProtectedRoute>
        } />

        <Route path="/shop/:id" element={
          <ProtectedRoute>
            <ShopProfile />
          </ProtectedRoute>
        } />

        <Route path="/cart" element={
          <ProtectedRoute>
            <Cart />
          </ProtectedRoute>
        } />

        <Route path="/checkout" element={
          <ProtectedRoute>
            <Checkout />
          </ProtectedRoute>
        } />

        <Route path="/profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />

        <Route path="/orders" element={
          <ProtectedRoute>
            <OrderHistory />
          </ProtectedRoute>
        } />

        <Route path="/tracking/:orderId" element={
          <ProtectedRoute>
            <OrderTracking />
          </ProtectedRoute>
        } />

        <Route path="/order-success/:orderId" element={
          <ProtectedRoute>
            <OrderSuccess />
          </ProtectedRoute>
        } />

        <Route path="/addresses" element={
          <ProtectedRoute>
            <Addresses />
          </ProtectedRoute>
        } />

        <Route path="/addresses/new" element={
          <ProtectedRoute>
            <AddressForm />
          </ProtectedRoute>
        } />

        <Route path="/addresses/edit/:id" element={
          <ProtectedRoute>
            <AddressForm />
          </ProtectedRoute>
        } />

        <Route path="/edit-profile" element={
          <ProtectedRoute>
            <EditProfile />
          </ProtectedRoute>
        } />

        <Route path="/wishlist" element={
          <ProtectedRoute>
            <Wishlist />
          </ProtectedRoute>
        } />

        <Route path="/favorites" element={
          <ProtectedRoute>
            <Favorites />
          </ProtectedRoute>
        } />

        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>

      {/* Hide BottomNav on address form pages — they have their own fixed bottom bar */}
      {isAuthenticated && !location.pathname.startsWith('/addresses/new') && !location.pathname.startsWith('/addresses/edit') && <BottomNav />}
    </>
  );
};

function App() {
  const [showSplash, setShowSplash] = useState(() => !sessionStorage.getItem('splashShown'));


  return (
    <ErrorBoundary>
      {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
            <CartProvider>
              <WishlistProvider>
                <FavoritesProvider>
                  <div className="app-container">
                    <AppRoutes />
                  </div>
                </FavoritesProvider>
              </WishlistProvider>
            </CartProvider>
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
