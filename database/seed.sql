-- Optional demo data for JackpotTech (run after schema.sql).
-- Users: register via the app (/auth/register) so passwords are hashed correctly.
-- To grant admin: UPDATE users SET is_admin = TRUE WHERE email = 'you@example.com';

INSERT INTO categories (category_name, description) VALUES
  ('Laptops', 'Portable power for high rollers'),
  ('Phones', 'Mobile devices'),
  ('Audio', 'Headphones, speakers, sound'),
  ('Gaming', 'GPUs, consoles, gear')
ON CONFLICT (category_name) DO NOTHING;

INSERT INTO products (category_id, product_name, description, price, stock_quantity, image_url, is_featured, is_active)
SELECT c.category_id, v.product_name, v.description, v.price, v.stock_quantity, v.image_url, v.is_featured, v.is_active
FROM (VALUES
  ('Laptops', 'MacBook Pro 16" M4 Max', 'Apple silicon workstation', 2799.00, 8, NULL, TRUE, TRUE),
  ('Laptops', 'Dell XPS 15', 'Creator laptop', 1599.00, 14, NULL, FALSE, TRUE),
  ('Phones', 'Pixel 10 Pro', 'Flagship Android', 999.00, 22, NULL, TRUE, TRUE),
  ('Phones', 'iPhone 17 Pro', 'Pro camera system', 1199.00, 18, NULL, TRUE, TRUE),
  ('Audio', 'Sony WH-1000XM6', 'Flagship noise cancelling', 399.00, 40, NULL, FALSE, TRUE),
  ('Gaming', 'GeForce RTX 5090', '4K gaming GPU', 1999.00, 3, NULL, TRUE, TRUE)
) AS v(cat_name, product_name, description, price, stock_quantity, image_url, is_featured, is_active)
JOIN categories c ON c.category_name = v.cat_name
WHERE NOT EXISTS (
  SELECT 1 FROM products p WHERE p.product_name = v.product_name
);

INSERT INTO promo_codes (code, discount_type, discount_value, is_active, expires_at) VALUES
  ('WELCOME10', 'percent', 10, TRUE, NULL),
  ('SAVE50', 'fixed', 50, TRUE, NULL)
ON CONFLICT (code) DO NOTHING;
