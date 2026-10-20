import { useEffect, useState } from 'react'
import { api, dateLabel, money } from '../api'
import { useAuth } from '../AuthContext'
import Icon from './Icon'
import Modal from './Modal'
import { ProductImage } from './ProductCard'

export function ErrorMessage({ error }) {
  return error ? (
    <div className="error-message" role="alert">
      {error.message || error}
      {error.requestId && <small>Reference: {error.requestId}</small>}
    </div>
  ) : null
}

export function AuthModal({ onClose, onSuccess }) {
  const { authenticate } = useAuth()
  const [mode, setMode] = useState('login')
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function submit(event) {
    event.preventDefault()
    const form = Object.fromEntries(new FormData(event.currentTarget))
    setError(null)
    setBusy(true)
    try {
      await authenticate(mode, form)
      onSuccess()
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title={mode === 'login' ? 'Sign in' : 'Create account'} onClose={onClose}>
      <p className="subtle">Sign in to manage your bag and view your orders.</p>
      <div className="segmented">
        <button
          className={mode === 'login' ? 'selected' : ''}
          onClick={() => {
            setMode('login')
            setError(null)
          }}
        >
          Sign in
        </button>
        <button
          className={mode === 'register' ? 'selected' : ''}
          onClick={() => {
            setMode('register')
            setError(null)
          }}
        >
          Create account
        </button>
      </div>
      <form onSubmit={submit} className="stack" key={mode}>
        {mode === 'register' && (
          <label>
            Your name
            <input
              name="display_name"
              autoComplete="name"
              required
              maxLength={100}
              placeholder="Alex Morgan"
            />
          </label>
        )}
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="you@example.com"
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            required
            minLength={mode === 'register' ? 10 : 1}
            maxLength={72}
            placeholder={mode === 'register' ? 'At least 10 characters' : 'Your password'}
          />
        </label>
        <ErrorMessage error={error} />
        <button className="button primary full" disabled={busy}>
          {busy
            ? mode === 'login'
              ? 'Signing in…'
              : 'Creating account…'
            : mode === 'login'
              ? 'Sign in'
              : 'Create account'}
          <Icon name="arrow" size={18} />
        </button>
      </form>
      <p className="fine-print">
        A practice marketplace. Use a test email and fictional shipping details.
      </p>
    </Modal>
  )
}

export function BagModal({ cart, loading, onClose, onUpdate, onCheckout, onShop }) {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  async function update(item, quantity) {
    setBusy(true)
    setError(null)
    try {
      await onUpdate(item, quantity)
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  const count = cart?.items?.reduce((sum, item) => sum + item.quantity, 0) || 0
  return (
    <Modal title={`Your bag${count ? ` (${count})` : ''}`} onClose={onClose} drawer>
      {loading ? (
        <p className="subtle loading-text">Loading your bag…</p>
      ) : !count ? (
        <div className="empty-state">
          <Icon name="bag" size={44} />
          <h3>Your bag is empty</h3>
          <p>Add a product to get started.</p>
          <button className="button primary" onClick={onShop}>
            Browse products
            <Icon name="arrow" size={18} />
          </button>
        </div>
      ) : (
        <>
          <div className="shipping-note">
            <Icon name="truck" size={18} />
            {Number(cart.subtotal) >= 150
              ? 'Your order qualifies for free shipping.'
              : `${money(150 - Number(cart.subtotal))} away from free shipping.`}
          </div>
          <div className="bag-items">
            {cart.items.map((item) => (
              <div className="bag-item" key={item.cart_item_id}>
                <div className="bag-art">
                  <ProductImage product={item} />
                </div>
                <div className="bag-info">
                  <h3>{item.product_name}</h3>
                  <p>{money(item.price)}</p>
                  <div className="quantity-control">
                    <button
                      aria-label={`Decrease ${item.product_name} quantity`}
                      disabled={busy}
                      onClick={() => update(item, item.quantity - 1)}
                    >
                      <Icon name="minus" size={14} />
                    </button>
                    <span>{item.quantity}</span>
                    <button
                      aria-label={`Increase ${item.product_name} quantity`}
                      disabled={busy || item.quantity >= item.stock_quantity || item.quantity >= 99}
                      onClick={() => update(item, item.quantity + 1)}
                    >
                      <Icon name="plus" size={14} />
                    </button>
                  </div>
                  {(!item.is_active || item.quantity > item.stock_quantity) && (
                    <small className="stock-warning">Availability changed. Update your bag.</small>
                  )}
                </div>
                <button
                  className="icon-button"
                  aria-label={`Remove ${item.product_name}`}
                  disabled={busy}
                  onClick={() => update(item, 0)}
                >
                  <Icon name="close" size={16} />
                </button>
              </div>
            ))}
          </div>
          <ErrorMessage error={error} />
          <div className="bag-summary">
            <div>
              <span>Subtotal</span>
              <span>{money(cart.subtotal)}</span>
            </div>
            <div>
              <span>Shipping</span>
              <span>{Number(cart.shipping) === 0 ? 'Free' : money(cart.shipping)}</span>
            </div>
            <div className="total-row">
              <strong>Total</strong>
              <strong>{money(cart.total)}</strong>
            </div>
          </div>
          <button
            className="button primary full"
            onClick={onCheckout}
            disabled={
              busy ||
              cart.items.some((item) => !item.is_active || item.quantity > item.stock_quantity)
            }
          >
            Continue to checkout
            <Icon name="arrow" size={18} />
          </button>
          <p className="fine-print">Demo checkout · No payment information required</p>
        </>
      )}
    </Modal>
  )
}

export function CheckoutModal({ cart, token, onClose, onComplete }) {
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [promo, setPromo] = useState(null)
  const [code, setCode] = useState('')
  const [promoBusy, setPromoBusy] = useState(false)
  const [attempt, setAttempt] = useState(null)
  const subtotal = Number(cart.subtotal)
  const discount = promo
    ? Math.min(
        subtotal,
        promo.discount_type === 'percent'
          ? (subtotal * Math.min(100, Number(promo.discount_value))) / 100
          : Number(promo.discount_value),
      )
    : 0
  async function applyPromo() {
    setError(null)
    setPromoBusy(true)
    try {
      setPromo(await api(`/promo-codes/${encodeURIComponent(code.trim())}`))
    } catch (error) {
      setPromo(null)
      setError(error)
    } finally {
      setPromoBusy(false)
    }
  }
  async function submit(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const body = {
      shipping_address: new FormData(event.currentTarget).get('shipping_address'),
      promo_code: promo?.code || null,
    }
    // Keep the same key/body after ambiguous network failures. The server can safely replay it.
    const nextAttempt = attempt || { body, key: crypto.randomUUID() }
    setAttempt(nextAttempt)
    try {
      const order = await api('/orders', {
        method: 'POST',
        token,
        body: nextAttempt.body,
        headers: { 'Idempotency-Key': nextAttempt.key },
      })
      onComplete(order)
    } catch (error) {
      setError(error)
      if (error.status > 0 && error.status < 500) setAttempt(null)
    } finally {
      setBusy(false)
    }
  }
  return (
    <Modal title="Checkout" onClose={onClose}>
      <p className="subtle">This is a demo order. Nothing will be charged or shipped.</p>
      <form className="stack" onSubmit={submit}>
        <label>
          Shipping address
          <textarea
            name="shipping_address"
            minLength={10}
            maxLength={1000}
            rows={3}
            required
            readOnly={!!attempt}
            placeholder="Alex Morgan, 123 Example Street, Sample City, NY 10001"
          />
        </label>
        <div>
          <label htmlFor="promo-code">Have a promo code?</label>
          <div className="inline-form">
            <input
              id="promo-code"
              value={code}
              onChange={(event) => {
                setCode(event.target.value)
                setPromo(null)
              }}
              disabled={!!attempt}
              placeholder="Try WELCOME10"
              maxLength={50}
            />
            <button
              className="button secondary"
              type="button"
              disabled={!code.trim() || promoBusy || !!attempt}
              onClick={applyPromo}
            >
              {promoBusy ? 'Checking…' : 'Apply'}
            </button>
          </div>
          {promo && <p className="success-text">{promo.code} applied</p>}
        </div>
        <div className="bag-summary">
          <div>
            <span>Subtotal</span>
            <span>{money(subtotal)}</span>
          </div>
          {promo && (
            <div>
              <span>Discount</span>
              <span>−{money(discount)}</span>
            </div>
          )}
          <div>
            <span>Shipping</span>
            <span>{Number(cart.shipping) === 0 ? 'Free' : money(cart.shipping)}</span>
          </div>
          <div className="total-row">
            <strong>Order total</strong>
            <strong>{money(subtotal - discount + Number(cart.shipping))}</strong>
          </div>
        </div>
        <ErrorMessage error={error} />
        {attempt && !busy && (
          <p className="fine-print">
            We couldn’t confirm the result. Retry the same order safely, or close and check your
            order history before starting again.
          </p>
        )}
        <button className="button primary full" disabled={busy || promoBusy}>
          {busy ? 'Placing your order…' : attempt ? 'Retry this order' : 'Place demo order'}
          <Icon name="arrow" size={18} />
        </button>
      </form>
    </Modal>
  )
}

export function OrderList({ orders }) {
  return (
    <div className="order-list">
      {orders.map((order) => (
        <article className="order-card" key={order.order_id}>
          <div className="order-heading">
            <div>
              <span className="eyebrow">ORDER #{String(order.order_id).padStart(5, '0')}</span>
              <p>{dateLabel(order.placed_at)}</p>
            </div>
            <span className={`status-pill ${order.status}`}>{order.status}</span>
          </div>
          {order.items.map((item) => (
            <div className="order-line" key={item.order_item_id}>
              <span>
                {item.product_name_snapshot} <small>× {item.quantity}</small>
              </span>
              <span>{money(Number(item.unit_price) * item.quantity)}</span>
            </div>
          ))}
          <div className="order-total">
            <span>
              {order.promo_codes.length > 0
                ? `Includes ${order.promo_codes.join(', ')} discount`
                : 'Including shipping'}
            </span>
            <strong>{money(order.total_amount)}</strong>
          </div>
        </article>
      ))}
    </div>
  )
}

export function OrdersModal({ token, onClose }) {
  const [orders, setOrders] = useState(null)
  const [error, setError] = useState(null)
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    api(`/orders?page=${page}`, { token, signal: controller.signal })
      .then((data) => {
        setOrders((previous) => (page === 1 ? data : [...previous, ...data]))
        setHasMore(data.length === 20)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') setError(error)
      })
    return () => controller.abort()
  }, [token, page])
  return (
    <Modal title="Your orders" onClose={onClose} wide>
      <p className="subtle">View your orders and their status.</p>
      <ErrorMessage error={error} />
      {!orders && !error ? (
        <p className="loading-text">Loading your orders…</p>
      ) : orders?.length ? (
        <>
          <OrderList orders={orders} />
          {hasMore && (
            <button className="button secondary" onClick={() => setPage(page + 1)}>
              Load more orders
            </button>
          )}
        </>
      ) : (
        !error && (
          <div className="empty-state">
            <Icon name="box" size={40} />
            <h3>No orders yet</h3>
            <p>Orders will appear here after checkout.</p>
          </div>
        )
      )}
    </Modal>
  )
}

export function ProductModal({ product, token, onClose, onAdd, busy, onSignIn, onReviewAdded }) {
  const { user } = useAuth()
  const [reviewPosted, setReviewPosted] = useState(false)
  const [editingReview, setEditingReview] = useState(false)
  const [addError, setAddError] = useState(null)
  const [added, setAdded] = useState(false)
  async function addToBag() {
    setAddError(null)
    setAdded(false)
    const result = await onAdd(product)
    if (result?.error) setAddError(result.error)
    else if (token) setAdded(true)
  }
  const [reviews, setReviews] = useState(null)
  const [error, setError] = useState(null)
  const [reviewBusy, setReviewBusy] = useState(false)
  useEffect(() => {
    const controller = new AbortController()
    api(`/products/${product.product_id}/reviews`, { signal: controller.signal })
      .then(setReviews)
      .catch((error) => {
        if (error.name !== 'AbortError') setError(error)
      })
    return () => controller.abort()
  }, [product.product_id])
  async function submitReview(event) {
    event.preventDefault()
    setReviewBusy(true)
    setError(null)
    const form = event.currentTarget
    const values = Object.fromEntries(new FormData(form))
    try {
      await api(editingReview ? `/reviews/${ownReview.review_id}` : '/reviews', {
        method: editingReview ? 'PATCH' : 'POST',
        token,
        body: {
          ...values,
          rating: Number(values.rating),
          ...(!editingReview && { product_id: product.product_id }),
        },
      })
      setReviews(await api(`/products/${product.product_id}/reviews`))
      form.reset()
      setReviewPosted(editingReview ? 'Your review was updated.' : 'Your review was posted.')
      setEditingReview(false)
      onReviewAdded?.()
    } catch (error) {
      setError(error)
    } finally {
      setReviewBusy(false)
    }
  }
  const customerReviews = (reviews || []).filter((review) => !review.is_demo)
  const demoReviews = (reviews || []).filter((review) => review.is_demo)
  const ratingCounts = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: customerReviews.filter((review) => review.rating === stars).length,
  }))
  const ownReview = customerReviews.find((review) => review.user_id === user?.user_id)
  const average = customerReviews.length
    ? (
        customerReviews.reduce((sum, review) => sum + review.rating, 0) / customerReviews.length
      ).toFixed(1)
    : null
  function reviewEntry(review) {
    return (
      <article className="review" key={review.review_id}>
        <div>
          <strong>{review.display_name}</strong>
          <span className="stars" aria-label={`${review.rating} out of 5 stars`}>
            {'★'.repeat(review.rating)}
            {'☆'.repeat(5 - review.rating)}
          </span>
        </div>
        {review.is_demo && (
          <span className="demo-review-label">Demo review · fictional example</span>
        )}
        <p>{review.comment}</p>
        <small>{dateLabel(review.created_at)}</small>
      </article>
    )
  }
  return (
    <Modal title={product.product_name} onClose={onClose} wide>
      <div className="detail-grid">
        <div className="detail-art">
          <ProductImage product={product} />
        </div>
        <div className="detail-info">
          <span className="eyebrow">Product details</span>
          <p className="detail-description">
            {(product.description?.includes('\n\n')
              ? product.description.split('\n\n').slice(1).join('\n\n')
              : product.description) || 'No description available.'}
          </p>
          {product.source_url && (
            <a
              className="manufacturer-link"
              href={product.source_url}
              target="_blank"
              rel="noopener noreferrer"
            >
              Manufacturer specifications
            </a>
          )}
          <strong className="detail-price">
            {money(product.price)} <small>Demo price</small>
          </strong>
          <p className="stock-label">
            {product.stock_quantity
              ? `${product.stock_quantity} in stock`
              : 'Currently out of stock'}
          </p>
          <button
            className="button primary full"
            onClick={addToBag}
            disabled={!product.stock_quantity || busy}
          >
            {busy ? 'Adding…' : 'Add to bag'}
            <Icon name="plus" size={18} />
          </button>
          <ErrorMessage error={addError} />
          {added && (
            <p className="success-text" role="status">
              Added to your bag.
            </p>
          )}
          <p className="fine-print">Free shipping on orders $150+ · Demo marketplace</p>
        </div>
      </div>
      <section className="reviews" aria-label="Product reviews">
        <h3>Customer reviews</h3>
        <ErrorMessage error={error} />
        {reviews !== null && (
          <div className="rating-summary" aria-label="Customer rating summary">
            <div className="rating-average">
              <strong>{average ? `${average} out of 5` : 'No ratings yet'}</strong>
              <span className="subtle">
                {customerReviews.length} customer{' '}
                {customerReviews.length === 1 ? 'review' : 'reviews'}
              </span>
            </div>
            <div className="rating-breakdown">
              {ratingCounts.map(({ stars, count }) => {
                const percentage = customerReviews.length
                  ? Math.round((count / customerReviews.length) * 100)
                  : 0
                return (
                  <div
                    className="rating-row"
                    key={stars}
                    aria-label={`${stars} stars: ${count} ${count === 1 ? 'review' : 'reviews'} (${percentage}%)`}
                  >
                    <span>{stars} star</span>
                    <meter
                      min="0"
                      max={customerReviews.length || 1}
                      value={count}
                      aria-label={`${stars} star reviews`}
                    />
                    <span>
                      {percentage}% ({count})
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {reviews === null && !error ? (
          <p className="subtle">Loading reviews…</p>
        ) : customerReviews.length ? (
          customerReviews.map(reviewEntry)
        ) : (
          <p className="subtle">No customer reviews yet. Be the first to review this product.</p>
        )}
        {demoReviews.length > 0 && (
          <details className="demo-reviews" open>
            <summary>{demoReviews.length} demo reviews</summary>
            <p className="subtle">
              Fictional examples for this demo store. These are not customer testimonials and do not
              affect customer ratings.
            </p>
            {demoReviews.map(reviewEntry)}
          </details>
        )}
        {reviewPosted && (
          <p className="success-text" role="status">
            {reviewPosted}
          </p>
        )}
        {ownReview && !editingReview ? (
          <div>
            <p className="subtle">You have already reviewed this product.</p>
            <button
              className="button secondary"
              onClick={() => {
                setEditingReview(true)
                setReviewPosted(false)
                setError(null)
              }}
            >
              Edit your review
            </button>
          </div>
        ) : token ? (
          <form
            key={editingReview ? 'edit' : 'create'}
            className="review-form stack"
            onSubmit={submitReview}
          >
            <label>
              Your rating
              <select
                name="rating"
                defaultValue={editingReview ? ownReview.rating : '5'}
                disabled={reviewBusy}
              >
                {[5, 4, 3, 2, 1].map((n) => (
                  <option key={n} value={n}>
                    {n} stars
                  </option>
                ))}
              </select>
            </label>
            <label>
              Your review
              <textarea
                name="comment"
                aria-label="Your review"
                defaultValue={editingReview ? ownReview.comment : ''}
                disabled={reviewBusy}
                rows={3}
                maxLength={2000}
                required
                minLength={5}
                placeholder="What worked well? What could be better?"
              />
            </label>
            <button className="button secondary" disabled={reviewBusy}>
              {reviewBusy ? 'Saving…' : editingReview ? 'Save changes' : 'Submit review'}
            </button>
            {editingReview && (
              <button
                type="button"
                className="button secondary"
                disabled={reviewBusy}
                onClick={() => {
                  setEditingReview(false)
                  setError(null)
                }}
              >
                Cancel
              </button>
            )}
          </form>
        ) : (
          <button className="button secondary" onClick={onSignIn}>
            Sign in to write a review
          </button>
        )}
      </section>
    </Modal>
  )
}
