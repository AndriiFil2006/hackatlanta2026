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


INSERT INTO products(category_id, product_name, description, price, stock_quantity, image_url)
VALUES (
      (SELECT category_id FROM categories WHERE category_name = 'GPU'),
      'Swift AMD Radeon RX 9070XT',
      'XFX - Swift AMD Radeon RX 9070XT 16GB GDDR6 PCI Express 5.0 Gaming Graphics Card - Black',
      720,
      40,
      'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/548d6904-74fc-41d5-973b-224d5948e307.jpg;maxHeight=1920;maxWidth=900?format=webp'),
((SELECT category_id FROM categories WHERE category_name = 'CPU'),
      'Intel - Core i9-14900K',
      'Intel - Core i9-14900K 14th Gen 24-Core 32-Thread - 4.4GHz (6.0GHz Turbo) Socket LGA 1700 Unlocked Desktop Processor - Multi',
      500,
      20,
      'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6560/6560418_sd.jpg;maxHeight=1920;maxWidth=900?format=webp'),
((SELECT category_id FROM categories WHERE category_name = 'CPU'),
      'Intel - Core Ultra 9 285K',
      'Intel - Core Ultra 9 285K 24-Cores 24-Threads - 4.6GHz (5.7 GHz Turbo) Socket LGA 1851 Unlocked Desktop Processor - Multi',
      600,
      15,
      'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/0224860a-6519-429e-b610-38285cc3d33f.jpg;maxHeight=1920;maxWidth=900?format=webp')
((SELECT category_id FROM categories WHERE category_name = 'CPU'),
      'Intel - Core i9-14900K',
      'Intel - Core i9-14900K 14th Gen 24-Core 32-Thread - 4.4GHz (6.0GHz Turbo) Socket LGA 1700 Unlocked Desktop Processor - Multi',
      645,
      15,
      'https://pisces.bbystatic.com/image2/BestBuy_US/images/products/6560/6560418_sd.jpg;maxHeight=1920;maxWidth=900?format=webp');