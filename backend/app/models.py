"""Database entities; API request/response contracts live in schemas.py."""

from datetime import UTC, datetime

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


def utcnow():
    return datetime.now(UTC).replace(tzinfo=None)


class User(Base):
    __tablename__ = "users"
    user_id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(Text, nullable=False)
    display_name = Column(String(100), nullable=False)
    is_admin = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)


class Category(Base):
    __tablename__ = "categories"
    category_id = Column(Integer, primary_key=True)
    category_name = Column(String(100), unique=True, nullable=False)
    description = Column(Text)


class Product(Base):
    __tablename__ = "products"
    product_id = Column(Integer, primary_key=True)
    category_id = Column(Integer, ForeignKey("categories.category_id", ondelete="SET NULL"))
    product_name = Column(String(150), nullable=False)
    description = Column(Text)
    price = Column(Numeric(10, 2), nullable=False)
    stock_quantity = Column(Integer, default=0, nullable=False)
    image_url = Column(Text)
    source_url = Column(Text)
    is_featured = Column(Boolean, default=False, nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    __table_args__ = (
        CheckConstraint("price >= 0", name="ck_product_price"),
        CheckConstraint("stock_quantity >= 0", name="ck_product_stock"),
    )


class Cart(Base):
    __tablename__ = "carts"
    cart_id = Column(Integer, primary_key=True)
    user_id = Column(
        Integer, ForeignKey("users.user_id", ondelete="CASCADE"), unique=True, nullable=False
    )
    created_at = Column(DateTime, default=utcnow, nullable=False)
    updated_at = Column(DateTime, default=utcnow, onupdate=utcnow, nullable=False)


class CartItem(Base):
    __tablename__ = "cart_items"
    cart_item_id = Column(Integer, primary_key=True)
    cart_id = Column(Integer, ForeignKey("carts.cart_id", ondelete="CASCADE"), nullable=False)
    product_id = Column(
        Integer, ForeignKey("products.product_id", ondelete="CASCADE"), nullable=False
    )
    quantity = Column(Integer, nullable=False)
    __table_args__ = (
        UniqueConstraint("cart_id", "product_id", name="uq_cart_product"),
        CheckConstraint("quantity > 0", name="ck_cart_quantity"),
    )


class Order(Base):
    __tablename__ = "orders"
    order_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="RESTRICT"), nullable=False)
    status = Column(String(30), default="pending", nullable=False)
    total_amount = Column(Numeric(10, 2), nullable=False)
    shipping_address = Column(Text)
    placed_at = Column(DateTime, default=utcnow, nullable=False)
    idempotency_key = Column(String(100))
    subtotal_amount = Column(Numeric(10, 2), nullable=False, default=0, server_default="0")
    discount_amount = Column(Numeric(10, 2), nullable=False, default=0, server_default="0")
    shipping_amount = Column(Numeric(10, 2), nullable=False, default=0, server_default="0")
    __table_args__ = (
        UniqueConstraint("user_id", "idempotency_key", name="uq_order_idempotency"),
        CheckConstraint("total_amount >= 0", name="ck_order_total"),
        CheckConstraint(
            "status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')",
            name="ck_order_status",
        ),
    )


class OrderItem(Base):
    __tablename__ = "order_items"
    order_item_id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.product_id", ondelete="SET NULL"))
    product_name_snapshot = Column(String(150), nullable=False)
    unit_price = Column(Numeric(10, 2), nullable=False)
    quantity = Column(Integer, nullable=False)
    __table_args__ = (CheckConstraint("quantity > 0", name="ck_order_item_quantity"),)


class Review(Base):
    __tablename__ = "reviews"
    review_id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.user_id", ondelete="CASCADE"), nullable=False)
    product_id = Column(
        Integer, ForeignKey("products.product_id", ondelete="CASCADE"), nullable=False
    )
    is_demo = Column(Boolean, default=False, nullable=False, server_default="false")
    rating = Column(Integer, nullable=False)
    comment = Column(Text)
    created_at = Column(DateTime, default=utcnow, nullable=False)
    __table_args__ = (
        UniqueConstraint("user_id", "product_id", name="uq_user_product"),
        CheckConstraint("rating BETWEEN 1 AND 5", name="ck_review_rating"),
    )


class PromoCode(Base):
    __tablename__ = "promo_codes"
    promo_code_id = Column(Integer, primary_key=True)
    code = Column(String(50), unique=True, nullable=False)
    discount_type = Column(String(20), nullable=False)
    discount_value = Column(Numeric(10, 2), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    expires_at = Column(DateTime)
    __table_args__ = (
        CheckConstraint("discount_type IN ('percent', 'fixed')", name="ck_promo_type"),
        CheckConstraint("discount_value > 0", name="ck_promo_value"),
    )


class OrderPromo(Base):
    __tablename__ = "order_promos"
    order_id = Column(Integer, ForeignKey("orders.order_id", ondelete="CASCADE"), primary_key=True)
    promo_code_id = Column(
        Integer, ForeignKey("promo_codes.promo_code_id", ondelete="CASCADE"), primary_key=True
    )
