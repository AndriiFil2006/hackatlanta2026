# API guide

FastAPI exposes Swagger UI at `http://127.0.0.1:8000/docs` during development. All application
endpoints are under `/api`. Operational health endpoints are under `/health`.

| Area | Endpoints |
| --- | --- |
| Accounts | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/users/me` |
| Catalog | `GET /api/categories`, `GET /api/products`, `GET /api/products/{id}` |
| Reviews | `GET /api/products/{id}/reviews`, `POST /api/reviews`, `PATCH /api/reviews/{id}` |
| Bag | `GET /api/cart`, `POST /api/cart/items`, `PUT /api/cart/items/{id}`, `DELETE /api/cart/items/{id}` |
| Checkout | `GET /api/promo-codes/{code}`, `POST /api/orders`, `GET /api/orders` |
| Admin | `GET/POST /api/admin/products`, `PUT /api/admin/products/{id}`, `POST /api/admin/categories`, `GET /api/admin/orders`, `PUT /api/admin/orders/{id}` |
| Operations | `GET /health/live`, `GET /health/ready` |

Authenticated routes require `Authorization: Bearer <access_token>`. Admin routes additionally
check the user's current database role on every request. Registration cannot assign an admin role.
Passwords are bcrypt hashed; login JWTs use a user ID subject, issuer, issued-at time, and expiry.

Catalog responses contain `{items, total, page, page_size}`. Query parameters: `search`,
`category_id`, `in_stock`, `featured_only`, `sort`, `page`, `page_size`. Sort options:
`featured`, `newest`, `price_asc`, `price_desc`, `name`. Page sizes are limited to 100.
Order history returns 20 entries per `page`. Admin inventory returns 100 entries per `page`.
Public reviews return the latest 100 reviews per product.

Money is serialized as decimal strings. Do not use browser-supplied prices to determine totals.
Cart responses include current product information, subtotal, shipping, and total. Checkout
rechecks availability and prices; a cart is not a stock reservation.

Example registration:

```http
POST /api/auth/register
Content-Type: application/json

{"email":"alex@example.com","password":"example-password-123","display_name":"Alex"}
```

Example cart addition:

```http
POST /api/cart/items
Authorization: Bearer <token>
Content-Type: application/json

{"product_id":1,"quantity":1}
```

Example checkout (reuse the same key when retrying the same attempt):

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json
Idempotency-Key: b98cf698-9b4d-4f7e-9b7f-99bdcf07ecf5

{"shipping_address":"123 Example Street, Sample City, NY 10001","promo_code":"WELCOME10"}
```

`PUT /api/admin/products/{id}` replaces the editable product fields; submit `product_name`,
`price`, `stock_quantity`, `description`, `category_id`, `image_url`, `is_featured`, and
`is_active`. Hiding a product keeps order snapshots and database history intact.

Invalid inputs return 422, missing authentication 401, insufficient privileges 403, missing
resources 404, conflicting stock/duplicates/transitions 409. Error bodies use FastAPI's
`detail` field. Correlate all responses with their `X-Request-ID` header.

Product responses include `source_url` (manufacturer page), `average_rating` (customer reviews
only, or null), `review_count` (customers only), and `demo_review_count`. Review responses include
`is_demo`. The seed command creates labeled fictional fixtures; clients cannot choose this flag
when posting a review. Customer reviews require 5–2000 characters of text and a 1–5 rating.

Review editing requires authentication and ownership. Send `rating` (1–5) and `comment`
(5–2000 characters) to `PATCH /api/reviews/{id}`. Product, author, and demo status cannot
be changed. Saving updates the existing review and its contribution to customer ratings.
