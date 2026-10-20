import { useEffect, useState } from 'react'
import { api, money } from '../api'
import Icon from './Icon'
import Modal from './Modal'
import { ProductImage } from './ProductCard'
import { ErrorMessage, OrderList } from './StoreDialogs'

export default function Admin({ token, categories, onCatalogChange }) {
  const [tab, setTab] = useState('inventory')
  const [products, setProducts] = useState([])
  const [orders, setOrders] = useState([])
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [page, setPage] = useState(1)
  const [revision, setRevision] = useState(0)
  const [message, setMessage] = useState('')
  useEffect(() => {
    const controller = new AbortController()
    Promise.all([
      api(`/admin/products?page=${page}`, { token, signal: controller.signal }),
      api(`/admin/orders?page=${page}`, { token, signal: controller.signal }),
    ])
      .then(([products, orders]) => {
        setProducts(products)
        setOrders(orders)
        setLoading(false)
      })
      .catch((error) => {
        if (error.name !== 'AbortError') {
          setError(error)
          setLoading(false)
        }
      })
    return () => controller.abort()
  }, [token, page, revision])
  async function save(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const form = Object.fromEntries(new FormData(event.currentTarget))
    const body = {
      ...form,
      price: form.price,
      category_id: form.category_id ? Number(form.category_id) : null,
      stock_quantity: Number(form.stock_quantity),
      image_url: form.image_url || null,
      is_featured: form.is_featured === 'on',
      is_active: form.is_active === 'on',
    }
    try {
      await api(editing.product_id ? `/admin/products/${editing.product_id}` : '/admin/products', {
        token,
        method: editing.product_id ? 'PUT' : 'POST',
        body,
      })
      setEditing(null)
      setRevision((n) => n + 1)
      onCatalogChange()
      setMessage('Product saved.')
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  async function transition(order, status) {
    setBusy(true)
    setError(null)
    setMessage('')
    try {
      await api(`/admin/orders/${order.order_id}`, { token, method: 'PUT', body: { status } })
      setRevision((n) => n + 1)
      onCatalogChange()
      setMessage(`Order #${order.order_id} updated.`)
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  async function createCategory(event) {
    event.preventDefault()
    setBusy(true)
    setError(null)
    const form = event.currentTarget
    try {
      await api('/admin/categories', {
        token,
        method: 'POST',
        body: { category_name: new FormData(form).get('category_name') },
      })
      form.reset()
      onCatalogChange()
      setMessage('Category created.')
    } catch (error) {
      setError(error)
    } finally {
      setBusy(false)
    }
  }
  const transitions = {
    pending: ['paid', 'cancelled'],
    paid: ['shipped', 'cancelled'],
    shipped: ['delivered'],
    delivered: [],
    cancelled: [],
  }
  return (
    <section className="admin-page container">
      <div className="section-heading">
        <div>
          <span className="eyebrow">Administration</span>
          <h1>Store management</h1>
        </div>
        <button
          className="button primary"
          onClick={() => {
            setError(null)
            setEditing({ is_active: true, stock_quantity: 0 })
          }}
        >
          <Icon name="plus" size={18} />
          New product
        </button>
      </div>
      <div className="admin-tabs">
        {['inventory', 'orders', 'categories'].map((name) => (
          <button
            className={tab === name ? 'active' : ''}
            key={name}
            onClick={() => {
              setTab(name)
              setPage(1)
            }}
          >
            {name}
          </button>
        ))}
      </div>
      {!editing && <ErrorMessage error={error} />}
      {message && (
        <p className="success-text" role="status">
          {message}
        </p>
      )}
      {loading ? (
        <p className="loading-text">Loading store data…</p>
      ) : tab === 'inventory' ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Price</th>
                <th>Stock</th>
                <th>Visibility</th>
                <th>
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.product_id}>
                  <td>
                    <div className="table-product">
                      <ProductImage product={product} />
                      <div>
                        <strong>{product.product_name}</strong>
                        <small>
                          #{product.product_id}
                          {product.is_featured ? ' · Featured' : ''}
                        </small>
                      </div>
                    </div>
                  </td>
                  <td>{money(product.price)}</td>
                  <td>
                    <span className={product.stock_quantity <= 5 ? 'stock-warning' : ''}>
                      {product.stock_quantity} units
                    </span>
                  </td>
                  <td>
                    <span className="status-pill">
                      {product.is_active ? 'Published' : 'Hidden'}
                    </span>
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        setError(null)
                        setEditing(product)
                      }}
                    >
                      Edit product
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!products.length && <p className="empty-state">No products on this page.</p>}
        </div>
      ) : tab === 'orders' ? (
        <div className="admin-orders">
          <p className="subtle">
            Payments are simulated. Mark a pending order as paid to practice fulfillment. Cancelling
            restores stock once.
          </p>
          {orders.length ? (
            orders.map((order) => (
              <div key={order.order_id}>
                <OrderList orders={[order]} />
                <div className="order-actions">
                  {transitions[order.status].map((status) => (
                    <button
                      className="button secondary"
                      key={status}
                      disabled={busy}
                      onClick={() => transition(order, status)}
                    >
                      {status === 'cancelled' ? 'Cancel & restore stock' : `Mark as ${status}`}
                    </button>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <p className="empty-state">No orders on this page.</p>
          )}
        </div>
      ) : (
        <div className="category-admin">
          <div className="category-tags">
            {categories.map((category) => (
              <span key={category.category_id}>{category.category_name}</span>
            ))}
          </div>
          <form className="inline-form" onSubmit={createCategory}>
            <label>
              New category
              <input name="category_name" required maxLength={100} placeholder="e.g. Photography" />
            </label>
            <button className="button primary" disabled={busy}>
              Add category
            </button>
          </form>
        </div>
      )}
      {tab !== 'categories' && (
        <div className="pagination">
          <button
            className="button secondary"
            disabled={page === 1}
            onClick={() => setPage(page - 1)}
          >
            Previous
          </button>
          <span>Page {page}</span>
          <button
            className="button secondary"
            disabled={tab === 'inventory' ? products.length < 100 : orders.length < 20}
            onClick={() => setPage(page + 1)}
          >
            Next
          </button>
        </div>
      )}
      {editing && (
        <Modal
          title={editing.product_id ? 'Edit product' : 'New product'}
          onClose={() => !busy && setEditing(null)}
        >
          <form className="stack" onSubmit={save}>
            <label>
              Product name
              <input
                name="product_name"
                required
                maxLength={150}
                defaultValue={editing.product_name || ''}
              />
            </label>
            <div className="form-columns">
              <label>
                Price (USD)
                <input
                  name="price"
                  type="number"
                  min="0"
                  max="99999999.99"
                  step="0.01"
                  required
                  defaultValue={editing.price || ''}
                />
              </label>
              <label>
                Stock quantity
                <input
                  name="stock_quantity"
                  type="number"
                  min="0"
                  max="1000000"
                  required
                  defaultValue={editing.stock_quantity}
                />
              </label>
            </div>
            <label>
              Category
              <select name="category_id" defaultValue={editing.category_id || ''}>
                <option value="">Uncategorized</option>
                {categories.map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Description
              <textarea
                name="description"
                rows={4}
                maxLength={5000}
                defaultValue={editing.description || ''}
              />
            </label>
            <label>
              Image path or HTTPS URL
              <input
                name="image_url"
                maxLength={2000}
                placeholder="/products/headphones.svg"
                defaultValue={editing.image_url || ''}
              />
            </label>
            <label>
              Manufacturer product URL
              <input
                name="source_url"
                type="url"
                maxLength={2000}
                defaultValue={editing.source_url || ''}
                placeholder="https://manufacturer.example/product"
              />
            </label>
            <div className="form-columns">
              <label className="checkbox-label">
                <input type="checkbox" name="is_featured" defaultChecked={editing.is_featured} />
                Featured
              </label>
              <label className="checkbox-label">
                <input type="checkbox" name="is_active" defaultChecked={editing.is_active} />
                Published
              </label>
            </div>
            <ErrorMessage error={error} />
            <button className="button primary full" disabled={busy}>
              {busy ? 'Saving…' : 'Save product'}
            </button>
          </form>
        </Modal>
      )}
    </section>
  )
}
