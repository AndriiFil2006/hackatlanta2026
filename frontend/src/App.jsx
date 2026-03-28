import { useCallback, useEffect, useMemo, useState } from 'react'
import './casino.css'
import {
  addCartItem,
  createCategory,
  createOrder,
  createProduct,
  createPromoCode,
  createReview,
  fetchHealth,
  getCart,
  getProduct,
  getProductReviews,
  listCategories,
  listOrders,
  listProducts,
  listUsers,
  removeCartItem,
  updateCartItem,
  updateOrderStatus,
  validatePromoCode,
} from './api.js'
import { useAuth } from './AuthContext.jsx'

function money(n) {
  const x = Number(n)
  if (Number.isNaN(x)) return '—'
  return `$${x.toFixed(2)}`
}

function categoryEmoji(name) {
  const n = (name || '').toLowerCase()
  if (n.includes('laptop') || n.includes('computer')) return '💻'
  if (n.includes('phone') || n.includes('mobile')) return '📱'
  if (n.includes('game') || n.includes('gpu')) return '🎮'
  if (n.includes('audio') || n.includes('head')) return '🎧'
  if (n.includes('display') || n.includes('monitor')) return '🖥️'
  if (n.includes('wear')) return '⌚'
  return '🎰'
}

export default function App() {
  const { token, user, loading: authLoading, isAdmin, login, register, logout } =
    useAuth()

  const [apiStatus, setApiStatus] = useState('checking')
  const [categories, setCategories] = useState([])
  const [products, setProducts] = useState([])
  const [loadErr, setLoadErr] = useState('')

  const [categoryId, setCategoryId] = useState('')
  const [featuredOnly, setFeaturedOnly] = useState(false)
  const [search, setSearch] = useState('')

  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [ordersOpen, setOrdersOpen] = useState(false)
  const [adminOpen, setAdminOpen] = useState(false)
  const [detailId, setDetailId] = useState(null)

  const [cart, setCart] = useState(null)
  const [orders, setOrders] = useState([])

  const [authTab, setAuthTab] = useState('login')
  const [authEmail, setAuthEmail] = useState('')
  const [authPass, setAuthPass] = useState('')
  const [authName, setAuthName] = useState('')
  const [authErr, setAuthErr] = useState('')

  const [shipAddr, setShipAddr] = useState('')
  const [promoCode, setPromoCode] = useState('')
  const [checkoutErr, setCheckoutErr] = useState('')

  const [adminTab, setAdminTab] = useState('users')
  const [adminUsers, setAdminUsers] = useState([])
  const [adminErr, setAdminErr] = useState('')
  const [newCatName, setNewCatName] = useState('')
  const [newCatDesc, setNewCatDesc] = useState('')
  const [newProd, setNewProd] = useState({
    product_name: '',
    description: '',
    price: '',
    stock_quantity: '0',
    category_id: '',
    image_url: '',
    is_featured: false,
  })
  const [newPromo, setNewPromo] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: '10',
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      for (let attempt = 0; attempt < 2; attempt++) {
        if (cancelled) return
        if (attempt > 0) await new Promise((r) => setTimeout(r, 400))
        try {
          await fetchHealth()
          if (!cancelled) setApiStatus('ok')
          return
        } catch {
          if (!cancelled) setApiStatus('error')
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  const reloadCatalog = useCallback(async () => {
    setLoadErr('')
    try {
      const [cats, prods] = await Promise.all([
        listCategories(),
        listProducts({
          limit: 200,
          search: search || undefined,
          featured_only: featuredOnly,
          category_id: categoryId ? Number(categoryId) : undefined,
        }),
      ])
      setCategories(cats)
      setProducts(prods)
    } catch (e) {
      setLoadErr(e instanceof Error ? e.message : 'Failed to load catalog')
    }
  }, [search, featuredOnly, categoryId])

  useEffect(() => {
    const t = setTimeout(reloadCatalog, search ? 320 : 0)
    return () => clearTimeout(t)
  }, [reloadCatalog, search])

  const refreshCart = useCallback(async () => {
    if (!token) {
      setCart(null)
      return
    }
    try {
      const c = await getCart(token)
      setCart(c)
    } catch {
      setCart(null)
    }
  }, [token])

  useEffect(() => {
    const t = setTimeout(() => {
      void refreshCart()
    }, 0)
    return () => clearTimeout(t)
  }, [refreshCart])

  const cartCount = useMemo(() => {
    if (!cart?.items?.length) return 0
    return cart.items.reduce((s, i) => s + i.quantity, 0)
  }, [cart])

  const handleAuth = async (e) => {
    e.preventDefault()
    setAuthErr('')
    try {
      if (authTab === 'login') await login(authEmail, authPass)
      else await register(authEmail, authPass, authName || 'Player')
      setAuthOpen(false)
      setAuthEmail('')
      setAuthPass('')
      setAuthName('')
    } catch (err) {
      setAuthErr(err instanceof Error ? err.message : 'Auth failed')
    }
  }

  const handleAddCart = async (productId, qty = 1) => {
    if (!token) {
      setAuthOpen(true)
      return
    }
    try {
      await addCartItem(token, productId, qty)
      await refreshCart()
      setCartOpen(true)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Cart error')
    }
  }

  const openOrders = async () => {
    if (!token) {
      setAuthOpen(true)
      return
    }
    setOrdersOpen(true)
    try {
      const o = await listOrders(token)
      setOrders(o)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Orders failed')
    }
  }

  const openAdmin = async () => {
    if (!token || !user?.is_admin) return
    setAdminOpen(true)
    setAdminErr('')
    try {
      const u = await listUsers(token)
      setAdminUsers(u)
    } catch (e) {
      setAdminErr(e instanceof Error ? e.message : 'Failed to load users')
    }
  }

  const submitAdminCategory = async (e) => {
    e.preventDefault()
    if (!token) return
    try {
      await createCategory(token, newCatName, newCatDesc)
      setNewCatName('')
      setNewCatDesc('')
      await reloadCatalog()
      alert('Category created')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const submitAdminProduct = async (e) => {
    e.preventDefault()
    if (!token) return
    try {
      await createProduct(token, {
        product_name: newProd.product_name,
        description: newProd.description || null,
        price: newProd.price,
        stock_quantity: Number(newProd.stock_quantity) || 0,
        category_id: newProd.category_id ? Number(newProd.category_id) : null,
        image_url: newProd.image_url || null,
        is_featured: newProd.is_featured,
      })
      await reloadCatalog()
      alert('Product created')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const submitAdminPromo = async (e) => {
    e.preventDefault()
    if (!token) return
    try {
      await createPromoCode(token, {
        code: newPromo.code.toUpperCase(),
        discount_type: newPromo.discount_type,
        discount_value: newPromo.discount_value,
        expires_at: null,
      })
      setNewPromo((p) => ({ ...p, code: '' }))
      alert('Promo code created')
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Error')
    }
  }

  const submitCheckout = async (e) => {
    e.preventDefault()
    if (!token) return
    setCheckoutErr('')
    if (!shipAddr.trim()) {
      setCheckoutErr('Shipping address required')
      return
    }
    try {
      if (promoCode.trim()) await validatePromoCode(promoCode.trim())
      await createOrder(token, shipAddr.trim(), promoCode.trim() || undefined)
      setCheckoutOpen(false)
      setShipAddr('')
      setPromoCode('')
      await refreshCart()
      await openOrders()
      alert('Order placed — good luck at the tables!')
    } catch (e) {
      setCheckoutErr(e instanceof Error ? e.message : 'Checkout failed')
    }
  }

  return (
    <div className="jt-root">
      <nav className="jt-nav">
        <div className="jt-logo">
          Jackpot<span>Tech</span>
        </div>
        <div className="jt-nav-actions">
          <input
            className="jt-input"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ minWidth: 160 }}
          />
          <select
            className="jt-select"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
          >
            <option value="">All categories</option>
            {categories.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.category_name}
              </option>
            ))}
          </select>
          <label
            style={{
              fontSize: '0.75rem',
              color: 'var(--jt-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <input
              type="checkbox"
              checked={featuredOnly}
              onChange={(e) => setFeaturedOnly(e.target.checked)}
            />
            Featured
          </label>
          <button
            type="button"
            className="jt-btn jt-btn-outline"
            onClick={() => setCartOpen(true)}
          >
            Cart{cartCount ? ` (${cartCount})` : ''}
          </button>
          <button
            type="button"
            className="jt-btn jt-btn-outline"
            onClick={openOrders}
          >
            My orders
          </button>
          {isAdmin && (
            <button
              type="button"
              className="jt-btn jt-btn-red"
              onClick={openAdmin}
            >
              House admin
            </button>
          )}
          {user ? (
            <button
              type="button"
              className="jt-btn jt-btn-outline"
              onClick={logout}
            >
              Log out {user.display_name}
            </button>
          ) : (
            <button
              type="button"
              className="jt-btn jt-btn-gold"
              onClick={() => setAuthOpen(true)}
            >
              Log in
            </button>
          )}
        </div>
      </nav>

      <div className="jt-ticker-wrap">
        <div className="jt-ticker">
          {[
            'LIVE ODDS ON LAPTOPS',
            'PHONES — STACK YOUR CHIPS',
            'AUDIO — ALL IN',
            'RTX / APPLE / SONY — SPIN TO WIN',
            'MEMBERS GET THE REAL DEALS',
          ]
            .concat(
              products.slice(0, 6).map((p) => `${p.product_name} — ${money(p.price)}`),
            )
            .map((t, i) => (
              <span key={i}>♦ {t}</span>
            ))}
        </div>
      </div>

      <header className="jt-hero">
        <p
          style={{
            color: 'var(--jt-gold)',
            letterSpacing: '4px',
            fontSize: '0.72rem',
            marginBottom: 8,
          }}
        >
          ♠ PREMIUM ELECTRONICS CASINO
        </p>
        <h1>
          Bet on the <em>best tech</em>
        </h1>
        <p>
          Real inventory from our PostgreSQL tables: products, categories, carts,
          orders, reviews, and promo codes — all wired through FastAPI.
        </p>
        <p
          className={
            apiStatus === 'ok'
              ? 'jt-api-ok'
              : apiStatus === 'error'
                ? 'jt-api-bad'
                : ''
          }
          style={{ fontSize: '0.8rem' }}
        >
          API:{' '}
          {apiStatus === 'checking' && 'connecting…'}
          {apiStatus === 'ok' && 'connected'}
          {apiStatus === 'error' && 'offline — start uvicorn on :8000'}
        </p>
      </header>

      {loadErr && (
        <p style={{ textAlign: 'center', color: '#ff8a80' }}>{loadErr}</p>
      )}

      <section className="jt-grid">
        {products.length === 0 && !loadErr && (
          <p style={{ gridColumn: '1/-1', textAlign: 'center', color: 'var(--jt-muted)' }}>
            No products in the database yet. Add categories & products (admin)
            or run SQL seeds.
          </p>
        )}
        {products.map((p) => {
          const cat = categories.find((c) => c.category_id === p.category_id)
          return (
            <article key={p.product_id} className="jt-card">
              <div className="jt-card-img">
                {p.is_featured && (
                  <span className="jt-badge">FEATURED</span>
                )}
                {p.image_url ? (
                  <img src={p.image_url} alt="" />
                ) : (
                  categoryEmoji(cat?.category_name)
                )}
              </div>
              <div className="jt-card-body">
                <div
                  style={{
                    fontSize: '0.68rem',
                    letterSpacing: '2px',
                    color: 'var(--jt-gold)',
                    marginBottom: 4,
                  }}
                >
                  {cat?.category_name || 'Floor'}
                </div>
                <h3>{p.product_name}</h3>
                <div className="jt-price">{money(p.price)}</div>
                <div className="jt-stock">
                  {p.stock_quantity > 0
                    ? `${p.stock_quantity} in stock`
                    : 'Out of stock'}
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', gap: 8 }}>
                  <button
                    type="button"
                    className="jt-btn jt-btn-gold"
                    style={{ flex: 1 }}
                    disabled={!p.is_active || p.stock_quantity <= 0}
                    onClick={() => handleAddCart(p.product_id, 1)}
                  >
                    Add to hand
                  </button>
                  <button
                    type="button"
                    className="jt-btn jt-btn-outline"
                    onClick={() => setDetailId(p.product_id)}
                  >
                    Details
                  </button>
                </div>
              </div>
            </article>
          )
        })}
      </section>

      <footer className="jt-footer">
        © 2026 JackpotTech · users · categories · products · carts · cart_items ·
        orders · order_items · reviews · promo_codes · order_promos
      </footer>

      {cartOpen && (
        <CartDrawer
          cart={cart}
          token={token}
          onClose={() => setCartOpen(false)}
          onRefresh={refreshCart}
          onCheckout={() => {
            if (!token) {
              setAuthOpen(true)
              return
            }
            setCheckoutOpen(true)
          }}
          authLoading={authLoading}
        />
      )}

      {checkoutOpen && (
        <div className="jt-overlay" onClick={() => setCheckoutOpen(false)}>
          <div className="jt-panel" onClick={(e) => e.stopPropagation()}>
            <h2>Checkout</h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--jt-muted)', marginBottom: 12 }}>
              Creates rows in <strong>orders</strong>, <strong>order_items</strong>, and
              optionally <strong>order_promos</strong>.
            </p>
            <form onSubmit={submitCheckout}>
              <label className="jt-label">Shipping address</label>
              <textarea
                className="jt-textarea"
                rows={4}
                style={{ width: '100%' }}
                value={shipAddr}
                onChange={(e) => setShipAddr(e.target.value)}
                placeholder="Ship to…"
              />
              <label className="jt-label">Promo code (optional)</label>
              <input
                className="jt-input"
                style={{ width: '100%' }}
                value={promoCode}
                onChange={(e) => setPromoCode(e.target.value)}
                placeholder="WELCOME10"
              />
              {checkoutErr && <p className="jt-error">{checkoutErr}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                <button type="submit" className="jt-btn jt-btn-gold">
                  Place order
                </button>
                <button
                  type="button"
                  className="jt-btn jt-btn-outline"
                  onClick={() => setCheckoutOpen(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {authOpen && (
        <div className="jt-overlay" onClick={() => setAuthOpen(false)}>
          <div className="jt-panel" onClick={(e) => e.stopPropagation()}>
            <h2>{authTab === 'login' ? 'Log in' : 'Join the table'}</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--jt-muted)' }}>
              Uses <code>/auth/login</code> and <code>/auth/register</code> against the{' '}
              <strong>users</strong> table.
            </p>
            <div className="jt-tabs">
              <button
                type="button"
                className={`jt-tab ${authTab === 'login' ? 'on' : ''}`}
                onClick={() => setAuthTab('login')}
              >
                Log in
              </button>
              <button
                type="button"
                className={`jt-tab ${authTab === 'register' ? 'on' : ''}`}
                onClick={() => setAuthTab('register')}
              >
                Register
              </button>
            </div>
            <form onSubmit={handleAuth}>
              {authTab === 'register' && (
                <>
                  <label className="jt-label">Display name</label>
                  <input
                    className="jt-input"
                    style={{ width: '100%' }}
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                  />
                </>
              )}
              <label className="jt-label">Email</label>
              <input
                className="jt-input"
                style={{ width: '100%' }}
                type="email"
                required
                value={authEmail}
                onChange={(e) => setAuthEmail(e.target.value)}
              />
              <label className="jt-label">Password</label>
              <input
                className="jt-input"
                style={{ width: '100%' }}
                type="password"
                required
                value={authPass}
                onChange={(e) => setAuthPass(e.target.value)}
              />
              {authErr && <p className="jt-error">{authErr}</p>}
              <button
                type="submit"
                className="jt-btn jt-btn-gold"
                style={{ marginTop: 16 }}
              >
                {authTab === 'login' ? 'Enter' : 'Create account'}
              </button>
            </form>
          </div>
        </div>
      )}

      {ordersOpen && (
        <div className="jt-overlay" onClick={() => setOrdersOpen(false)}>
          <div className="jt-panel wide" onClick={(e) => e.stopPropagation()}>
            <h2>Your orders</h2>
            {orders.length === 0 && (
              <p style={{ color: 'var(--jt-muted)' }}>No orders yet.</p>
            )}
            {orders.map((o) => (
              <div key={o.order_id} className="jt-order-card">
                <strong>#{o.order_id}</strong> · {o.status} · {money(o.total_amount)}
                <div style={{ fontSize: '0.75rem', color: 'var(--jt-muted)' }}>
                  {new Date(o.placed_at).toLocaleString()}
                </div>
                {o.shipping_address && (
                  <div style={{ fontSize: '0.8rem', marginTop: 6 }}>
                    Ship: {o.shipping_address}
                  </div>
                )}
                {o.promo_codes?.length > 0 && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--jt-gold)', marginTop: 4 }}>
                    Promos: {o.promo_codes.join(', ')}
                  </div>
                )}
                <ul style={{ marginTop: 8, paddingLeft: 18, fontSize: '0.85rem' }}>
                  {o.items?.map((it) => (
                    <li key={it.order_item_id}>
                      {it.product_name_snapshot} × {it.quantity} @ {money(it.unit_price)}
                    </li>
                  ))}
                </ul>
                {isAdmin && (
                  <select
                    className="jt-select"
                    style={{ marginTop: 10 }}
                    value={o.status}
                    onChange={async (e) => {
                      try {
                        await updateOrderStatus(token, o.order_id, e.target.value)
                        const fresh = await listOrders(token)
                        setOrders(fresh)
                      } catch (err) {
                        alert(err instanceof Error ? err.message : 'Update failed')
                      }
                    }}
                  >
                    {['pending', 'paid', 'shipped', 'delivered', 'cancelled'].map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            ))}
            <button
              type="button"
              className="jt-btn jt-btn-outline"
              style={{ marginTop: 12 }}
              onClick={() => setOrdersOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {adminOpen && (
        <div className="jt-overlay" onClick={() => setAdminOpen(false)}>
          <div className="jt-panel wide" onClick={(e) => e.stopPropagation()}>
            <h2>House admin</h2>
            <p style={{ fontSize: '0.8rem', color: 'var(--jt-muted)' }}>
              Manage data across all schema tables (via API).
            </p>
            <div className="jt-tabs">
              {['users', 'categories', 'products', 'promos'].map((t) => (
                <button
                  key={t}
                  type="button"
                  className={`jt-tab ${adminTab === t ? 'on' : ''}`}
                  onClick={() => setAdminTab(t)}
                >
                  {t}
                </button>
              ))}
            </div>
            {adminErr && <p className="jt-error">{adminErr}</p>}

            {adminTab === 'users' && (
              <div className="jt-table-wrap">
                <table className="jt-table">
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Email</th>
                      <th>Display</th>
                      <th>Admin</th>
                      <th>Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsers.map((u) => (
                      <tr key={u.user_id}>
                        <td>{u.user_id}</td>
                        <td>{u.email}</td>
                        <td>{u.display_name}</td>
                        <td>{u.is_admin ? 'yes' : ''}</td>
                        <td>{new Date(u.created_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {adminTab === 'categories' && (
              <form onSubmit={submitAdminCategory}>
                <label className="jt-label">New category name</label>
                <input
                  className="jt-input"
                  style={{ width: '100%' }}
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                />
                <label className="jt-label">Description</label>
                <input
                  className="jt-input"
                  style={{ width: '100%' }}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                />
                <button type="submit" className="jt-btn jt-btn-gold" style={{ marginTop: 12 }}>
                  Add category
                </button>
              </form>
            )}

            {adminTab === 'products' && (
              <form onSubmit={submitAdminProduct}>
                <label className="jt-label">Name</label>
                <input
                  className="jt-input"
                  style={{ width: '100%' }}
                  required
                  value={newProd.product_name}
                  onChange={(e) =>
                    setNewProd((x) => ({ ...x, product_name: e.target.value }))
                  }
                />
                <label className="jt-label">Description</label>
                <textarea
                  className="jt-textarea"
                  style={{ width: '100%' }}
                  rows={2}
                  value={newProd.description}
                  onChange={(e) =>
                    setNewProd((x) => ({ ...x, description: e.target.value }))
                  }
                />
                <label className="jt-label">Price</label>
                <input
                  className="jt-input"
                  style={{ width: '100%' }}
                  required
                  value={newProd.price}
                  onChange={(e) =>
                    setNewProd((x) => ({ ...x, price: e.target.value }))
                  }
                />
                <label className="jt-label">Stock</label>
                <input
                  className="jt-input"
                  style={{ width: '100%' }}
                  value={newProd.stock_quantity}
                  onChange={(e) =>
                    setNewProd((x) => ({ ...x, stock_quantity: e.target.value }))
                  }
                />
                <label className="jt-label">Category</label>
                <select
                  className="jt-select"
                  style={{ width: '100%' }}
                  value={newProd.category_id}
                  onChange={(e) =>
                    setNewProd((x) => ({ ...x, category_id: e.target.value }))
                  }
                >
                  <option value="">—</option>
                  {categories.map((c) => (
                    <option key={c.category_id} value={c.category_id}>
                      {c.category_name}
                    </option>
                  ))}
                </select>
                <label className="jt-label">Image URL</label>
                <input
                  className="jt-input"
                  style={{ width: '100%' }}
                  value={newProd.image_url}
                  onChange={(e) =>
                    setNewProd((x) => ({ ...x, image_url: e.target.value }))
                  }
                />
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 10,
                    fontSize: '0.85rem',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={newProd.is_featured}
                    onChange={(e) =>
                      setNewProd((x) => ({ ...x, is_featured: e.target.checked }))
                    }
                  />
                  Featured
                </label>
                <button type="submit" className="jt-btn jt-btn-gold" style={{ marginTop: 12 }}>
                  Add product
                </button>
              </form>
            )}

            {adminTab === 'promos' && (
              <form onSubmit={submitAdminPromo}>
                <label className="jt-label">Code</label>
                <input
                  className="jt-input"
                  style={{ width: '100%' }}
                  required
                  value={newPromo.code}
                  onChange={(e) =>
                    setNewPromo((x) => ({ ...x, code: e.target.value }))
                  }
                />
                <label className="jt-label">Type</label>
                <select
                  className="jt-select"
                  style={{ width: '100%' }}
                  value={newPromo.discount_type}
                  onChange={(e) =>
                    setNewPromo((x) => ({ ...x, discount_type: e.target.value }))
                  }
                >
                  <option value="percent">Percent off</option>
                  <option value="fixed">Fixed amount off</option>
                </select>
                <label className="jt-label">Value</label>
                <input
                  className="jt-input"
                  style={{ width: '100%' }}
                  required
                  value={newPromo.discount_value}
                  onChange={(e) =>
                    setNewPromo((x) => ({ ...x, discount_value: e.target.value }))
                  }
                />
                <button type="submit" className="jt-btn jt-btn-gold" style={{ marginTop: 12 }}>
                  Create promo_codes row
                </button>
              </form>
            )}

            <button
              type="button"
              className="jt-btn jt-btn-outline"
              style={{ marginTop: 16 }}
              onClick={() => setAdminOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}

      {detailId != null && (
        <ProductDetailModal
          productId={detailId}
          token={token}
          categories={categories}
          onClose={() => setDetailId(null)}
          onAddCart={handleAddCart}
        />
      )}
    </div>
  )
}

function CartDrawer({ cart, token, onClose, onRefresh, onCheckout, authLoading }) {
  if (authLoading) {
    return (
      <div className="jt-drawer">
        <div className="jt-drawer-head">
          <span>Cart</span>
          <button type="button" className="jt-btn jt-btn-outline" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="jt-drawer-body">Loading…</div>
      </div>
    )
  }
  if (!token) {
    return (
      <div className="jt-drawer">
        <div className="jt-drawer-head">
          <span>Cart</span>
          <button type="button" className="jt-btn jt-btn-outline" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="jt-drawer-body">
          <p style={{ color: 'var(--jt-muted)' }}>Log in to use your cart.</p>
        </div>
      </div>
    )
  }
  const items = cart?.items || []
  const subtotal = items.reduce(
    (s, i) => s + Number(i.price || 0) * i.quantity,
    0,
  )
  return (
    <div className="jt-drawer">
      <div className="jt-drawer-head">
        <span>Your cart · carts / cart_items</span>
        <button type="button" className="jt-btn jt-btn-outline" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="jt-drawer-body">
        {items.length === 0 && (
          <p style={{ color: 'var(--jt-muted)' }}>Empty — add products from the floor.</p>
        )}
        {items.map((line) => (
          <div key={line.cart_item_id} className="jt-cart-line">
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 600 }}>{line.product_name}</div>
              <div style={{ fontSize: '0.8rem', color: 'var(--jt-gold)' }}>
                {money(line.price)} × {line.quantity}
              </div>
            </div>
            <input
              className="jt-input"
              type="number"
              min={1}
              value={line.quantity}
              onChange={async (e) => {
                const q = Number(e.target.value)
                if (q < 1) return
                try {
                  await updateCartItem(token, line.cart_item_id, q)
                  await onRefresh()
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Update failed')
                }
              }}
            />
            <button
              type="button"
              className="jt-btn jt-btn-outline"
              onClick={async () => {
                try {
                  await removeCartItem(token, line.cart_item_id)
                  await onRefresh()
                } catch (err) {
                  alert(err instanceof Error ? err.message : 'Remove failed')
                }
              }}
            >
              ✕
            </button>
          </div>
        ))}
      </div>
      <div style={{ padding: 16, borderTop: '1px solid var(--jt-border)' }}>
        <div style={{ marginBottom: 10, fontFamily: 'var(--jt-font-cond)', fontSize: '1.3rem' }}>
          Subtotal {money(subtotal)}
        </div>
        <button
          type="button"
          className="jt-btn jt-btn-gold"
          style={{ width: '100%' }}
          disabled={!items.length}
          onClick={onCheckout}
        >
          Checkout
        </button>
      </div>
    </div>
  )
}

function ProductDetailModal({
  productId,
  token,
  categories,
  onClose,
  onAddCart,
}) {
  const [product, setProduct] = useState(null)
  const [reviews, setReviews] = useState([])
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const [err, setErr] = useState('')

  useEffect(() => {
    let c = false
    ;(async () => {
      try {
        const [p, r] = await Promise.all([
          getProduct(productId),
          getProductReviews(productId),
        ])
        if (!c) {
          setProduct(p)
          setReviews(r)
        }
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : 'Error')
      }
    })()
    return () => {
      c = true
    }
  }, [productId])

  const cat = categories.find((x) => x.category_id === product?.category_id)

  const submitReview = async (e) => {
    e.preventDefault()
    if (!token) {
      alert('Log in to review')
      return
    }
    try {
      await createReview(token, {
        product_id: productId,
        rating,
        comment,
      })
      setComment('')
      const r = await getProductReviews(productId)
      setReviews(r)
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Review failed')
    }
  }

  if (!product && !err) {
    return (
      <div className="jt-overlay" onClick={onClose}>
        <div className="jt-panel" onClick={(e) => e.stopPropagation()}>
          Loading…
        </div>
      </div>
    )
  }
  if (err) {
    return (
      <div className="jt-overlay" onClick={onClose}>
        <div className="jt-panel" onClick={(e) => e.stopPropagation()}>
          <p className="jt-error">{err}</p>
          <button type="button" className="jt-btn jt-btn-outline" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="jt-overlay" onClick={onClose}>
      <div className="jt-panel wide" onClick={(e) => e.stopPropagation()}>
        <h2>{product.product_name}</h2>
        <p style={{ color: 'var(--jt-muted)', fontSize: '0.85rem' }}>
          {cat?.category_name} · {money(product.price)} · stock {product.stock_quantity}
        </p>
        {product.description && (
          <p style={{ marginTop: 12, lineHeight: 1.5 }}>{product.description}</p>
        )}
        <div style={{ marginTop: 16, display: 'flex', gap: 10 }}>
          <button
            type="button"
            className="jt-btn jt-btn-gold"
            disabled={!product.is_active || product.stock_quantity <= 0}
            onClick={() => onAddCart(product.product_id, 1)}
          >
            Add to cart
          </button>
          <button type="button" className="jt-btn jt-btn-outline" onClick={onClose}>
            Close
          </button>
        </div>

        <h3 style={{ marginTop: 24, color: 'var(--jt-gold)', fontFamily: 'var(--jt-font-display)' }}>
          Reviews
        </h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--jt-muted)' }}>
          Table: <strong>reviews</strong> (user_id, product_id, rating, comment)
        </p>
        {reviews.length === 0 && (
          <p style={{ color: 'var(--jt-muted)' }}>No reviews yet.</p>
        )}
        {reviews.map((rev) => (
          <div
            key={rev.review_id}
            style={{
              borderBottom: '1px solid rgba(255,255,255,0.08)',
              padding: '10px 0',
              fontSize: '0.9rem',
            }}
          >
            <span className="jt-stars">{'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}</span>
            <span style={{ marginLeft: 8, color: 'var(--jt-muted)', fontSize: '0.75rem' }}>
              user #{rev.user_id}
            </span>
            {rev.comment && <div style={{ marginTop: 4 }}>{rev.comment}</div>}
          </div>
        ))}

        <form onSubmit={submitReview} style={{ marginTop: 16 }}>
          <label className="jt-label">Your rating</label>
          <select
            className="jt-select"
            value={rating}
            onChange={(e) => setRating(Number(e.target.value))}
          >
            {[5, 4, 3, 2, 1].map((n) => (
              <option key={n} value={n}>
                {n} stars
              </option>
            ))}
          </select>
          <label className="jt-label">Comment</label>
          <textarea
            className="jt-textarea"
            rows={2}
            style={{ width: '100%' }}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <button type="submit" className="jt-btn jt-btn-outline" style={{ marginTop: 10 }}>
            Post review
          </button>
        </form>
      </div>
    </div>
  )
}
