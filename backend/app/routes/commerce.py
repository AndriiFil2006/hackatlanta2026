from decimal import Decimal

from fastapi import APIRouter, Depends, Header, HTTPException, Query
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from .. import schemas as s
from ..auth import get_current_user
from ..db import get_db
from ..models import CartItem, Order, OrderItem, OrderPromo, Product, User, utcnow
from ..services import (
    cart_response,
    lock_user,
    order_response,
    promo_discount,
    shipping_for,
    user_cart,
    valid_promo,
)

router = APIRouter(tags=["Shopping"])


@router.get("/cart", response_model=s.CartResponse)
def cart(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return cart_response(db, user.user_id)


@router.post("/cart/items", response_model=s.CartResponse)
def add_item(
    data: s.CartItemCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    lock_user(db, user.user_id)
    product = db.get(Product, data.product_id)
    if not product or not product.is_active:
        raise HTTPException(404, "Product is no longer available")
    cart = user_cart(db, user.user_id)
    item = db.scalar(
        select(CartItem).where(
            CartItem.cart_id == cart.cart_id, CartItem.product_id == product.product_id
        )
    )
    quantity = (item.quantity if item else 0) + data.quantity
    if quantity > product.stock_quantity or quantity > 99:
        raise HTTPException(409, "Not enough stock for that quantity")
    if item:
        item.quantity = quantity
    else:
        db.add(CartItem(cart_id=cart.cart_id, **data.model_dump()))
    cart.updated_at = utcnow()
    db.commit()
    return cart_response(db, user.user_id)


@router.put("/cart/items/{item_id}", response_model=s.CartResponse)
def update_item(
    item_id: int,
    data: s.CartItemUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lock_user(db, user.user_id)
    cart = user_cart(db, user.user_id)
    item = db.scalar(
        select(CartItem).where(CartItem.cart_item_id == item_id, CartItem.cart_id == cart.cart_id)
    )
    if not item:
        raise HTTPException(404, "Cart item not found")
    product = db.get(Product, item.product_id)
    if not product.is_active or data.quantity > product.stock_quantity:
        raise HTTPException(409, "Not enough stock for that quantity")
    item.quantity = data.quantity
    cart.updated_at = utcnow()
    db.commit()
    return cart_response(db, user.user_id)


@router.delete("/cart/items/{item_id}", response_model=s.CartResponse)
def remove_item(
    item_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    lock_user(db, user.user_id)
    cart = user_cart(db, user.user_id)
    item = db.scalar(
        select(CartItem).where(CartItem.cart_item_id == item_id, CartItem.cart_id == cart.cart_id)
    )
    if not item:
        raise HTTPException(404, "Cart item not found")
    db.delete(item)
    cart.updated_at = utcnow()
    db.commit()
    return cart_response(db, user.user_id)


@router.get("/promo-codes/{code}", response_model=s.PromoCodeResponse)
def promo(code: str, db: Session = Depends(get_db)):
    return valid_promo(db, code)


@router.post("/orders", response_model=s.OrderResponse, status_code=201)
def checkout(
    data: s.OrderCreate,
    idempotency_key: str = Header(min_length=8, max_length=100),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    lock_user(db, user.user_id)
    existing = db.scalar(
        select(Order).where(Order.user_id == user.user_id, Order.idempotency_key == idempotency_key)
    )
    if existing:
        return order_response(db, existing)
    cart = user_cart(db, user.user_id)
    items = db.scalars(
        select(CartItem).where(CartItem.cart_id == cart.cart_id).order_by(CartItem.product_id)
    ).all()
    if not items:
        raise HTTPException(400, "Your bag is empty")
    code = valid_promo(db, data.promo_code) if data.promo_code else None
    subtotal = Decimal("0.00")
    snapshots = []
    # Consistent product ordering avoids lock-order deadlocks between shoppers.
    for item in items:
        product = db.scalar(
            select(Product)
            .where(Product.product_id == item.product_id)
            .with_for_update()
            .execution_options(populate_existing=True)
        )
        if not product or not product.is_active:
            raise HTTPException(409, "A product in your bag is no longer available")
        if item.quantity > product.stock_quantity:
            raise HTTPException(409, f"Not enough stock for {product.product_name}")
        product.stock_quantity -= item.quantity
        subtotal += product.price * item.quantity
        snapshots.append(
            OrderItem(
                product_id=product.product_id,
                product_name_snapshot=product.product_name,
                unit_price=product.price,
                quantity=item.quantity,
            )
        )
    discount = promo_discount(subtotal, code)
    shipping = shipping_for(subtotal)
    order = Order(
        user_id=user.user_id,
        shipping_address=data.shipping_address,
        idempotency_key=idempotency_key,
        subtotal_amount=subtotal,
        discount_amount=discount,
        shipping_amount=shipping,
        total_amount=subtotal - discount + shipping,
    )
    db.add(order)
    db.flush()
    for snapshot in snapshots:
        snapshot.order_id = order.order_id
        db.add(snapshot)
    if code:
        db.add(OrderPromo(order_id=order.order_id, promo_code_id=code.promo_code_id))
    db.execute(delete(CartItem).where(CartItem.cart_id == cart.cart_id))
    cart.updated_at = utcnow()
    db.commit()
    return order_response(db, order)


@router.get("/orders", response_model=list[s.OrderResponse])
def orders(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
    page: int = Query(1, ge=1),
):
    rows = db.scalars(
        select(Order)
        .where(Order.user_id == user.user_id)
        .order_by(Order.order_id.desc())
        .offset((page - 1) * 20)
        .limit(20)
    ).all()
    return [order_response(db, order) for order in rows]
