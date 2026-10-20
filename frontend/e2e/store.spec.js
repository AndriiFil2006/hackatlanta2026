import { expect, test } from '@playwright/test'

async function signIn(page, email, password) {
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Email address').fill(email)
  await dialog.getByLabel('Password', { exact: true }).fill(password)
  await dialog.locator('form').getByRole('button', { name: 'Sign in', exact: true }).click()
  await expect(dialog).not.toBeVisible()
}

test('browse, search, filter, and inspect a product with keyboard-accessible dialogs', async ({
  page,
}) => {
  const errors = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.locator('.product-card')).toHaveCount(8)
  await page.screenshot({ path: 'test-results/jackpot-tech-desktop.png', fullPage: true })
  await page.getByRole('searchbox', { name: 'Search products' }).fill('Sony WH-1000XM5')
  await expect(page.locator('.product-card')).toHaveCount(1)
  await page.getByRole('button', { name: 'View Sony WH-1000XM5', exact: true }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(
    page.getByRole('dialog').getByRole('heading', { name: 'Sony WH-1000XM5', exact: true }),
  ).toBeVisible()
  await expect(
    page.getByRole('dialog').getByText('No customer reviews yet.', { exact: false }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await page.getByRole('searchbox').fill('does not exist')
  await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible()
  await page.getByRole('button', { name: 'Clear filters' }).click()
  await page.getByRole('button', { name: 'Workspace', exact: true }).click()
  await expect(page.locator('.product-card')).toHaveCount(3)
  expect(errors).toEqual([])
})

test('create an account, manage a persistent bag, check out, and see the order', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Create account', exact: true }).click()
  await dialog.getByLabel('Your name').fill('Browser Shopper')
  await dialog.getByLabel('Email address').fill(`shopper-${Date.now()}@example.com`)
  await dialog.getByLabel('Password', { exact: true }).fill('browser-test-password')
  await dialog.locator('form').getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  const card = page
    .locator('.product-card')
    .filter({ has: page.getByRole('button', { name: 'Sony WH-1000XM5', exact: true }) })
  await card.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.locator('.bag-count')).toHaveText('1')
  await page.reload()
  await expect(page.locator('.bag-count')).toHaveText('1')
  await page.getByRole('button', { name: 'Bag, 1 item' }).click()
  await expect(dialog.getByText('Sony WH-1000XM5', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Increase Sony WH-1000XM5 quantity' }).click()
  await expect(dialog.locator('.quantity-control span')).toHaveText('2')
  await dialog.getByRole('button', { name: 'Continue to checkout' }).click()
  await dialog.getByLabel('Shipping address').fill('123 Example Street, Sample City, NY 10001')
  await dialog.getByLabel('Have a promo code?').fill('WELCOME10')
  await dialog.getByRole('button', { name: 'Apply', exact: true }).click()
  await expect(dialog.getByText('WELCOME10 applied')).toBeVisible()
  await dialog.getByRole('button', { name: 'Place demo order' }).click()
  await expect(dialog.getByRole('heading', { name: 'Order placed' })).toBeVisible()
  await expect(dialog.getByText('$539.98', { exact: false })).toBeVisible()
  await dialog.getByRole('button', { name: 'View your orders' }).click()
  await expect(dialog.locator('.order-card')).toHaveCount(1)
  await expect(dialog.getByText('pending', { exact: true })).toBeVisible()
  await expect(dialog.locator('.order-line')).toContainText('Sony WH-1000XM5')
  await expect(page.locator('.bag-count')).toHaveText('0')
})

test('admin can adjust inventory, create a product, and process an order', async ({
  page,
  request,
}) => {
  const registered = await request.post('http://127.0.0.1:18000/api/auth/register', {
    data: {
      email: `fulfillment-${Date.now()}@example.com`,
      password: 'browser-test-password',
      display_name: 'Test Order',
    },
  })
  const { access_token } = await registered.json()
  const headers = { Authorization: `Bearer ${access_token}` }
  await request.post('http://127.0.0.1:18000/api/cart/items', {
    headers,
    data: { product_id: 1, quantity: 1 },
  })
  const orderResponse = await request.post('http://127.0.0.1:18000/api/orders', {
    headers: { ...headers, 'Idempotency-Key': `browser-order-${Date.now()}` },
    data: { shipping_address: '123 Example Street, Sample City, NY 10001' },
  })
  const order = await orderResponse.json()
  expect(orderResponse.status()).toBe(201)
  await page.goto('/')
  await signIn(page, 'admin@example.com', 'browser-test-password')
  await page.getByRole('button', { name: 'Manage store', exact: true }).click()
  const row = page.getByRole('row').filter({ hasText: 'Sony WH-1000XM5' }).first()
  await row.getByRole('button', { name: 'Edit product' }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByLabel('Stock quantity').fill('50')
  await dialog.getByRole('button', { name: 'Save product' }).click()
  await expect(row).toContainText('50 units')
  await page.getByRole('button', { name: 'New product' }).click()
  await dialog.getByLabel('Product name').fill('Browser Test Charger')
  await dialog.getByLabel('Price (USD)').fill('39')
  await dialog.getByLabel('Stock quantity').fill('12')
  await dialog
    .getByRole('combobox', { name: 'Category', exact: true })
    .selectOption({ label: 'Components' })
  await dialog.getByRole('button', { name: 'Save product' }).click()
  await expect(page.getByRole('row').filter({ hasText: 'Browser Test Charger' })).toContainText(
    '12 units',
  )
  await expect(
    page
      .getByRole('row')
      .filter({ hasText: 'Browser Test Charger' })
      .getByRole('img', { name: 'No image for Browser Test Charger' }),
  ).toBeVisible()
  await page.getByRole('button', { name: 'orders', exact: true }).click()
  const orderSection = page.locator('.admin-orders > div').filter({
    has: page.getByText(`ORDER #${String(order.order_id).padStart(5, '0')}`, { exact: true }),
  })
  await orderSection.getByRole('button', { name: 'Mark as paid' }).click()
  await expect(orderSection.locator('.status-pill')).toHaveText('paid')
  await orderSection.getByRole('button', { name: 'Cancel & restore stock' }).click()
  await expect(orderSection.locator('.status-pill')).toHaveText('cancelled')
})

test('shows a recoverable error when the catalog API is unavailable', async ({ page }) => {
  await page.route('**/api/products?**', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('alert')).toContainText('couldn’t reach the store')
  await page.unroute('**/api/products?**')
  await page.getByRole('button', { name: 'Try again' }).click()
  await expect(page.locator('.product-card')).toHaveCount(8)
})

test('mobile layout fits the viewport and the bag dialog works', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  await expect(page.locator('.product-card')).toHaveCount(8)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  await page.screenshot({ path: 'test-results/jackpot-tech-mobile.png', fullPage: true })
  await page.getByRole('button', { name: 'Bag, 0 items' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByRole('dialog').getByRole('heading', { name: 'Sign in' })).toBeVisible()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible()
})

test('stock errors stay visible and image failures do not show a different product', async ({
  page,
}) => {
  await page.route('**/products/hardware/sony-wh1000xm5.png', (route) => route.abort())
  await page.goto('/')
  const card = page
    .locator('.product-card')
    .filter({ has: page.getByRole('button', { name: 'Sony WH-1000XM5', exact: true }) })
  await expect(
    card.getByRole('img', { name: 'No image for Sony WH-1000XM5', exact: true }),
  ).toBeVisible()
  await signIn(page, 'admin@example.com', 'browser-test-password')
  await page.route('**/api/cart/items', (route) =>
    route.fulfill({
      status: 409,
      contentType: 'application/json',
      body: JSON.stringify({ detail: 'Not enough stock for that quantity' }),
    }),
  )
  await page.clock.install()
  await card.getByRole('button', { name: 'Add to bag' }).click()
  await expect(page.locator('.toast-error')).toHaveAttribute('role', 'alert')
  await expect(page.locator('.toast > svg')).toHaveCount(0)
  await page.clock.fastForward(6000)
  await expect(page.locator('.toast-error')).toContainText('Not enough stock')
  await page.getByRole('button', { name: 'Dismiss notification' }).click()
  await card.getByRole('button', { name: 'View Sony WH-1000XM5', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Add to bag' }).click()
  await expect(dialog.getByRole('alert')).toContainText('Not enough stock')
})

test('new arrivals opens a labeled newest-first view and resets previous filters', async ({
  page,
  request,
}) => {
  const login = await request.post('http://127.0.0.1:18000/api/auth/login', {
    data: { email: 'admin@example.com', password: 'browser-test-password' },
  })
  const { access_token } = await login.json()
  const created = await request.post('http://127.0.0.1:18000/api/admin/products', {
    headers: { Authorization: `Bearer ${access_token}` },
    data: { product_name: 'Latest arrival test product', price: '25.00', stock_quantity: 5 },
  })
  expect(created.status()).toBe(201)
  await page.goto('/')
  await page.getByRole('button', { name: 'Workspace', exact: true }).click()
  await page.getByRole('searchbox').fill('no-matching-product')
  await expect(page.getByRole('heading', { name: 'No products found' })).toBeVisible()
  const navigation = page.getByRole('navigation', { name: 'Main navigation' })
  await navigation.getByRole('button', { name: 'New arrivals', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'New arrivals', exact: true })).toBeVisible()
  await expect(navigation.getByRole('button', { name: 'New arrivals' })).toHaveAttribute(
    'aria-current',
    'page',
  )
  await expect(page.getByRole('searchbox')).toHaveValue('')
  await expect(page.locator('.product-card').first()).toContainText('Latest arrival test product')
  await expect(page.getByText('Newest first', { exact: true })).toBeVisible()
  await expect(page.locator('.hero')).toHaveCount(0)
  await navigation.getByRole('button', { name: 'Products', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Products', exact: true })).toBeVisible()
  await expect(page.getByRole('combobox', { name: 'Sort products' })).toHaveValue('featured')
  await page.locator('.footer-links').getByRole('button', { name: 'New arrivals' }).click()
  await expect(page.getByRole('heading', { name: 'New arrivals', exact: true })).toBeVisible()
  await expect(page.locator('.product-card').first()).toContainText('Latest arrival test product')
})

test('customers can post a review and sample reviews stay clearly separated', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Sign in', exact: true }).click()
  const dialog = page.getByRole('dialog')
  await dialog.getByRole('button', { name: 'Create account', exact: true }).click()
  await dialog.getByLabel('Your name').fill('Hardware Reviewer')
  await dialog.getByLabel('Email address').fill(`reviewer-${Date.now()}@example.com`)
  await dialog.getByLabel('Password', { exact: true }).fill('browser-test-password')
  await dialog.locator('form').getByRole('button', { name: 'Create account', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await page.getByRole('button', { name: 'Reviews for Sony WH-1000XM5', exact: true }).click()
  await expect(dialog.locator('.demo-reviews .review')).toHaveCount(2)
  await expect(
    dialog.getByText('Fictional examples for this demo store.', { exact: false }),
  ).toBeVisible()
  await expect(dialog.getByRole('link', { name: 'Manufacturer specifications' })).toHaveAttribute(
    'href',
    /sony.com/,
  )
  await dialog.getByLabel('Your rating').selectOption('4')
  await dialog
    .getByLabel('Your review', { exact: true })
    .fill('Comfortable for long work sessions. I would like a smaller case.')
  await dialog.getByRole('button', { name: 'Submit review' }).click()
  await expect(dialog.getByText('Your review was posted.')).toBeVisible()
  await expect(dialog.getByText('4.0 out of 5', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('4 stars: 1 review (100%)', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('5 stars: 0 reviews (0%)', { exact: true })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Submit review' })).toHaveCount(0)
  await expect(dialog.getByText('You have already reviewed this product.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Edit your review' }).click()
  await expect(dialog.getByLabel('Your rating')).toHaveValue('4')
  await expect(dialog.getByLabel('Your review', { exact: true })).toHaveValue(
    'Comfortable for long work sessions. I would like a smaller case.',
  )
  await dialog.getByLabel('Your review', { exact: true }).fill('An unsaved change.')
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await dialog.getByRole('button', { name: 'Edit your review' }).click()
  await expect(dialog.getByLabel('Your review', { exact: true })).toHaveValue(
    'Comfortable for long work sessions. I would like a smaller case.',
  )
  await dialog.getByLabel('Your rating').selectOption('2')
  await dialog
    .getByLabel('Your review', { exact: true })
    .fill('Updated after more use: the fit is uncomfortable.')
  await dialog.getByRole('button', { name: 'Save changes' }).click()
  await expect(dialog.getByText('Your review was updated.')).toBeVisible()
  await expect(dialog.getByText('2.0 out of 5', { exact: true })).toBeVisible()
  await expect(dialog.getByLabel('2 stars: 1 review (100%)', { exact: true })).toBeVisible()
  await expect(dialog.getByText('Updated after more use: the fit is uncomfortable.')).toBeVisible()
  await page.getByRole('button', { name: 'Close dialog' }).click()
  await expect(
    page.getByRole('button', { name: 'Reviews for Sony WH-1000XM5', exact: true }),
  ).toContainText('2.0 / 5 · 1 customer review')
})

test('rating summary averages customer ratings and shows every star count', async ({ page }) => {
  await page.route('**/api/products/*/reviews', (route) =>
    route.fulfill({
      json: [5, 5, 4, 2]
        .map((rating, index) => ({
          review_id: index + 1,
          user_id: index + 1,
          display_name: `Reviewer ${index + 1}`,
          rating,
          comment: 'A customer review for the rating breakdown.',
          created_at: '2026-01-01T00:00:00',
          is_demo: false,
        }))
        .concat({
          review_id: 99,
          user_id: 99,
          display_name: 'Demo reviewer',
          rating: 1,
          comment: 'Fictional example excluded from ratings.',
          created_at: '2026-01-01T00:00:00',
          is_demo: true,
        }),
    }),
  )
  await page.goto('/')
  await page.getByRole('button', { name: 'Reviews for Sony WH-1000XM5', exact: true }).click()
  const summary = page.getByLabel('Customer rating summary', { exact: true })
  await expect(summary.getByText('4.0 out of 5')).toBeVisible()
  await expect(summary.getByText('4 customer reviews')).toBeVisible()
  for (const label of [
    '5 stars: 2 reviews (50%)',
    '4 stars: 1 review (25%)',
    '3 stars: 0 reviews (0%)',
    '2 stars: 1 review (25%)',
    '1 stars: 0 reviews (0%)',
  ]) {
    await expect(summary.getByLabel(label, { exact: true })).toBeVisible()
  }
})
