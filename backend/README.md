# Instant Delivery Backend API

Backend API for the Instant Clothing Delivery Platform.

## Features

- ✅ OTP-based authentication
- ✅ Admin password authentication
- ✅ Product management with images
- ✅ Category hierarchy
- ✅ Cart management
- ✅ Wishlist functionality
- ✅ Order placement and tracking
- ✅ Stock management
- ✅ Banner management

## Tech Stack

- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication
- Multer (File uploads)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
   - Copy `.env.example` to `.env`
   - Update MongoDB URI if needed
   - Change JWT secret for production
   - Update admin credentials

3. Start MongoDB (if running locally):
```bash
mongod
```

4. Start server:
```bash
# Development with auto-reload
npm run dev

# Production
npm start
```

Server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/send-otp` - Send OTP to phone
- `POST /api/auth/verify-otp` - Verify OTP and login
- `POST /api/auth/admin-login` - Admin login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/update-profile` - Update profile

### Products
- `GET /api/products` - List products (with filters)
- `GET /api/products/:id` - Get product details
- `POST /api/products` - Create product (Admin)
- `PUT /api/products/:id` - Update product (Admin)
- `DELETE /api/products/:id` - Delete product (Admin)

### Categories
- `GET /api/categories` - List categories
- `POST /api/categories` - Create category (Admin)
- `PUT /api/categories/:id` - Update category (Admin)
- `DELETE /api/categories/:id` - Delete category (Admin)

### Cart
- `GET /api/cart` - Get cart
- `POST /api/cart` - Add to cart
- `PUT /api/cart/:itemId` - Update cart item
- `DELETE /api/cart/:itemId` - Remove from cart

### Wishlist
- `GET /api/wishlist` - Get wishlist
- `POST /api/wishlist` - Add to wishlist
- `DELETE /api/wishlist/:productId` - Remove from wishlist

### Orders
- `POST /api/orders` - Create order
- `GET /api/orders` - Get user orders
- `GET /api/orders/:id` - Get order details
- `GET /api/orders/admin/all` - Get all orders (Admin)
- `PUT /api/orders/admin/:id/status` - Update order status (Admin)

### Banners
- `GET /api/banners` - Get active banners
- `POST /api/banners` - Create banner (Admin)
- `PUT /api/banners/:id` - Update banner (Admin)
- `DELETE /api/banners/:id` - Delete banner (Admin)

## Default Admin Credentials

- Phone: `+919999999999`
- Password: `admin123`

**⚠️ Change these in production!**

## OTP Testing

In development mode, OTP is logged to console. For production, integrate Twilio or MSG91.
