from concurrent.futures import ThreadPoolExecutor
from decimal import Decimal

import pytest
from alembic import command
from conftest import register
from fastapi.testclient import TestClient
from sqlalchemy import select, text

from app.auth import create_access_token
from app.cli import seed
from app.models import Order, Product, User


def first_product(client):
    return client.get("/api/products").json()["items"][0]


def add(client, headers, product_id, quantity=1):
    return client.post(
        "/api/cart/items", headers=headers, json={"product_id": product_id, "quantity": quantity}
    )


def checkout(client, headers, key="checkout-attempt-1", **body):
    return client.post(
        "/api/orders",
        headers={**headers, "Idempotency-Key": key},
        json={"shipping_address": "123 Example Street, Sample City, NY 10001", **body},
    )


def test_health_and_readiness(client, app):
    assert client.get("/health/live").json() == {"status": "ok", "version": "test-version"}
    assert client.get("/health/ready").status_code == 200
    with app.state.engine.begin() as db:
        db.execute(text("UPDATE alembic_version SET version_num='0001'"))
    assert client.get("/health/ready").status_code == 503
    assert client.get("/health/live").status_code == 200


def test_migrations_match_models_and_can_roundtrip(app):
    from alembic.autogenerate import compare_metadata
    from alembic.migration import MigrationContext

    from app.models import Base

    with app.state.engine.connect() as connection:
        differences = compare_metadata(MigrationContext.configure(connection), Base.metadata)
    assert differences == []
    command.downgrade(app.state.migration_config, "0001")
    command.upgrade(app.state.migration_config, "head")
    with app.state.engine.connect() as connection:
        assert (
            connection.execute(text("SELECT version_num FROM alembic_version")).scalar() == "0003"
        )


def test_auth_registration_login_and_duplicates(client, shopper):
    me = client.get("/api/users/me", headers=shopper)
    assert me.status_code == 200
    assert me.json()["display_name"] == "Alex Morgan"
    assert "password_hash" not in me.json()
    duplicate = client.post(
        "/api/auth/register",
        json={
            "email": "ALEX@example.com",
            "password": "test-password-123",
            "display_name": "Alex",
        },
    )
    assert duplicate.status_code == 409
    assert (
        client.post(
            "/api/auth/login", json={"email": "alex@example.com", "password": "wrong-password"}
        ).status_code
        == 401
    )
    assert (
        client.post(
            "/api/auth/login", json={"email": "ALEX@example.com", "password": "test-password-123"}
        ).status_code
        == 200
    )
    assert client.get("/api/users/me").status_code == 401
    assert (
        client.get("/api/users/me", headers={"Authorization": "Bearer forged"}).status_code == 401
    )


def test_expired_token_rejected(client, app, shopper):
    from dataclasses import replace

    with app.state.sessions() as db:
        user = db.scalar(select(User).where(User.email == "alex@example.com"))
        token = create_access_token(user, replace(app.state.settings, token_minutes=-1))
    assert (
        client.get("/api/users/me", headers={"Authorization": f"Bearer {token}"}).status_code == 401
    )


def test_catalog_filter_sort_pagination_and_seed_idempotence(client, app):
    data = client.get("/api/products?page_size=2&sort=price_asc").json()
    assert len(data["items"]) == 2
    assert data["total"] == 8
    assert Decimal(data["items"][0]["price"]) <= Decimal(data["items"][1]["price"])
    second = client.get("/api/products?page_size=2&page=2&sort=price_asc").json()
    assert data["items"][0]["product_id"] != second["items"][0]["product_id"]
    assert client.get("/api/products?search=Sony").json()["total"] == 1
    assert client.get("/api/products?in_stock=true").json()["total"] == 7
    assert client.get("/api/products?featured_only=true").json()["total"] == 4
    assert client.get("/api/products?search=%25").json()["total"] == 1  # Literal "75%"
    with app.state.sessions() as db:
        product = db.get(Product, first_product(client)["product_id"])
        product.stock_quantity = 2
        db.commit()
        seed(db)
        assert product.stock_quantity == 2
    assert client.get("/api/products").json()["total"] == 8


@pytest.mark.parametrize("quantity", [0, -1, 100])
def test_invalid_quantities_rejected(client, shopper, quantity):
    assert add(client, shopper, first_product(client)["product_id"], quantity).status_code == 422


def test_cart_stock_total_and_ownership(client, shopper):
    product = first_product(client)
    result = add(client, shopper, product["product_id"], 2)
    assert result.status_code == 200
    item = result.json()["items"][0]
    assert Decimal(result.json()["subtotal"]) == Decimal(product["price"]) * 2
    other = register(client, "other@example.com")
    assert client.get("/api/cart", headers=other).json()["items"] == []
    assert (
        client.delete(f"/api/cart/items/{item['cart_item_id']}", headers=other).status_code == 404
    )
    assert add(client, shopper, product["product_id"], product["stock_quantity"]).status_code == 409
    response = client.put(
        f"/api/cart/items/{item['cart_item_id']}", headers=shopper, json={"quantity": 1}
    )
    assert response.json()["items"][0]["quantity"] == 1
    assert (
        client.delete(f"/api/cart/items/{item['cart_item_id']}", headers=shopper).json()["items"]
        == []
    )


def test_checkout_price_discount_inventory_and_retry(client, shopper, app):
    product = first_product(client)
    add(client, shopper, product["product_id"])
    response = checkout(client, shopper, promo_code="welcome10")
    assert response.status_code == 201, response.text
    order = response.json()
    price = Decimal(product["price"])
    assert Decimal(order["subtotal_amount"]) == price
    assert Decimal(order["discount_amount"]) == (price / 10).quantize(Decimal("0.01"))
    expected_shipping = Decimal(0) if price >= 150 else Decimal(8)
    assert (
        Decimal(order["total_amount"])
        == price - Decimal(order["discount_amount"]) + expected_shipping
    )
    assert order["promo_codes"] == ["WELCOME10"]
    assert client.get("/api/cart", headers=shopper).json()["items"] == []
    retry = checkout(client, shopper, promo_code="welcome10")
    assert retry.json()["order_id"] == order["order_id"]
    assert len(client.get("/api/orders", headers=shopper).json()) == 1
    with app.state.sessions() as db:
        assert (
            db.get(Product, product["product_id"]).stock_quantity == product["stock_quantity"] - 1
        )
    assert checkout(client, shopper, key="different-attempt").status_code == 400
    other = register(client, "other@example.com")
    assert client.get("/api/orders", headers=other).json() == []
    assert (
        client.put(
            f"/api/admin/orders/{order['order_id']}", headers=shopper, json={"status": "paid"}
        ).status_code
        == 403
    )


def test_shipping_fee_and_client_cannot_supply_price(client, shopper):
    product = client.get("/api/products?sort=price_asc").json()["items"][0]
    add(client, shopper, product["product_id"])
    assert checkout(client, shopper, total_amount=0).status_code == 422
    assert checkout(client, shopper, promo_code="NOPE").status_code == 400
    response = checkout(client, shopper)
    assert response.status_code == 201
    assert Decimal(response.json()["shipping_amount"]) == Decimal("8")


def test_failed_checkout_rolls_back_every_product(client, shopper, app):
    products = client.get("/api/products?sort=name").json()["items"]
    stocked = sorted((p for p in products if p["stock_quantity"]), key=lambda p: p["product_id"])
    first, second = stocked[:2]
    add(client, shopper, first["product_id"])
    add(client, shopper, second["product_id"])
    with app.state.sessions() as db:
        db.get(Product, second["product_id"]).stock_quantity = 0
        db.commit()
    assert checkout(client, shopper).status_code == 409
    with app.state.sessions() as db:
        assert db.get(Product, first["product_id"]).stock_quantity == first["stock_quantity"]
        assert db.scalars(select(Order)).all() == []
    assert len(client.get("/api/cart", headers=shopper).json()["items"]) == 2


def test_admin_inventory_visibility_and_cancellation(client, shopper, admin, app):
    product = first_product(client)
    assert client.get("/api/admin/products", headers=shopper).status_code == 403
    payload = {
        key: product[key]
        for key in [
            "category_id",
            "product_name",
            "description",
            "price",
            "stock_quantity",
            "image_url",
            "is_featured",
            "is_active",
        ]
    }
    assert (
        client.put(
            f"/api/admin/products/{product['product_id']}",
            headers=admin,
            json={**payload, "stock_quantity": -1},
        ).status_code
        == 422
    )
    add(client, shopper, product["product_id"])
    order = checkout(client, shopper).json()
    endpoint = f"/api/admin/orders/{order['order_id']}"
    assert client.put(endpoint, headers=admin, json={"status": "delivered"}).status_code == 409
    assert client.put(endpoint, headers=admin, json={"status": "cancelled"}).status_code == 200
    assert client.put(endpoint, headers=admin, json={"status": "cancelled"}).status_code == 200
    with app.state.sessions() as db:
        assert db.get(Product, product["product_id"]).stock_quantity == product["stock_quantity"]
    assert client.put(endpoint, headers=admin, json={"status": "paid"}).status_code == 409
    assert (
        client.put(
            f"/api/admin/products/{product['product_id']}",
            headers=admin,
            json={**payload, "is_active": False},
        ).status_code
        == 200
    )
    assert client.get(f"/api/products/{product['product_id']}").status_code == 404
    assert add(client, shopper, product["product_id"]).status_code == 404


def test_reviews_validation_and_duplicate(client, shopper):
    product = first_product(client)
    body = {"product_id": product["product_id"], "rating": 5, "comment": "Great everyday sound."}
    assert (
        client.post("/api/reviews", headers=shopper, json={**body, "rating": 6}).status_code == 422
    )
    assert client.post("/api/reviews", headers=shopper, json=body).status_code == 201
    assert client.post("/api/reviews", headers=shopper, json=body).status_code == 409
    reviews = client.get(f"/api/products/{product['product_id']}/reviews").json()
    assert reviews[0]["display_name"] == "Alex Morgan"


def test_request_ids_cors_and_safe_errors(client, app):
    response = client.get("/health/live", headers={"X-Request-ID": "release-smoke-test"})
    assert response.headers["X-Request-ID"] == "release-smoke-test"
    response = client.options(
        "/api/cart",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "GET",
            "Access-Control-Request-Headers": "authorization",
        },
    )
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    response = client.options(
        "/api/reviews/18",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "PATCH",
            "Access-Control-Request-Headers": "authorization,content-type",
        },
    )
    assert response.status_code == 200
    assert response.headers["access-control-allow-origin"] == "http://localhost:5173"
    assert "PATCH" in response.headers["access-control-allow-methods"]
    assert (
        "access-control-allow-origin"
        not in client.get(
            "/health/live",
            headers={
                "Origin": "https://untrusted.example",
            },
        ).headers
    )

    @app.get("/test-error")
    def error():
        raise RuntimeError("secret database credentials")

    response = client.get("/test-error")
    assert response.status_code == 500
    assert "secret" not in response.text
    assert response.json()["request_id"] == response.headers["X-Request-ID"]


def test_production_settings_require_real_configuration(monkeypatch):
    from app.config import Settings

    monkeypatch.setenv("APP_ENV", "production")
    monkeypatch.setenv("SECRET_KEY", "development-only-secret-change-before-deploying")
    with pytest.raises(ValueError, match="SECRET_KEY"):
        Settings.from_env()
    monkeypatch.setenv("SECRET_KEY", "a-random-test-secret-that-is-long-enough-12345")
    monkeypatch.setenv("DATABASE_URL", "sqlite:///./local.db")
    with pytest.raises(ValueError, match="PostgreSQL"):
        Settings.from_env()


def test_postgres_concurrent_checkout_does_not_oversell(client, app):
    if app.state.engine.dialect.name != "postgresql":
        pytest.skip("Run with TEST_DATABASE_URL for PostgreSQL concurrency coverage")
    first = register(client, "first@example.com")
    second = register(client, "second@example.com")
    product = first_product(client)
    with app.state.sessions() as db:
        db.get(Product, product["product_id"]).stock_quantity = 1
        db.commit()
    add(client, first, product["product_id"])
    add(client, second, product["product_id"])

    def purchase(headers):
        with TestClient(app) as parallel_client:
            return checkout(parallel_client, headers).status_code

    with ThreadPoolExecutor(max_workers=2) as executor:
        statuses = sorted(executor.map(purchase, [first, second]))
    assert statuses == [201, 409]
    with app.state.sessions() as db:
        assert db.get(Product, product["product_id"]).stock_quantity == 0
        assert len(db.scalars(select(Order)).all()) == 1


def test_postgres_concurrent_retry_creates_one_order(client, app, shopper):
    if app.state.engine.dialect.name != "postgresql":
        pytest.skip("Run with TEST_DATABASE_URL for PostgreSQL concurrency coverage")
    product = first_product(client)
    add(client, shopper, product["product_id"])

    def purchase(_):
        with TestClient(app) as parallel_client:
            return checkout(parallel_client, shopper).json()["order_id"]

    with ThreadPoolExecutor(max_workers=2) as executor:
        ids = list(executor.map(purchase, range(2)))
    assert ids[0] == ids[1]
    with app.state.sessions() as db:
        assert (
            db.get(Product, product["product_id"]).stock_quantity == product["stock_quantity"] - 1
        )


def test_registration_preserves_passwords_and_rejects_privilege_injection(client):
    body = {
        "email": "new@example.com",
        "display_name": "New Shopper",
        "password": "  example-password-123  ",
    }
    assert client.post("/api/auth/register", json={**body, "is_admin": True}).status_code == 422
    assert client.post("/api/auth/register", json={**body, "password": "short"}).status_code == 422
    assert client.post("/api/auth/register", json={**body, "password": "é" * 40}).status_code == 422
    assert client.post("/api/auth/register", json=body).status_code == 201
    assert (
        client.post(
            "/api/auth/login", json={"email": body["email"], "password": body["password"]}
        ).status_code
        == 200
    )
    assert (
        client.post(
            "/api/auth/login", json={"email": body["email"], "password": body["password"].strip()}
        ).status_code
        == 401
    )


def test_newest_products_sort_by_date_then_descending_id(client, app):
    from datetime import datetime

    with app.state.sessions() as db:
        products = list(db.scalars(select(Product).order_by(Product.product_id)))
        for product in products:
            product.created_at = datetime(2020, 1, 1)
        products[0].created_at = datetime(2030, 1, 1)
        expected = [products[0].product_id] + [p.product_id for p in reversed(products[1:])]
        db.commit()
    response = client.get("/api/products?sort=newest")
    assert response.status_code == 200
    assert [p["product_id"] for p in response.json()["items"]] == expected


def test_demo_reviews_are_labeled_and_excluded_from_customer_ratings(client, shopper):
    product = first_product(client)
    assert product["review_count"] == 0
    assert product["average_rating"] is None
    assert product["demo_review_count"] == 2
    reviews = client.get(f"/api/products/{product['product_id']}/reviews").json()
    assert len(reviews) == 2
    assert all(review["is_demo"] for review in reviews)
    body = {
        "product_id": product["product_id"],
        "rating": 5,
        "comment": "Clear sound and comfortable fit.",
    }
    assert (
        client.post("/api/reviews", headers=shopper, json={**body, "is_demo": True}).status_code
        == 422
    )
    assert client.post("/api/reviews", headers=shopper, json=body).status_code == 201
    summary = client.get(f"/api/products/{product['product_id']}").json()
    assert summary["average_rating"] == 5
    assert summary["review_count"] == 1
    assert summary["demo_review_count"] == 2
    other = register(client, "another-reviewer@example.com")
    assert client.post("/api/reviews", headers=other, json={**body, "rating": 1}).status_code == 201
    summary = client.get(f"/api/products/{product['product_id']}").json()
    assert summary["average_rating"] == 3
    assert summary["review_count"] == 2
    assert summary["demo_review_count"] == 2


def test_real_catalog_seed_preserves_history_and_only_hides_known_fixtures(client, app, shopper):
    from app.models import OrderItem

    with app.state.sessions() as db:
        owner = db.scalar(select(User).where(User.email == "alex@example.com"))
        legacy = Product(
            product_name="Studio Wireless",
            image_url="/products/headphones.svg",
            price=189,
            stock_quantity=11,
        )
        custom = Product(
            product_name="Studio Wireless",
            image_url="https://example.com/custom.jpg",
            price=249,
            stock_quantity=4,
        )
        db.add_all([legacy, custom])
        db.flush()
        order = Order(
            user_id=owner.user_id, total_amount=189, shipping_address="123 Example Street"
        )
        db.add(order)
        db.flush()
        db.add(
            OrderItem(
                order_id=order.order_id,
                product_id=legacy.product_id,
                product_name_snapshot="Studio Wireless",
                unit_price=189,
                quantity=1,
            )
        )
        db.commit()
        seed(db)
        seed(db)
        assert legacy.is_active is False
        assert legacy.stock_quantity == 11
        assert custom.is_active is True
        assert custom.stock_quantity == 4
        assert db.get(Order, order.order_id).total_amount == 189
        assert (
            db.scalar(
                select(OrderItem).where(OrderItem.order_id == order.order_id)
            ).product_name_snapshot
            == "Studio Wireless"
        )
    assert len(client.get("/api/orders", headers=shopper).json()) == 1


def test_review_edits_require_ownership_and_refresh_ratings(client, shopper):
    product = first_product(client)
    product_id = product["product_id"]
    body = {"product_id": product_id, "rating": 5, "comment": "Original review text."}
    assert client.post("/api/reviews", headers=shopper, json=body).status_code == 201
    reviews = client.get(f"/api/products/{product_id}/reviews").json()
    review = next(r for r in reviews if not r["is_demo"])
    url = f"/api/reviews/{review['review_id']}"
    update = {"rating": 2, "comment": "Updated after more use."}
    assert client.patch(url, json=update).status_code == 401
    other = register(client, "other-editor@example.com")
    assert client.patch(url, headers=other, json=update).status_code == 403
    for invalid in [
        {**update, "rating": 6},
        {**update, "comment": "x"},
        {**update, "user_id": 123},
    ]:
        assert client.patch(url, headers=shopper, json=invalid).status_code == 422
    demo = next(r for r in reviews if r["is_demo"])
    assert (
        client.patch(f"/api/reviews/{demo['review_id']}", headers=shopper, json=update).status_code
        == 403
    )
    assert client.patch("/api/reviews/999999", headers=shopper, json=update).status_code == 404
    assert client.patch(url, headers=shopper, json=update).status_code == 200
    updated = next(
        r
        for r in client.get(f"/api/products/{product_id}/reviews").json()
        if r["review_id"] == review["review_id"]
    )
    assert updated["rating"] == 2
    assert updated["comment"] == update["comment"]
    assert updated["created_at"] == review["created_at"]
    summary = client.get(f"/api/products/{product_id}").json()
    assert summary["average_rating"] == 2
    assert summary["review_count"] == 1
