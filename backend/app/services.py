"""Transaction helpers shared by cart, checkout, and administration."""

from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from . import schemas as s
from .models import Cart, CartItem, OrderItem, OrderPromo, Product, PromoCode, User, utcnow

FREE_SHIPPING_AT = Decimal("150.00")
SHIPPING_FEE = Decimal("8.00")


def shipping_for(subtotal: Decimal) -> Decimal:
    return Decimal("0.00") if subtotal == 0 or subtotal >= FREE_SHIPPING_AT else SHIPPING_FEE


def lock_user(db: Session, user_id: int):
    # Serialize a user's cart mutations and checkout across API replicas.
    db.scalar(select(User).where(User.user_id == user_id).with_for_update())


def user_cart(db: Session, user_id: int) -> Cart:
    cart = db.scalar(select(Cart).where(Cart.user_id == user_id))
    if not cart:
        cart = Cart(user_id=user_id)
        db.add(cart)
        db.flush()
    return cart


def cart_response(db: Session, user_id: int) -> s.CartResponse:
    rows = db.execute(
        select(CartItem, Product)
        .join(Product)
        .join(Cart, Cart.cart_id == CartItem.cart_id)
        .where(Cart.user_id == user_id)
        .order_by(CartItem.cart_item_id)
    ).all()
    subtotal = sum((p.price * item.quantity for item, p in rows), Decimal("0.00"))
    shipping = shipping_for(subtotal)
    return s.CartResponse(
        items=[
            s.CartItemResponse(
                cart_item_id=item.cart_item_id,
                product_id=p.product_id,
                quantity=item.quantity,
                product_name=p.product_name,
                price=p.price,
                image_url=p.image_url,
                stock_quantity=p.stock_quantity,
                is_active=p.is_active,
            )
            for item, p in rows
        ],
        subtotal=subtotal,
        shipping=shipping,
        total=subtotal + shipping,
    )


def valid_promo(db: Session, code: str) -> PromoCode:
    promo = db.scalar(select(PromoCode).where(PromoCode.code == code.strip().upper()))
    if not promo or not promo.is_active or (promo.expires_at and promo.expires_at < utcnow()):
        raise HTTPException(400, "That promo code is invalid or has expired")
    return promo


def promo_discount(subtotal: Decimal, promo: PromoCode | None) -> Decimal:
    if not promo:
        return Decimal("0.00")
    amount = (
        subtotal * min(promo.discount_value, Decimal(100)) / 100
        if promo.discount_type == "percent"
        else promo.discount_value
    )
    return min(subtotal, amount).quantize(Decimal("0.01"))


def order_response(db: Session, order) -> s.OrderResponse:
    items = db.scalars(
        select(OrderItem)
        .where(OrderItem.order_id == order.order_id)
        .order_by(OrderItem.order_item_id)
    ).all()
    codes = db.scalars(
        select(PromoCode.code).join(OrderPromo).where(OrderPromo.order_id == order.order_id)
    ).all()
    return s.OrderResponse(
        order_id=order.order_id,
        user_id=order.user_id,
        status=order.status,
        total_amount=order.total_amount,
        subtotal_amount=order.subtotal_amount,
        discount_amount=order.discount_amount,
        shipping_amount=order.shipping_amount,
        shipping_address=order.shipping_address,
        placed_at=order.placed_at,
        items=[s.OrderItemResponse.model_validate(item) for item in items],
        promo_codes=list(codes),
    )
