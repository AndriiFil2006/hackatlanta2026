"""Marketplace baseline. Frozen schema; never import application models here."""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "users",
        sa.Column("user_id", sa.Integer, primary_key=True),
        sa.Column("email", sa.String(255), nullable=False, unique=True),
        sa.Column("password_hash", sa.Text, nullable=False),
        sa.Column("display_name", sa.String(100), nullable=False),
        sa.Column("is_admin", sa.Boolean, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "categories",
        sa.Column("category_id", sa.Integer, primary_key=True),
        sa.Column("category_name", sa.String(100), nullable=False, unique=True),
        sa.Column("description", sa.Text),
    )
    op.create_table(
        "products",
        sa.Column("product_id", sa.Integer, primary_key=True),
        sa.Column(
            "category_id", sa.Integer, sa.ForeignKey("categories.category_id", ondelete="SET NULL")
        ),
        sa.Column("product_name", sa.String(150), nullable=False),
        sa.Column("description", sa.Text),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("stock_quantity", sa.Integer, nullable=False),
        sa.Column("image_url", sa.Text),
        sa.Column("is_featured", sa.Boolean, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.CheckConstraint("price >= 0", name="ck_product_price"),
        sa.CheckConstraint("stock_quantity >= 0", name="ck_product_stock"),
    )
    op.create_table(
        "carts",
        sa.Column("cart_id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
            unique=True,
        ),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("updated_at", sa.DateTime, nullable=False),
    )
    op.create_table(
        "cart_items",
        sa.Column("cart_item_id", sa.Integer, primary_key=True),
        sa.Column(
            "cart_id",
            sa.Integer,
            sa.ForeignKey("carts.cart_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            sa.Integer,
            sa.ForeignKey("products.product_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.UniqueConstraint("cart_id", "product_id", name="uq_cart_product"),
        sa.CheckConstraint("quantity > 0", name="ck_cart_quantity"),
    )
    op.create_table(
        "orders",
        sa.Column("order_id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.user_id", ondelete="RESTRICT"),
            nullable=False,
        ),
        sa.Column("status", sa.String(30), nullable=False),
        sa.Column("total_amount", sa.Numeric(10, 2), nullable=False),
        sa.Column("shipping_address", sa.Text),
        sa.Column("placed_at", sa.DateTime, nullable=False),
        sa.CheckConstraint("total_amount >= 0", name="ck_order_total"),
        sa.CheckConstraint(
            "status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')",
            name="ck_order_status",
        ),
    )
    op.create_table(
        "order_items",
        sa.Column("order_item_id", sa.Integer, primary_key=True),
        sa.Column(
            "order_id",
            sa.Integer,
            sa.ForeignKey("orders.order_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id", sa.Integer, sa.ForeignKey("products.product_id", ondelete="SET NULL")
        ),
        sa.Column("product_name_snapshot", sa.String(150), nullable=False),
        sa.Column("unit_price", sa.Numeric(10, 2), nullable=False),
        sa.Column("quantity", sa.Integer, nullable=False),
        sa.CheckConstraint("quantity > 0", name="ck_order_item_quantity"),
    )
    op.create_table(
        "reviews",
        sa.Column("review_id", sa.Integer, primary_key=True),
        sa.Column(
            "user_id",
            sa.Integer,
            sa.ForeignKey("users.user_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "product_id",
            sa.Integer,
            sa.ForeignKey("products.product_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("rating", sa.Integer, nullable=False),
        sa.Column("comment", sa.Text),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.UniqueConstraint("user_id", "product_id", name="uq_user_product"),
        sa.CheckConstraint("rating BETWEEN 1 AND 5", name="ck_review_rating"),
    )
    op.create_table(
        "promo_codes",
        sa.Column("promo_code_id", sa.Integer, primary_key=True),
        sa.Column("code", sa.String(50), nullable=False, unique=True),
        sa.Column("discount_type", sa.String(20), nullable=False),
        sa.Column("discount_value", sa.Numeric(10, 2), nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False),
        sa.Column("expires_at", sa.DateTime),
        sa.CheckConstraint("discount_type IN ('percent', 'fixed')", name="ck_promo_type"),
        sa.CheckConstraint("discount_value > 0", name="ck_promo_value"),
    )
    op.create_table(
        "order_promos",
        sa.Column(
            "order_id",
            sa.Integer,
            sa.ForeignKey("orders.order_id", ondelete="CASCADE"),
            primary_key=True,
        ),
        sa.Column(
            "promo_code_id",
            sa.Integer,
            sa.ForeignKey("promo_codes.promo_code_id", ondelete="CASCADE"),
            primary_key=True,
        ),
    )


def downgrade():
    for table in (
        "order_promos",
        "reviews",
        "order_items",
        "orders",
        "cart_items",
        "carts",
        "promo_codes",
        "products",
        "categories",
        "users",
    ):
        op.drop_table(table)
