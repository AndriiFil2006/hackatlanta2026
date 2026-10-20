"""Manufacturer references and explicit sample-review provenance."""

import sqlalchemy as sa
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("products", sa.Column("source_url", sa.Text, nullable=True))
    op.add_column(
        "reviews", sa.Column("is_demo", sa.Boolean, nullable=False, server_default=sa.false())
    )


def downgrade():
    op.drop_column("reviews", "is_demo")
    op.drop_column("products", "source_url")
