from datetime import datetime
from decimal import Decimal
from typing import Annotated, Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, StringConstraints, field_validator

Money = Annotated[Decimal, Field(ge=0, max_digits=10, decimal_places=2)]
Quantity = Annotated[int, Field(ge=1, le=99)]
OrderStatus = Literal["pending", "paid", "shipped", "delivered", "cancelled"]


class Contract(BaseModel):
    model_config = ConfigDict(from_attributes=True, str_strip_whitespace=True, extra="forbid")


class UserRegister(Contract):
    email: EmailStr
    password: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(
        min_length=10, max_length=72
    )
    display_name: str = Field(min_length=1, max_length=100)

    @field_validator("password")
    @classmethod
    def password_bytes(cls, value):
        if len(value.encode()) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes")
        return value


class UserLogin(Contract):
    email: EmailStr
    password: Annotated[str, StringConstraints(strip_whitespace=False)] = Field(
        min_length=1, max_length=72
    )


class UserResponse(Contract):
    user_id: int
    email: str
    display_name: str
    is_admin: bool
    created_at: datetime


class TokenResponse(Contract):
    access_token: str
    token_type: str = "bearer"


class CategoryCreate(Contract):
    category_name: str = Field(min_length=1, max_length=100)
    description: str | None = Field(default=None, max_length=1000)


class CategoryResponse(CategoryCreate):
    category_id: int


class ProductCreate(Contract):
    category_id: int | None = None
    product_name: str = Field(min_length=1, max_length=150)
    description: str = Field(default="", max_length=5000)
    price: Money
    stock_quantity: int = Field(default=0, ge=0, le=1_000_000)
    image_url: str | None = Field(default=None, max_length=2000)
    source_url: str | None = Field(default=None, max_length=2000)
    is_featured: bool = False
    is_active: bool = True

    @field_validator("source_url")
    @classmethod
    def manufacturer_url(cls, value):
        if value and not value.startswith("https://"):
            raise ValueError("Manufacturer URL must use HTTPS")
        return value

    @field_validator("image_url")
    @classmethod
    def image_path(cls, value):
        if value and not (
            value.startswith("https://") or (value.startswith("/products/") and ".." not in value)
        ):
            raise ValueError("Image must be an HTTPS URL or a /products/ asset path")
        return value


class ProductUpdate(ProductCreate):
    """Full editable product contract; PUT replaces these fields."""


class ProductResponse(ProductCreate):
    average_rating: float | None = None
    review_count: int = 0
    demo_review_count: int = 0
    product_id: int
    created_at: datetime
    description: str | None


class ProductPage(Contract):
    items: list[ProductResponse]
    total: int
    page: int
    page_size: int


class CartItemCreate(Contract):
    product_id: int = Field(gt=0)
    quantity: Quantity


class CartItemUpdate(Contract):
    quantity: Quantity


class CartItemResponse(Contract):
    cart_item_id: int
    product_id: int
    quantity: int
    product_name: str
    price: Decimal
    image_url: str | None
    stock_quantity: int
    is_active: bool


class CartResponse(Contract):
    items: list[CartItemResponse]
    subtotal: Decimal
    shipping: Decimal
    total: Decimal


class OrderCreate(Contract):
    shipping_address: str = Field(min_length=10, max_length=1000)
    promo_code: str | None = Field(default=None, max_length=50)


class OrderItemResponse(Contract):
    order_item_id: int
    product_id: int | None
    product_name_snapshot: str
    unit_price: Decimal
    quantity: int


class OrderResponse(Contract):
    order_id: int
    user_id: int
    status: OrderStatus
    total_amount: Decimal
    subtotal_amount: Decimal
    discount_amount: Decimal
    shipping_amount: Decimal
    shipping_address: str | None
    placed_at: datetime
    items: list[OrderItemResponse]
    promo_codes: list[str]


class OrderStatusUpdate(Contract):
    status: OrderStatus


class ReviewUpdate(Contract):
    rating: int = Field(ge=1, le=5)
    comment: str = Field(min_length=5, max_length=2000)


class ReviewCreate(ReviewUpdate):
    product_id: int = Field(gt=0)


class ReviewResponse(Contract):
    is_demo: bool
    review_id: int
    user_id: int
    product_id: int
    rating: int
    comment: str | None
    created_at: datetime
    display_name: str


class PromoCodeResponse(Contract):
    code: str
    discount_type: str
    discount_value: Decimal
