import os
from datetime import timedelta, datetime
from fastapi import FastAPI, Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_
from decimal import Decimal
from dotenv import load_dotenv
from fastapi.middleware.cors import CORSMiddleware

from .db import get_db, test_connection, init_db
from .schemas import (
    User, Category, Product, Cart, CartItem, Order, OrderItem,
    Review, PromoCode, OrderPromo
)
from . import models
from .auth import (
    hash_password, verify_password, create_access_token,
    verify_token, security
)

load_dotenv()

app = FastAPI(title="Market API", version="1.0.0")

_cors_default = (
    "http://localhost:5173,http://127.0.0.1:5173,"
    "http://localhost:3000,http://127.0.0.1:3000"
)
_cors_raw = os.getenv("CORS_ORIGINS", _cors_default)
_cors_origins = [o.strip() for o in _cors_raw.split(",") if o.strip()]
if not _cors_origins:
    _cors_origins = [o.strip() for o in _cors_default.split(",") if o.strip()]
# Browsers treat localhost vs 127.0.0.1 as different origins; LAN / IPv6 need this too.
_cors_regex = os.getenv(
    "CORS_ORIGIN_REGEX",
    r"https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_origin_regex=_cors_regex or None,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize database on startup
@app.on_event("startup")
async def startup_event():
    init_db()

# ==================== Health & Status ====================

@app.get("/")
def root():
    return {"message": "Market API is running"}

@app.get("/health")
def health():
    try:
        test_connection()
        return {"status": "healthy"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Authentication ====================

# @app.post("/auth/register", response_model=models.TokenResponse)
# def register(user_data: models.UserRegister, db: Session = Depends(get_db)):
#     """Register a new user"""
#     # Check if user already exists
#     if db.query(User).filter(User.email == user_data.email).first():
#         raise HTTPException(
#             status_code=status.HTTP_400_BAD_REQUEST,
#             detail="Email already registered"
#         )
#
#     # Create new user
#     db_user = User(
#         email=user_data.email,
#         password_hash=hash_password(user_data.password),
#         display_name=user_data.display_name
#     )
#
#     # Create empty cart for user
#     db.add(db_user)
#     db.flush()
#     db.refresh(db_user)
#
#     cart = Cart(user_id=db_user.user_id)
#     db.add(cart)
#     db.commit()
#
#     # Generate token
#     access_token = create_access_token(data={"sub": user_data.email})
#
#     return {"access_token": access_token, "token_type": "bearer"}

@app.post("/auth/register", response_model=models.TokenResponse)
def register(user_data: models.UserRegister, db: Session = Depends(get_db)):
    try:
        existing = db.query(User).filter(User.email == user_data.email).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        hashed = hash_password(user_data.password)

        db_user = User(
            email=user_data.email,
            password_hash=hashed,
            display_name=user_data.display_name
        )

        db.add(db_user)
        db.flush()
        db.refresh(db_user)

        cart = Cart(user_id=db_user.user_id)
        db.add(cart)

        db.commit()
        db.refresh(db_user)

        access_token = create_access_token(data={"sub": user_data.email})
        return {"access_token": access_token, "token_type": "bearer"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/auth/login", response_model=models.TokenResponse)
def login(user_data: models.UserLogin, db: Session = Depends(get_db)):
    """Login user and get access token"""
    db_user = db.query(User).filter(User.email == user_data.email).first()
    
    if not db_user or not verify_password(user_data.password, db_user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )
    
    access_token = create_access_token(data={"sub": user_data.email})
    return {"access_token": access_token, "token_type": "bearer"}

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    token = credentials.credentials
    email = verify_token(token)
    
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    return user


def _order_to_response(db: Session, order: Order) -> models.OrderResponse:
    items = db.query(OrderItem).filter(OrderItem.order_id == order.order_id).all()
    promo_codes = [
        row[0]
        for row in db.query(PromoCode.code)
        .join(OrderPromo, OrderPromo.promo_code_id == PromoCode.promo_code_id)
        .filter(OrderPromo.order_id == order.order_id)
        .all()
    ]
    return models.OrderResponse(
        order_id=order.order_id,
        user_id=order.user_id,
        status=order.status,
        total_amount=order.total_amount,
        shipping_address=order.shipping_address,
        placed_at=order.placed_at,
        items=[models.OrderItemResponse.model_validate(i) for i in items],
        promo_codes=promo_codes,
    )


def _resolve_promo_for_order(db: Session, code: str | None) -> PromoCode | None:
    if not code or not code.strip():
        return None
    promo = db.query(PromoCode).filter(PromoCode.code == code.strip()).first()
    if not promo:
        raise HTTPException(status_code=400, detail="Invalid promo code")
    if not promo.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promo code is not active",
        )
    if promo.expires_at is not None and promo.expires_at < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promo code has expired",
        )
    return promo


def _discount_from_promo(subtotal: Decimal, promo: PromoCode) -> Decimal:
    if promo.discount_type == "percent":
        pct = min(promo.discount_value, Decimal(100))
        return (subtotal * pct / Decimal(100)).quantize(Decimal("0.01"))
    return min(subtotal, promo.discount_value)


# ==================== User Routes ====================

@app.get("/users/me", response_model=models.UserResponse)
def get_profile(current_user: User = Depends(get_current_user)):
    """Get current user profile"""
    return current_user


@app.get("/users", response_model=list[models.UserResponse])
def list_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Admin only — lists rows from the `users` table."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin only",
        )
    return db.query(User).order_by(User.user_id).all()


# ==================== Category Routes ====================

@app.get("/categories", response_model=list[models.CategoryResponse])
def list_categories(db: Session = Depends(get_db)):
    """List all categories"""
    categories = db.query(Category).all()
    return categories

@app.post("/categories", response_model=models.CategoryResponse)
def create_category(
    category: models.CategoryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new category (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create categories"
        )
    
    db_category = Category(
        category_name=category.category_name,
        description=category.description
    )
    db.add(db_category)
    db.commit()
    db.refresh(db_category)
    return db_category

# ==================== Product Routes ====================

@app.get("/products", response_model=list[models.ProductResponse])
def list_products(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=500),
    category_id: int = Query(None),
    search: str = Query(None),
    featured_only: bool = Query(False),
    db: Session = Depends(get_db)
):
    """List products with filtering and pagination"""
    query = db.query(Product).filter(Product.is_active == True)
    
    if category_id:
        query = query.filter(Product.category_id == category_id)
    
    if search:
        query = query.filter(
            or_(
                Product.product_name.ilike(f"%{search}%"),
                Product.description.ilike(f"%{search}%")
            )
        )
    
    if featured_only:
        query = query.filter(Product.is_featured == True)
    
    products = query.offset(skip).limit(limit).all()
    return products

@app.get("/products/{product_id}", response_model=models.ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db)):
    """Get product details"""
    product = db.query(Product).filter(Product.product_id == product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    return product

@app.post("/products", response_model=models.ProductResponse)
def create_product(
    product: models.ProductCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create a new product (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create products"
        )
    
    db_product = Product(**product.dict())
    db.add(db_product)
    db.commit()
    db.refresh(db_product)
    return db_product

@app.put("/products/{product_id}", response_model=models.ProductResponse)
def update_product(
    product_id: int,
    product: models.ProductUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update product details (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can update products"
        )
    
    db_product = db.query(Product).filter(Product.product_id == product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    update_data = product.dict(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_product, field, value)
    
    db.commit()
    db.refresh(db_product)
    return db_product

# ==================== Cart Routes ====================

@app.get("/cart", response_model=models.CartResponse)
def get_cart(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's cart (`carts` + `cart_items` with product names/prices)."""
    cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
    if not cart:
        cart = Cart(user_id=current_user.user_id)
        db.add(cart)
        db.commit()
        db.refresh(cart)

    cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
    items_out = []
    for ci in cart_items:
        p = db.query(Product).filter(Product.product_id == ci.product_id).first()
        if not p:
            continue
        items_out.append(
            {
                "cart_item_id": ci.cart_item_id,
                "product_id": ci.product_id,
                "quantity": ci.quantity,
                "product_name": p.product_name,
                "price": p.price,
            }
        )

    return {
        "cart_id": cart.cart_id,
        "user_id": cart.user_id,
        "items": items_out,
        "created_at": cart.created_at,
        "updated_at": cart.updated_at,
    }

@app.post("/cart/items", response_model=models.CartItemResponse)
def add_to_cart(
    item: models.CartItemCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Add item to cart"""
    # Verify product exists and has stock
    product = db.query(Product).filter(Product.product_id == item.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    if product.stock_quantity < item.quantity:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Insufficient stock"
        )
    
    # Get or create cart
    cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
    if not cart:
        cart = Cart(user_id=current_user.user_id)
        db.add(cart)
        db.flush()
    
    # Add or update cart item
    cart_item = db.query(CartItem).filter(
        and_(CartItem.cart_id == cart.cart_id, CartItem.product_id == item.product_id)
    ).first()
    
    if cart_item:
        cart_item.quantity += item.quantity
    else:
        cart_item = CartItem(
            cart_id=cart.cart_id,
            product_id=item.product_id,
            quantity=item.quantity
        )
        db.add(cart_item)
    
    db.commit()
    db.refresh(cart_item)
    
    return cart_item

@app.put("/cart/items/{cart_item_id}", response_model=models.CartItemResponse)
def update_cart_item(
    cart_item_id: int,
    item_update: models.CartItemUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update cart item quantity"""
    cart_item = db.query(CartItem).join(Cart).filter(
        and_(CartItem.cart_item_id == cart_item_id, Cart.user_id == current_user.user_id)
    ).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    if item_update.quantity <= 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Quantity must be greater than 0"
        )
    
    cart_item.quantity = item_update.quantity
    db.commit()
    db.refresh(cart_item)
    return cart_item

@app.delete("/cart/items/{cart_item_id}")
def remove_from_cart(
    cart_item_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove item from cart"""
    cart_item = db.query(CartItem).join(Cart).filter(
        and_(CartItem.cart_item_id == cart_item_id, Cart.user_id == current_user.user_id)
    ).first()
    
    if not cart_item:
        raise HTTPException(status_code=404, detail="Cart item not found")
    
    db.delete(cart_item)
    db.commit()
    return {"message": "Item removed from cart"}

# ==================== Order Routes ====================

@app.post("/orders", response_model=models.OrderResponse)
def create_order(
    order_data: models.OrderCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create order from cart (`orders`, `order_items`, optional `order_promos`)."""
    cart = db.query(Cart).filter(Cart.user_id == current_user.user_id).first()
    if not cart:
        raise HTTPException(status_code=404, detail="Cart not found")

    cart_items = db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).all()
    if not cart_items:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cart is empty",
        )

    promo = _resolve_promo_for_order(db, order_data.promo_code)

    subtotal = Decimal(0)
    order_items: list[OrderItem] = []

    for cart_item in cart_items:
        product = (
            db.query(Product)
            .filter(Product.product_id == cart_item.product_id)
            .with_for_update()
            .first()
        )
        if not product:
            raise HTTPException(
                status_code=404, detail=f"Product {cart_item.product_id} not found"
            )

        if product.stock_quantity < cart_item.quantity:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    f"Insufficient stock for '{product.product_name}': "
                    f"need {cart_item.quantity}, have {product.stock_quantity}"
                ),
            )

        item_total = product.price * cart_item.quantity
        subtotal += item_total

        product.stock_quantity -= cart_item.quantity

        order_items.append(
            OrderItem(
                product_id=product.product_id,
                product_name_snapshot=product.product_name,
                unit_price=product.price,
                quantity=cart_item.quantity,
            )
        )

    discount = _discount_from_promo(subtotal, promo) if promo else Decimal(0)
    total = subtotal - discount
    if total < 0:
        total = Decimal(0)

    order = Order(
        user_id=current_user.user_id,
        status="pending",
        total_amount=total,
        shipping_address=order_data.shipping_address,
    )
    db.add(order)
    db.flush()

    for order_item in order_items:
        order_item.order_id = order.order_id
        db.add(order_item)

    if promo:
        db.add(
            OrderPromo(order_id=order.order_id, promo_code_id=promo.promo_code_id)
        )

    db.query(CartItem).filter(CartItem.cart_id == cart.cart_id).delete()

    db.commit()
    db.refresh(order)

    return _order_to_response(db, order)

@app.get("/orders", response_model=list[models.OrderResponse])
def list_orders(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """List user's orders with line items (`order_items`) and `order_promos`."""
    orders = (
        db.query(Order)
        .filter(Order.user_id == current_user.user_id)
        .order_by(Order.placed_at.desc())
        .all()
    )
    return [_order_to_response(db, o) for o in orders]

@app.get("/orders/{order_id}", response_model=models.OrderResponse)
def get_order(
    order_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get order details"""
    order = db.query(Order).filter(
        and_(Order.order_id == order_id, Order.user_id == current_user.user_id)
    ).first()
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    return _order_to_response(db, order)

@app.put("/orders/{order_id}", response_model=models.OrderResponse)
def update_order_status(
    order_id: int,
    status_update: models.OrderStatusUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update order status (admin only or order owner)"""
    order = db.query(Order).filter(Order.order_id == order_id).first()
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.user_id != current_user.user_id and not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this order"
        )
    
    valid_statuses = ["pending", "paid", "shipped", "delivered", "cancelled"]
    if status_update.status not in valid_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}"
        )
    
    order.status = status_update.status
    db.commit()
    db.refresh(order)
    return _order_to_response(db, order)

# ==================== Review Routes ====================

@app.post("/reviews", response_model=models.ReviewResponse)
def create_review(
    review: models.ReviewCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create product review"""
    # Verify product exists
    product = db.query(Product).filter(Product.product_id == review.product_id).first()
    if not product:
        raise HTTPException(status_code=404, detail="Product not found")
    
    # Check if user already reviewed this product
    existing_review = db.query(Review).filter(
        and_(Review.user_id == current_user.user_id, Review.product_id == review.product_id)
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You have already reviewed this product"
        )
    
    if review.rating < 1 or review.rating > 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )
    
    db_review = Review(
        user_id=current_user.user_id,
        product_id=review.product_id,
        rating=review.rating,
        comment=review.comment
    )
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    return db_review

@app.get("/products/{product_id}/reviews", response_model=list[models.ReviewResponse])
def get_product_reviews(
    product_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(10, ge=1, le=100),
    db: Session = Depends(get_db)
):
    """Get reviews for a product"""
    reviews = db.query(Review).filter(
        Review.product_id == product_id
    ).offset(skip).limit(limit).all()
    return reviews

# ==================== Promo Code Routes ====================

@app.post("/promo-codes", response_model=models.PromoCodeResponse)
def create_promo_code(
    promo: models.PromoCodeCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Create promo code (admin only)"""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can create promo codes"
        )
    
    if promo.discount_type not in ["percent", "fixed"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Discount type must be 'percent' or 'fixed'"
        )
    
    db_promo = PromoCode(**promo.dict())
    db.add(db_promo)
    db.commit()
    db.refresh(db_promo)
    return db_promo

@app.get("/promo-codes/{code}")
def validate_promo_code(
    code: str,
    db: Session = Depends(get_db)
):
    """Validate and get promo code details"""
    promo = db.query(PromoCode).filter(PromoCode.code == code).first()
    
    if not promo:
        raise HTTPException(status_code=404, detail="Promo code not found")
    
    if not promo.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promo code is not active"
        )
    
    if promo.expires_at and promo.expires_at < func.now():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Promo code has expired"
        )
    
    return promo
