from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime
from decimal import Decimal

# User Models
class UserRegister(BaseModel):
    email: EmailStr
    password: str
    display_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    user_id: int
    email: str
    display_name: str
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Category Models
class CategoryCreate(BaseModel):
    category_name: str
    description: Optional[str] = None

class CategoryResponse(BaseModel):
    category_id: int
    category_name: str
    description: Optional[str]

    class Config:
        from_attributes = True

# Product Models
class ProductCreate(BaseModel):
    category_id: Optional[int] = None
    product_name: str
    description: Optional[str] = None
    price: Decimal
    stock_quantity: int = 0
    image_url: Optional[str] = None
    is_featured: bool = False

class ProductUpdate(BaseModel):
    product_name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[Decimal] = None
    stock_quantity: Optional[int] = None
    image_url: Optional[str] = None
    is_featured: Optional[bool] = None
    is_active: Optional[bool] = None

class ProductResponse(BaseModel):
    product_id: int
    category_id: Optional[int]
    product_name: str
    description: Optional[str]
    price: Decimal
    stock_quantity: int
    image_url: Optional[str]
    is_featured: bool
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Cart Models
class CartItemCreate(BaseModel):
    product_id: int
    quantity: int

class CartItemUpdate(BaseModel):
    quantity: int

class CartItemResponse(BaseModel):
    cart_item_id: int
    product_id: int
    quantity: int
    product_name: Optional[str] = None
    price: Optional[Decimal] = None

    class Config:
        from_attributes = True

class CartResponse(BaseModel):
    cart_id: int
    user_id: int
    items: List[CartItemResponse]
    created_at: datetime
    updated_at: datetime

# Order Models
class OrderCreate(BaseModel):
    shipping_address: str

class OrderResponse(BaseModel):
    order_id: int
    user_id: int
    status: str
    total_amount: Decimal
    shipping_address: str
    placed_at: datetime
    items: List['OrderItemResponse']

    class Config:
        from_attributes = True

class OrderItemResponse(BaseModel):
    order_item_id: int
    product_id: Optional[int]
    product_name_snapshot: str
    unit_price: Decimal
    quantity: int

    class Config:
        from_attributes = True

class OrderStatusUpdate(BaseModel):
    status: str

# Review Models
class ReviewCreate(BaseModel):
    product_id: int
    rating: int  # 1-5
    comment: Optional[str] = None

class ReviewResponse(BaseModel):
    review_id: int
    user_id: int
    product_id: int
    rating: int
    comment: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Promo Code Models
class PromoCodeCreate(BaseModel):
    code: str
    discount_type: str  # 'percent' or 'fixed'
    discount_value: Decimal
    expires_at: Optional[datetime] = None

class PromoCodeApply(BaseModel):
    code: str

class PromoCodeResponse(BaseModel):
    promo_code_id: int
    code: str
    discount_type: str
    discount_value: Decimal
    is_active: bool
    expires_at: Optional[datetime]

    class Config:
        from_attributes = True

# Auth Models
class TokenResponse(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
