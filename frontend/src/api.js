/** @returns {string} */
export function getApiBaseUrl() {
  const fromEnv = import.meta.env.VITE_API_URL?.replace(/\/$/, '')
  if (fromEnv) return fromEnv
  return ''
}

function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  const base = getApiBaseUrl()
  if (base) return `${base}${p}`
  return `/api${p}`
}

const TOKEN_KEY = 'jt_token'

export function getToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY)
}

async function parseError(res) {
  const text = await res.text()
  try {
    const j = JSON.parse(text)
    if (typeof j.detail === 'string') return j.detail
    if (Array.isArray(j.detail)) return j.detail.map((d) => d.msg || d).join(', ')
    return text || res.statusText
  } catch {
    return text || res.statusText
  }
}

/**
 * @param {string} path
 * @param {{ method?: string, body?: object, auth?: boolean, token?: string }} [opts]
 */
export async function api(path, opts = {}) {
  const { method = 'GET', body, auth = false, token: optToken } = opts
  const headers = {}
  const tok = optToken ?? (auth ? getToken() : null)
  if (tok) headers.Authorization = `Bearer ${tok}`
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
  }
  const res = await fetch(apiUrl(path), {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })
  if (!res.ok) throw new Error(await parseError(res))
  if (res.status === 204) return null
  return res.json()
}

export function fetchHealth() {
  return api('/health')
}

export function loginRequest(email, password) {
  return api('/auth/login', { method: 'POST', body: { email, password } })
}

export function registerRequest(email, password, display_name) {
  return api('/auth/register', {
    method: 'POST',
    body: { email, password, display_name },
  })
}

export function getMe(token) {
  return api('/users/me', { auth: true, token })
}

export function listUsers(token) {
  return api('/users', { auth: true, token })
}

export function listCategories() {
  return api('/categories')
}

export function listProducts(params = {}) {
  const q = new URLSearchParams()
  if (params.skip != null) q.set('skip', String(params.skip))
  if (params.limit != null) q.set('limit', String(params.limit))
  if (params.category_id != null && params.category_id !== '')
    q.set('category_id', String(params.category_id))
  if (params.search) q.set('search', params.search)
  if (params.featured_only) q.set('featured_only', 'true')
  const s = q.toString()
  return api(`/products${s ? `?${s}` : ''}`)
}

export function getProduct(productId) {
  return api(`/products/${productId}`)
}

export function getProductReviews(productId, skip = 0, limit = 20) {
  return api(
    `/products/${productId}/reviews?skip=${skip}&limit=${limit}`,
  )
}

export function createReview(token, { product_id, rating, comment }) {
  return api('/reviews', {
    method: 'POST',
    auth: true,
    token,
    body: { product_id, rating, comment: comment || null },
  })
}

export function getCart(token) {
  return api('/cart', { auth: true, token })
}

export function addCartItem(token, product_id, quantity) {
  return api('/cart/items', {
    method: 'POST',
    auth: true,
    token,
    body: { product_id, quantity },
  })
}

export function updateCartItem(token, cart_item_id, quantity) {
  return api(`/cart/items/${cart_item_id}`, {
    method: 'PUT',
    auth: true,
    token,
    body: { quantity },
  })
}

export function removeCartItem(token, cart_item_id) {
  return api(`/cart/items/${cart_item_id}`, {
    method: 'DELETE',
    auth: true,
    token,
  })
}

export function createOrder(token, shipping_address, promo_code) {
  return api('/orders', {
    method: 'POST',
    auth: true,
    token,
    body: {
      shipping_address,
      promo_code: promo_code?.trim() || null,
    },
  })
}

export function listOrders(token) {
  return api('/orders', { auth: true, token })
}

export function updateOrderStatus(token, orderId, status) {
  return api(`/orders/${orderId}`, {
    method: 'PUT',
    auth: true,
    token,
    body: { status },
  })
}

export function validatePromoCode(code) {
  return api(`/promo-codes/${encodeURIComponent(code)}`)
}

export function createCategory(token, category_name, description) {
  return api('/categories', {
    method: 'POST',
    auth: true,
    token,
    body: { category_name, description: description || null },
  })
}

export function createProduct(token, payload) {
  return api('/products', {
    method: 'POST',
    auth: true,
    token,
    body: payload,
  })
}

export function createPromoCode(token, payload) {
  return api('/promo-codes', {
    method: 'POST',
    auth: true,
    token,
    body: payload,
  })
}
