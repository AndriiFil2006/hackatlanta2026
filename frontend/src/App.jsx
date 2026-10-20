import { useCallback, useEffect, useRef, useState } from 'react'
import { api, money } from './api'
import { useAuth } from './AuthContext'
import Admin from './components/Admin'
import Icon from './components/Icon'
import Modal from './components/Modal'
import ProductCard from './components/ProductCard'
import {
  AuthModal,
  BagModal,
  CheckoutModal,
  ErrorMessage,
  OrdersModal,
  ProductModal,
} from './components/StoreDialogs'

const EMPTY_CART = { items: [], subtotal: '0', shipping: '0', total: '0' }

export default function App() {
  const { token, user, loading: authLoading, logout } = useAuth()
  const [view, setView] = useState('shop')
  const isNewArrivals = view === 'new-arrivals'
  const [dialog, setDialog] = useState(null)
  const [categories, setCategories] = useState([])
  const [catalog, setCatalog] = useState({ items: [], total: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sort, setSort] = useState('featured')
  const [inStock, setInStock] = useState(false)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [cartState, setCartState] = useState({ token: null, cart: EMPTY_CART, loading: false })
  const [adding, setAdding] = useState(null)
  const [toast, setToast] = useState('')
  const searchRef = useRef(null)
  const catalogRef = useRef(null)
  const activeToken = useRef(token)
  useEffect(() => {
    activeToken.current = token
  }, [token])
  const cart = cartState.token === token ? cartState.cart : EMPTY_CART
  const cartLoading = !!token && (cartState.token !== token || cartState.loading)
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0)

  useEffect(() => {
    const controller = new AbortController()
    api('/categories', { signal: controller.signal })
      .then(setCategories)
      .catch((error) => {
        if (error.name !== 'AbortError') setError(error)
      })
    return () => controller.abort()
  }, [revision])

  useEffect(() => {
    const controller = new AbortController()
    const timer = setTimeout(
      async () => {
        setLoading(true)
        setError(null)
        const params = new URLSearchParams({
          page,
          page_size: 8,
          sort: isNewArrivals ? 'newest' : sort,
        })
        if (search.trim()) params.set('search', search.trim())
        if (category) params.set('category_id', category)
        if (inStock) params.set('in_stock', 'true')
        try {
          setCatalog(await api(`/products?${params}`, { signal: controller.signal }))
        } catch (error) {
          if (error.name !== 'AbortError') setError(error)
        } finally {
          if (!controller.signal.aborted) setLoading(false)
        }
      },
      search ? 250 : 0,
    )
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [search, category, sort, inStock, page, revision, isNewArrivals])

  const refreshCart = useCallback(async () => {
    if (!token) return
    const next = await api('/cart', { token })
    if (activeToken.current === token) setCartState({ token, cart: next, loading: false })
  }, [token])

  useEffect(() => {
    if (!token) return
    const controller = new AbortController()
    api('/cart', { token, signal: controller.signal })
      .then((cart) => setCartState({ token, cart, loading: false }))
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setToast({ message: error.message, error: true })
          setCartState({ token, cart: EMPTY_CART, loading: false })
        }
      })
    return () => controller.abort()
  }, [token])

  useEffect(() => {
    if (!toast || toast.error) return
    const timer = setTimeout(() => setToast(''), 5500)
    return () => clearTimeout(timer)
  }, [toast])

  function showShop(scroll = false) {
    setView('shop')
    if (scroll)
      setTimeout(() => catalogRef.current?.scrollIntoView({ behavior: 'auto', block: 'start' }), 30)
  }
  function openCollection(newArrivals = false) {
    setSearch('')
    setCategory('')
    setInStock(false)
    setPage(1)
    setSort(newArrivals ? 'newest' : 'featured')
    setView(newArrivals ? 'new-arrivals' : 'shop')
    setTimeout(() => catalogRef.current?.scrollIntoView({ block: 'start' }), 30)
  }
  function selectCategory(id) {
    setCategory(String(id))
    setPage(1)
    setTimeout(() => catalogRef.current?.scrollIntoView({ block: 'start' }), 30)
  }
  async function addProduct(product) {
    if (!token) {
      setDialog({ type: 'auth' })
      return
    }
    setAdding(product.product_id)
    try {
      const next = await api('/cart/items', {
        method: 'POST',
        token,
        body: { product_id: product.product_id, quantity: 1 },
      })
      if (activeToken.current === token) {
        setCartState({ token, cart: next, loading: false })
        setToast({ message: `${product.product_name} added to your bag.` })
      }
    } catch (error) {
      if (dialog?.type !== 'product') setToast({ message: error.message, error: true })
      return { error }
    } finally {
      setAdding(null)
    }
  }
  async function updateBag(item, quantity) {
    const next = await api(`/cart/items/${item.cart_item_id}`, {
      method: quantity === 0 ? 'DELETE' : 'PUT',
      token,
      ...(quantity ? { body: { quantity } } : {}),
    })
    setCartState({ token, cart: next, loading: false })
  }
  function openBag() {
    if (authLoading) return
    if (!user) setDialog({ type: 'auth' })
    else {
      setDialog({ type: 'bag' })
      refreshCart().catch((error) => setToast({ message: error.message, error: true }))
    }
  }
  function closeDialog() {
    setDialog(null)
  }
  const effectiveDialog =
    ['bag', 'checkout', 'orders'].includes(dialog?.type) && !user ? { type: 'auth' } : dialog

  return (
    <>
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <div className="announcement">
        <span>Demo store · Illustrative prices and stock</span>
        <span>Free shipping on orders $150+</span>
      </div>
      <header className="site-header">
        <div className="header-inner container">
          <button
            className="wordmark"
            onClick={() => {
              setSearch('')
              setCategory('')
              setInStock(false)
              setSort('featured')
              setPage(1)
              showShop()
              window.scrollTo({ top: 0, behavior: 'auto' })
            }}
            aria-label="JackpotTech home"
          >
            <span className="brand-symbol" aria-hidden="true">
              ♠
            </span>
            Jackpot<span className="brand-tech">Tech</span>
          </button>
          <nav className="main-nav" aria-label="Main navigation">
            <button
              className={view === 'shop' ? 'active' : ''}
              aria-current={view === 'shop' ? 'page' : undefined}
              onClick={() => openCollection()}
            >
              Products
            </button>
            <button
              className={isNewArrivals ? 'active' : ''}
              aria-current={isNewArrivals ? 'page' : undefined}
              onClick={() => openCollection(true)}
            >
              New arrivals
            </button>
            {user?.is_admin && (
              <button className={view === 'admin' ? 'active' : ''} onClick={() => setView('admin')}>
                Manage store
              </button>
            )}
          </nav>
          <div className="header-actions">
            <button
              className="icon-button search-toggle"
              aria-label="Search products"
              onClick={() => {
                showShop(true)
                setTimeout(() => searchRef.current?.focus(), 60)
              }}
            >
              <Icon name="search" />
            </button>
            <button
              className="account-button"
              aria-label={
                authLoading
                  ? 'Loading account'
                  : user
                    ? `Your account, ${user.display_name}`
                    : 'Sign in'
              }
              disabled={authLoading}
              onClick={() => setDialog({ type: user ? 'account' : 'auth' })}
            >
              <Icon name="user" />
              <span>
                {authLoading ? 'Loading…' : user ? user.display_name.split(' ')[0] : 'Sign in'}
              </span>
            </button>
            <button
              className="bag-button"
              aria-label={`Bag, ${count} ${count === 1 ? 'item' : 'items'}`}
              onClick={openBag}
              disabled={authLoading}
            >
              <Icon name="bag" />
              <span className="bag-label">Bag</span>
              <span className="bag-count">{count}</span>
            </button>
          </div>
        </div>
      </header>

      <main id="main">
        {view === 'admin' && user?.is_admin ? (
          <Admin
            token={token}
            categories={categories}
            onCatalogChange={() => setRevision((n) => n + 1)}
          />
        ) : (
          <>
            {!isNewArrivals && (
              <section className="hero container" aria-labelledby="hero-title">
                <div className="hero-copy">
                  <h1 id="hero-title">
                    Electronics for
                    <br />
                    work and play.
                  </h1>
                  <p>
                    Headphones, keyboards, displays, and accessories.
                    <br />
                    Browse the catalog and compare specs.
                  </p>
                  <button className="button primary hero-button" onClick={() => showShop(true)}>
                    Shop products
                  </button>
                </div>
                <div className="hero-scene">
                  <img
                    className="hero-headphones"
                    src="/products/hardware/sony-wh1000xm5.png"
                    alt="Sony WH-1000XM5 headphones in black"
                  />
                </div>
              </section>
            )}
            <section
              className="catalog-section container"
              ref={catalogRef}
              aria-labelledby="collection-title"
            >
              <p className="catalog-disclaimer">
                Real hardware. Demo prices and stock; not live retailer offers.
              </p>
              <div className="section-heading">
                <div>
                  <h2 id="collection-title">{isNewArrivals ? 'New arrivals' : 'Products'}</h2>
                  {isNewArrivals && (
                    <p className="subtle">
                      Products ordered by the date they were added, newest first.
                    </p>
                  )}
                </div>
              </div>
              <div className="catalog-tools">
                <div className="category-tabs" aria-label="Filter by category">
                  <button className={!category ? 'active' : ''} onClick={() => selectCategory('')}>
                    All products
                  </button>
                  {categories.map((item) => (
                    <button
                      key={item.category_id}
                      className={category === String(item.category_id) ? 'active' : ''}
                      onClick={() => selectCategory(item.category_id)}
                    >
                      {item.category_name}
                    </button>
                  ))}
                </div>
                <label className="search-field">
                  <Icon name="search" size={18} />
                  <input
                    ref={searchRef}
                    type="search"
                    value={search}
                    maxLength={150}
                    onChange={(event) => {
                      setSearch(event.target.value)
                      setPage(1)
                    }}
                    placeholder="Search products"
                    aria-label="Search products"
                  />
                </label>
              </div>
              <div className="catalog-subtools">
                <span aria-live="polite">
                  {loading ? 'Loading products…' : `${catalog.total} products`}
                </span>
                <div>
                  <label className="stock-filter">
                    <input
                      type="checkbox"
                      checked={inStock}
                      onChange={(event) => {
                        setInStock(event.target.checked)
                        setPage(1)
                      }}
                    />
                    In stock only
                  </label>
                  {isNewArrivals ? (
                    <span>Newest first</span>
                  ) : (
                    <label className="sort-field">
                      <Icon name="tune" size={15} />
                      <span className="sr-only">Sort products</span>
                      <select
                        value={sort}
                        onChange={(event) => {
                          setSort(event.target.value)
                          setPage(1)
                        }}
                      >
                        <option value="featured">Featured</option>
                        <option value="newest">Newest arrivals</option>
                        <option value="price_asc">Price: low to high</option>
                        <option value="price_desc">Price: high to low</option>
                        <option value="name">Name: A to Z</option>
                      </select>
                    </label>
                  )}
                </div>
              </div>
              {error ? (
                <div className="catalog-error">
                  <ErrorMessage error={error} />
                  <button className="button secondary" onClick={() => setRevision((n) => n + 1)}>
                    Try again
                  </button>
                </div>
              ) : loading ? (
                <div className="product-grid" aria-busy="true" aria-label="Loading products">
                  {[1, 2, 3, 4].map((n) => (
                    <div className="skeleton-card" key={n}>
                      <div />
                      <span />
                      <span />
                    </div>
                  ))}
                </div>
              ) : catalog.items.length ? (
                <>
                  <div className="product-grid">
                    {catalog.items.map((product) => (
                      <ProductCard
                        key={product.product_id}
                        product={product}
                        category={
                          categories.find((c) => c.category_id === product.category_id)
                            ?.category_name
                        }
                        onOpen={(product) => setDialog({ type: 'product', product })}
                        onAdd={addProduct}
                        busy={adding === product.product_id}
                      />
                    ))}
                  </div>
                  {catalog.total > 8 && (
                    <div className="pagination">
                      <button
                        className="button secondary"
                        disabled={page === 1}
                        onClick={() => setPage(page - 1)}
                      >
                        Previous
                      </button>
                      <span>
                        Page {page} of {Math.ceil(catalog.total / 8)}
                      </span>
                      <button
                        className="button secondary"
                        disabled={page * 8 >= catalog.total}
                        onClick={() => setPage(page + 1)}
                      >
                        Next
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="empty-state">
                  <Icon name="search" size={38} />
                  <h3>No products found</h3>
                  <p>Try a different search or clear the filters.</p>
                  <button
                    className="button secondary"
                    onClick={() => {
                      setSearch('')
                      setCategory('')
                      setInStock(false)
                      setPage(1)
                    }}
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </section>
          </>
        )}
      </main>
      <footer className="site-footer">
        <div className="container footer-main">
          <div>
            <div className="wordmark footer-wordmark">
              <span className="brand-symbol" aria-hidden="true">
                ♠
              </span>
              Jackpot<span className="brand-tech">Tech</span>
            </div>
            <p>Electronics and accessories.</p>
          </div>
          <div className="footer-links">
            <span className="eyebrow">Shop</span>
            <button onClick={() => openCollection()}>Products</button>
            <button
              className={isNewArrivals ? 'active' : ''}
              aria-current={isNewArrivals ? 'page' : undefined}
              onClick={() => openCollection(true)}
            >
              New arrivals
            </button>
            <button onClick={() => setDialog({ type: user ? 'orders' : 'auth' })}>
              Your orders
            </button>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© {new Date().getFullYear()} JackpotTech</span>
          <span>Demo store. Orders are not charged or shipped.</span>
        </div>
      </footer>

      {toast && (
        <div
          className={`toast ${toast.error ? 'toast-error' : ''}`}
          role={toast.error ? 'alert' : 'status'}
        >
          {!toast.error && <Icon name="check" size={18} />}
          <span>{toast.message}</span>
          <button
            className="icon-button"
            aria-label="Dismiss notification"
            onClick={() => setToast('')}
          >
            <Icon name="close" size={16} />
          </button>
        </div>
      )}
      {effectiveDialog?.type === 'auth' && (
        <AuthModal
          onClose={closeDialog}
          onSuccess={() => {
            closeDialog()
          }}
        />
      )}
      {effectiveDialog?.type === 'bag' && (
        <BagModal
          cart={cart}
          loading={cartLoading}
          onClose={closeDialog}
          onUpdate={updateBag}
          onCheckout={() => setDialog({ type: 'checkout' })}
          onShop={() => {
            closeDialog()
            showShop(true)
          }}
        />
      )}
      {effectiveDialog?.type === 'checkout' && (
        <CheckoutModal
          cart={cart}
          token={token}
          onClose={closeDialog}
          onComplete={(order) => {
            setDialog({ type: 'success', order })
            setCartState({ token, cart: EMPTY_CART, loading: false })
            setRevision((n) => n + 1)
          }}
        />
      )}
      {effectiveDialog?.type === 'orders' && <OrdersModal token={token} onClose={closeDialog} />}
      {effectiveDialog?.type === 'product' && (
        <ProductModal
          product={effectiveDialog.product}
          token={token}
          onClose={closeDialog}
          onAdd={addProduct}
          busy={adding === effectiveDialog.product.product_id}
          onSignIn={() => setDialog({ type: 'auth' })}
          onReviewAdded={() => setRevision((n) => n + 1)}
        />
      )}
      {effectiveDialog?.type === 'account' && (
        <Modal title="Your account" onClose={closeDialog}>
          <p className="subtle">{user?.email}</p>
          <div className="stack account-menu">
            <button className="button secondary full" onClick={() => setDialog({ type: 'orders' })}>
              <Icon name="box" />
              Your orders
              <Icon name="arrow" />
            </button>
            {user?.is_admin && (
              <button
                className="button secondary full"
                onClick={() => {
                  closeDialog()
                  setView('admin')
                }}
              >
                <Icon name="grid" />
                Manage store
                <Icon name="arrow" />
              </button>
            )}
            <button
              className="button secondary full"
              onClick={() => {
                logout()
                closeDialog()
                setView('shop')
              }}
            >
              <Icon name="logout" />
              Sign out
            </button>
          </div>
        </Modal>
      )}
      {effectiveDialog?.type === 'success' && (
        <Modal title="Order placed" onClose={closeDialog}>
          <p className="success-copy">
            Your demo order{' '}
            <strong>#{String(effectiveDialog.order.order_id).padStart(5, '0')}</strong> is
            confirmed.
          </p>
          <p className="subtle">
            {money(effectiveDialog.order.total_amount)} · No payment was collected.
            <br />
            You can follow its progress in your order history.
          </p>
          <button className="button primary full" onClick={() => setDialog({ type: 'orders' })}>
            View your orders
            <Icon name="arrow" size={18} />
          </button>
        </Modal>
      )}
    </>
  )
}
