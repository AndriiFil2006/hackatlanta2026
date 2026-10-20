from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import schemas as s
from ..auth import get_admin
from ..db import get_db
from ..models import Category, Order, OrderItem, Product
from ..services import order_response

router = APIRouter(prefix="/admin", tags=["Administration"], dependencies=[Depends(get_admin)])


@router.get("/products", response_model=list[s.ProductResponse])
def products(db: Session = Depends(get_db), page: int = Query(1, ge=1)):
    return db.scalars(
        select(Product).order_by(Product.product_id).offset((page - 1) * 100).limit(100)
    ).all()


def check_category(db, category_id):
    if category_id is not None and not db.get(Category, category_id):
        raise HTTPException(422, "Choose an existing category")


@router.post("/products", response_model=s.ProductResponse, status_code=201)
def create_product(data: s.ProductCreate, db: Session = Depends(get_db)):
    check_category(db, data.category_id)
    product = Product(**data.model_dump())
    db.add(product)
    db.commit()
    return product


@router.put("/products/{product_id}", response_model=s.ProductResponse)
def update_product(product_id: int, data: s.ProductUpdate, db: Session = Depends(get_db)):
    product = db.scalar(select(Product).where(Product.product_id == product_id).with_for_update())
    if not product:
        raise HTTPException(404, "Product not found")
    check_category(db, data.category_id)
    for key, value in data.model_dump().items():
        setattr(product, key, value)
    db.commit()
    return product


@router.post("/categories", response_model=s.CategoryResponse, status_code=201)
def create_category(data: s.CategoryCreate, db: Session = Depends(get_db)):
    category = Category(**data.model_dump())
    db.add(category)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "That category already exists") from None
    return category


@router.get("/orders", response_model=list[s.OrderResponse])
def orders(db: Session = Depends(get_db), page: int = Query(1, ge=1)):
    rows = db.scalars(
        select(Order).order_by(Order.order_id.desc()).offset((page - 1) * 20).limit(20)
    ).all()
    return [order_response(db, order) for order in rows]


@router.put("/orders/{order_id}", response_model=s.OrderResponse)
def update_order(order_id: int, data: s.OrderStatusUpdate, db: Session = Depends(get_db)):
    order = db.scalar(select(Order).where(Order.order_id == order_id).with_for_update())
    if not order:
        raise HTTPException(404, "Order not found")
    transitions = {
        "pending": {"paid", "cancelled"},
        "paid": {"shipped", "cancelled"},
        "shipped": {"delivered"},
        "delivered": set(),
        "cancelled": set(),
    }
    if data.status == order.status:
        return order_response(db, order)
    if data.status not in transitions[order.status]:
        raise HTTPException(409, f"Cannot move an order from {order.status} to {data.status}")
    if data.status == "cancelled":
        items = db.scalars(
            select(OrderItem).where(OrderItem.order_id == order_id).order_by(OrderItem.product_id)
        ).all()
        for item in items:
            product = db.scalar(
                select(Product).where(Product.product_id == item.product_id).with_for_update()
            )
            if product:
                product.stock_quantity += item.quantity
    order.status = data.status
    db.commit()
    return order_response(db, order)
