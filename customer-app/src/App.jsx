import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import { WishlistProvider } from './contexts/WishlistContext';
import { LocationProvider } from './contexts/LocationContext';
import ErrorBoundary from './components/ErrorBoundary';
import LocationGate from './components/LocationGate';

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

        <Route path="/" element={<Navigate to="/home" />} />
        <Route path="*" element={<Navigate to="/home" />} />
      </Routes>

      {isAuthenticated && <BottomNav />}
    </>
  );
};

function App() {
  return (
    <ErrorBoundary>
      <BrowserRouter>
        <AuthProvider>
          <LocationProvider>
            <LocationGate>
              <CartProvider>
                <WishlistProvider>
                  <div className="app-container">
                    <AppRoutes />
                  </div>
                </WishlistProvider>
              </CartProvider>
            </LocationGate>
          </LocationProvider>
        </AuthProvider>
      </BrowserRouter>
    </ErrorBoundary>
  );
}

export default App;
