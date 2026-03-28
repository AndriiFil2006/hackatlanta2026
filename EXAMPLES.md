# Market API - Example Usage Guide

This file contains useful curl commands to test the API endpoints.

## 1. Authentication

### Register New User
```bash
curl -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!",
    "display_name": "John Doe"
  }'
```

### Login
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "SecurePassword123!"
  }'
```

Response will include an `access_token` - save this for authenticated requests.

### Get Current User Profile
```bash
curl -X GET http://localhost:8000/users/me \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

## 2. Categories

### List All Categories
```bash
curl -X GET http://localhost:8000/categories
```

### Create Category (Admin Only)
```bash
curl -X POST http://localhost:8000/categories \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "category_name": "Electronics",
    "description": "Electronic devices and gadgets"
  }'
```

## 3. Products

### List Products
```bash
# Basic listing
curl -X GET http://localhost:8000/products

# With pagination
curl -X GET "http://localhost:8000/products?skip=0&limit=10"

# Filter by category
curl -X GET "http://localhost:8000/products?category_id=1"

# Search products
curl -X GET "http://localhost:8000/products?search=laptop"

# Featured products only
curl -X GET "http://localhost:8000/products?featured_only=true"

# Combined
curl -X GET "http://localhost:8000/products?category_id=1&search=phone&limit=20"
```

### Get Product Details
```bash
curl -X GET http://localhost:8000/products/1
```

### Create Product (Admin Only)
```bash
curl -X POST http://localhost:8000/products \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "category_id": 1,
    "product_name": "Laptop Pro",
    "description": "High-performance laptop",
    "price": 999.99,
    "stock_quantity": 50,
    "image_url": "https://example.com/laptop.jpg",
    "is_featured": true
  }'
```

### Update Product (Admin Only)
```bash
curl -X PUT http://localhost:8000/products/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "price": 899.99,
    "stock_quantity": 45,
    "is_featured": false
  }'
```

## 4. Shopping Cart

### Get Your Cart
```bash
curl -X GET http://localhost:8000/cart \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Add Item to Cart
```bash
curl -X POST http://localhost:8000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "product_id": 1,
    "quantity": 2
  }'
```

### Update Cart Item Quantity
```bash
curl -X PUT http://localhost:8000/cart/items/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "quantity": 5
  }'
```

### Remove Item from Cart
```bash
curl -X DELETE http://localhost:8000/cart/items/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## 5. Orders

### Create Order from Cart
```bash
curl -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "shipping_address": "123 Main Street, City, State 12345"
  }'
```

### List Your Orders
```bash
curl -X GET http://localhost:8000/orders \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Get Order Details
```bash
curl -X GET http://localhost:8000/orders/1 \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

### Update Order Status (Admin or Order Owner)
```bash
curl -X PUT http://localhost:8000/orders/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "status": "shipped"
  }'
```

Valid statuses: `pending`, `paid`, `shipped`, `delivered`, `cancelled`

## 6. Reviews

### Create Review
```bash
curl -X POST http://localhost:8000/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  -d '{
    "product_id": 1,
    "rating": 5,
    "comment": "Excellent product, highly recommend!"
  }'
```

### Get Product Reviews
```bash
# Basic
curl -X GET http://localhost:8000/products/1/reviews

# With pagination
curl -X GET "http://localhost:8000/products/1/reviews?skip=0&limit=10"
```

## 7. Promo Codes

### Create Promo Code (Admin Only)
```bash
# Percent discount
curl -X POST http://localhost:8000/promo-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "code": "SAVE10",
    "discount_type": "percent",
    "discount_value": 10,
    "expires_at": "2024-12-31T23:59:59"
  }'

# Fixed amount discount
curl -X POST http://localhost:8000/promo-codes \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "code": "SAVE5",
    "discount_type": "fixed",
    "discount_value": 5,
    "expires_at": "2024-12-31T23:59:59"
  }'
```

### Validate Promo Code
```bash
curl -X GET http://localhost:8000/promo-codes/SAVE10
```

## Tips for Testing

1. **Use Swagger UI for Interactive Testing**
   - Navigate to: http://localhost:8000/docs
   - Click on an endpoint to expand it
   - Click "Try it out"
   - Fill in parameters and click "Execute"

2. **Save Token in Variable (Linux/Mac)**
   ```bash
   TOKEN=$(curl -X POST http://localhost:8000/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "user@example.com", "password": "password"}' \
     | jq -r '.access_token')
   
   # Use token in requests
   curl -H "Authorization: Bearer $TOKEN" http://localhost:8000/users/me
   ```

3. **Pretty Print JSON Responses**
   ```bash
   curl -X GET http://localhost:8000/products | jq .
   ```

4. **Save Response to File**
   ```bash
   curl -X GET http://localhost:8000/products > products.json
   ```

5. **Check Response Headers**
   ```bash
   curl -i -X GET http://localhost:8000/products
   ```

## Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| 401 Unauthorized | Missing or invalid token | Check token in Authorization header |
| 403 Forbidden | Not admin user | Login with admin account |
| 404 Not Found | Resource doesn't exist | Verify the ID is correct |
| 400 Bad Request | Invalid request data | Check JSON format and required fields |
| 500 Internal Server Error | Server error | Check server logs and database connection |

## Workflow Example

```bash
# 1. Register
export TOKEN=$(curl -s -X POST http://localhost:8000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Test123!", "display_name": "Tester"}' \
  | jq -r '.access_token')

# 2. Get user profile
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/users/me | jq .

# 3. Browse products
curl -s http://localhost:8000/products | jq '.[:2]'

# 4. Add to cart
curl -s -X POST http://localhost:8000/cart/items \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"product_id": 1, "quantity": 1}' | jq .

# 5. View cart
curl -s -H "Authorization: Bearer $TOKEN" http://localhost:8000/cart | jq .

# 6. Create order
curl -s -X POST http://localhost:8000/orders \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"shipping_address": "123 Main St"}' | jq .

# 7. Leave review
curl -s -X POST http://localhost:8000/reviews \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"product_id": 1, "rating": 5, "comment": "Great!"}' | jq .
```
