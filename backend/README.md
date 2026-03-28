# Market Backend API

A comprehensive FastAPI-based backend for a marketplace application featuring user authentication, product management, shopping cart, order processing, reviews, and promotional codes.

## Features

- **User Management**: Registration, login, profile management
- **Authentication**: JWT token-based authentication
- **Product Catalog**: Browse, search, and filter products by category
- **Shopping Cart**: Add/remove items, manage quantities
- **Orders**: Create orders from cart, track order status
- **Reviews**: Rate and review products
- **Promo Codes**: Apply discount codes to orders
- **Admin Functions**: Manage products, categories, and promo codes

## Technology Stack

- **Framework**: FastAPI
- **Database**: PostgreSQL
- **ORM**: SQLAlchemy
- **Authentication**: JWT (python-jose)
- **Password Hashing**: bcrypt (passlib)
- **Server**: Uvicorn

## Prerequisites

- Python 3.8+
- PostgreSQL 12+
- pip (Python package manager)

## Installation

1. **Clone the repository**
   ```bash
   cd backend
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   ```
   
   On Windows:
   ```bash
   venv\Scripts\activate
   ```
   
   On macOS/Linux:
   ```bash
   source venv/bin/activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```
   DATABASE_URL=postgresql://user:password@localhost:5432/market_db
   SECRET_KEY=your-super-secret-key-change-this
   ```

5. **Initialize the database**
   ```bash
   # Run the SQL schema scripts
   psql -U postgres -d market_db -f ../database/schema.sql
   psql -U postgres -d market_db -f ../database/seed.sql
   ```

6. **Run the server**
   ```bash
   uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
   ```

   The API will be available at `http://localhost:8000`

## API Documentation

### Interactive Documentation
- **Swagger UI**: `http://localhost:8000/docs`
- **ReDoc**: `http://localhost:8000/redoc`

### Endpoints

#### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login and get access token

#### User
- `GET /users/me` - Get current user profile (requires auth)

#### Categories
- `GET /categories` - List all categories
- `POST /categories` - Create category (admin only)

#### Products
- `GET /products` - List products with filtering and pagination
  - Query params: `skip`, `limit`, `category_id`, `search`, `featured_only`
- `GET /products/{product_id}` - Get product details
- `POST /products` - Create product (admin only)
- `PUT /products/{product_id}` - Update product (admin only)

#### Cart
- `GET /cart` - Get user's cart (requires auth)
- `POST /cart/items` - Add item to cart (requires auth)
- `PUT /cart/items/{cart_item_id}` - Update cart item quantity (requires auth)
- `DELETE /cart/items/{cart_item_id}` - Remove item from cart (requires auth)

#### Orders
- `POST /orders` - Create order from cart (requires auth)
- `GET /orders` - List user's orders (requires auth)
- `GET /orders/{order_id}` - Get order details (requires auth)
- `PUT /orders/{order_id}` - Update order status (admin or owner)

#### Reviews
- `POST /reviews` - Create product review (requires auth)
- `GET /products/{product_id}/reviews` - Get product reviews

#### Promo Codes
- `POST /promo-codes` - Create promo code (admin only)
- `GET /promo-codes/{code}` - Validate/get promo code details

## Request/Response Examples

### Register
```bash
POST /auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securepass123",
  "display_name": "John Doe"
}

Response:
{
  "access_token": "eyJhbGciOiJIUzI1NiIs...",
  "token_type": "bearer"
}
```

### Add Product to Cart
```bash
POST /cart/items
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "product_id": 1,
  "quantity": 2
}
```

### Create Order
```bash
POST /orders
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "shipping_address": "123 Main St, City, State 12345"
}
```

### Create Review
```bash
POST /reviews
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "product_id": 1,
  "rating": 5,
  "comment": "Great product!"
}
```

## Database Schema

The database includes the following main tables:
- `users` - User accounts
- `categories` - Product categories
- `products` - Product listings
- `carts` - Shopping carts
- `cart_items` - Items in shopping carts
- `orders` - Customer orders
- `order_items` - Items in orders
- `reviews` - Product reviews
- `promo_codes` - Discount codes
- `order_promos` - Applied promo codes to orders

## Development

### Running Tests
```bash
pytest
```

### Code Quality
The project uses:
- Black for code formatting
- Flake8 for linting
- MyPy for type checking

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens expire after 30 minutes
- Admin endpoints are protected (check `is_admin` flag)
- CORS is configured for frontend communication
- SQL injection is prevented through SQLAlchemy ORM

## Deployment

For production deployment:

1. Set `DEBUG=False` in `.env`
2. Use a strong `SECRET_KEY`
3. Configure HTTPS/SSL
4. Use a production ASGI server like Gunicorn:
   ```bash
   gunicorn app.main:app -w 4 -k uvicorn.workers.UvicornWorker
   ```
5. Set up a reverse proxy (Nginx/Apache)
6. Configure environment variables securely

## Troubleshooting

### Database Connection Error
- Verify PostgreSQL is running
- Check `DATABASE_URL` in `.env`
- Ensure the database exists

### JWT Token Error
- Token may have expired (30-minute expiration)
- Verify `SECRET_KEY` is set
- Re-login to get a new token

## Future Enhancements

- [ ] Email verification
- [ ] Password reset functionality
- [ ] Payment gateway integration
- [ ] Shipping rate calculation
- [ ] Inventory notifications
- [ ] Advanced analytics
- [ ] Recommendation engine

## License

This project is part of HackATL 2026.

## Support

For issues or questions, please create an issue in the repository.
