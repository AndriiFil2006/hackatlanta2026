import { useState } from 'react'
import { money } from '../api'
import Icon from './Icon'

export function ProductImage({ product, className = '' }) {
  const [failedUrl, setFailedUrl] = useState(null)
  if (!product.image_url || failedUrl === product.image_url) {
    return (
      <span
        className={`image-placeholder ${className}`}
        role="img"
        aria-label={`No image for ${product.product_name}`}
      >
        <Icon name="box" size={28} />
        <span>Image unavailable</span>
      </span>
    )
  }
  return (
    <img
      className={className}
      src={product.image_url}
      alt={product.product_name}
      loading="lazy"
      onError={() => setFailedUrl(product.image_url)}
    />
  )
}

export default function ProductCard({ product, category, onOpen, onAdd, busy }) {
  const soldOut = product.stock_quantity === 0
  const description = product.description?.includes('\n\n')
    ? product.description.split('\n\n').slice(1).join(' ')
    : product.description
  return (
    <article className="product-card">
      <button
        className="product-art"
        onClick={() => onOpen(product)}
        aria-label={`View ${product.product_name}`}
      >
        <ProductImage product={product} />
      </button>
      <div className="product-meta">
        <span>{category || 'Uncategorized'}</span>
        <span>{soldOut ? 'Out of stock' : `${product.stock_quantity} in stock`}</span>
      </div>
      <div className="product-title">
        <button onClick={() => onOpen(product)}>{product.product_name}</button>
        <strong>{money(product.price)}</strong>
      </div>
      <button
        className="rating-link"
        onClick={() => onOpen(product)}
        aria-label={`Reviews for ${product.product_name}`}
      >
        {product.review_count > 0
          ? `${Number(product.average_rating).toFixed(1)} / 5 · ${product.review_count} customer ${product.review_count === 1 ? 'review' : 'reviews'}`
          : 'No customer reviews'}
        {product.demo_review_count > 0 && <span> · {product.demo_review_count} demo reviews</span>}
      </button>
      {description && <p>{description}</p>}
      <button className="add-button" disabled={soldOut || busy} onClick={() => onAdd(product)}>
        {busy ? 'Adding…' : soldOut ? 'Out of stock' : 'Add to bag'}
        {!soldOut && <Icon name="plus" size={17} />}
      </button>
    </article>
  )
}
