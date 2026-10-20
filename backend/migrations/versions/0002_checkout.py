"""Retry-safe checkout and a persisted price breakdown."""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("orders") as batch:
        batch.add_column(sa.Column("idempotency_key", sa.String(100)))
        for name in ("subtotal_amount", "discount_amount", "shipping_amount"):
            batch.add_column(sa.Column(name, sa.Numeric(10, 2), nullable=False, server_default="0"))
        batch.create_unique_constraint("uq_order_idempotency", ["user_id", "idempotency_key"])
    op.execute("UPDATE orders SET subtotal_amount = total_amount")


def downgrade():
    with op.batch_alter_table("orders") as batch:
        batch.drop_constraint("uq_order_idempotency", type_="unique")
        for name in ("idempotency_key", "subtotal_amount", "discount_amount", "shipping_amount"):
            batch.drop_column(name)
