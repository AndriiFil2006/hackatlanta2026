"""Explicit, repeatable database tasks: python -m app.cli --help."""

import argparse
import getpass

from sqlalchemy import select

from .auth import hash_password
from .catalog_data import CATALOG, DEMO_REVIEWS, LEGACY_CATALOG
from .config import Settings
from .db import make_engine, session_factory
from .models import Category, Product, PromoCode, Review, User


def seed(db):
    """Add real hardware and sample reviews without resetting user inventory or history."""
    for name in sorted({item.category for item in CATALOG}):
        if not db.scalar(select(Category).where(Category.category_name == name)):
            db.add(Category(category_name=name, description=f"{name} hardware"))
    db.flush()
    # Retire only the known fictional fixtures, not products added by an administrator.
    for name, image in LEGACY_CATALOG.items():
        legacy = db.scalars(
            select(Product).where(
                Product.product_name == name,
                Product.image_url == f"/products/{image}.svg",
            )
        ).all()
        for product in legacy:
            product.is_active = False
    demo_users = []
    for number in (1, 2):
        email = f"demo-reviewer-{number}@reviews.example.invalid"
        user = db.scalar(select(User).where(User.email == email))
        if not user:
            # An invalid bcrypt hash disables password login for fixture-only identities.
            user = User(email=email, display_name=f"Demo reviewer {number}", password_hash="!")
            db.add(user)
            db.flush()
        demo_users.append(user)
    for item in CATALOG:
        product = db.scalar(select(Product).where(Product.product_name == item.name))
        if not product:
            category = db.scalar(select(Category).where(Category.category_name == item.category))
            product = Product(
                category_id=category.category_id,
                product_name=item.name,
                description=item.description,
                price=item.price,
                stock_quantity=item.stock,
                image_url=f"/products/hardware/{item.image}",
                source_url=item.source,
                is_featured=item.featured,
            )
            db.add(product)
            db.flush()
        for user, (rating, comment) in zip(demo_users, DEMO_REVIEWS[item.name], strict=True):
            existing = db.scalar(
                select(Review).where(
                    Review.user_id == user.user_id, Review.product_id == product.product_id
                )
            )
            if not existing:
                db.add(
                    Review(
                        user_id=user.user_id,
                        product_id=product.product_id,
                        rating=rating,
                        comment=comment,
                        is_demo=True,
                    )
                )
    if not db.scalar(select(PromoCode).where(PromoCode.code == "WELCOME10")):
        db.add(PromoCode(code="WELCOME10", discount_type="percent", discount_value=10))
    db.commit()


def main():
    parser = argparse.ArgumentParser(description="JackpotTech database administration")
    commands = parser.add_subparsers(dest="command", required=True)
    commands.add_parser("seed", help="Add missing demo products; never reset inventory or users")
    admin = commands.add_parser(
        "create-admin", help="Create/promote an admin; prompts for a password"
    )
    admin.add_argument("email")
    args = parser.parse_args()
    settings = Settings.from_env()
    engine = make_engine(settings.database_url)
    try:
        with session_factory(engine)() as db:
            if args.command == "seed":
                seed(db)
                print(
                    "Real-hardware catalog ready. Legacy demo listings hidden; accounts, orders, "
                    "and existing stock preserved."
                )
            else:
                from pydantic import EmailStr, TypeAdapter

                email = str(TypeAdapter(EmailStr).validate_python(args.email)).lower()
                user = db.scalar(select(User).where(User.email == email))
                if user:
                    user.is_admin = True
                else:
                    password = getpass.getpass("Admin password (10–72 UTF-8 bytes): ")
                    if not 10 <= len(password.encode()) <= 72:
                        raise SystemExit("Password must be 10–72 UTF-8 bytes")
                    db.add(
                        User(
                            email=email,
                            display_name="Store admin",
                            is_admin=True,
                            password_hash=hash_password(password),
                        )
                    )
                db.commit()
                print(f"Administrator enabled: {email}")
    finally:
        engine.dispose()


if __name__ == "__main__":
    main()
