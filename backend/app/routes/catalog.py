from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from .. import schemas as s
from ..auth import get_current_user
from ..db import get_db
from ..models import Category, Product, Review, User

router = APIRouter(tags=["Catalog"])


def product_summaries(db, products):
    if not products:
        return []
    aggregates = db.execute(
        select(
            Review.product_id,
            func.avg(case((Review.is_demo.is_(False), Review.rating))),
            func.count(case((Review.is_demo.is_(False), 1))),
            func.count(case((Review.is_demo.is_(True), 1))),
        )
        .where(Review.product_id.in_([p.product_id for p in products]))
        .group_by(Review.product_id)
    ).all()
    ratings = {row[0]: row[1:] for row in aggregates}
    result = []
    for product in products:
        average, count, demos = ratings.get(product.product_id, (None, 0, 0))
        result.append(
            s.ProductResponse.model_validate(product).model_copy(
                update={
                    "average_rating": round(float(average), 1) if average is not None else None,
                    "review_count": count,
                    "demo_review_count": demos,
                }
            )
        )
    return result


@router.get("/categories", response_model=list[s.CategoryResponse])
def categories(db: Session = Depends(get_db)):
    return db.scalars(select(Category).order_by(Category.category_name)).all()


@router.get("/products", response_model=s.ProductPage)
def products(
    page: int = Query(1, ge=1),
    page_size: int = Query(12, ge=1, le=100),
    category_id: int | None = None,
    search: str = Query("", max_length=150),
    featured_only: bool = False,
    in_stock: bool = False,
    sort: str = Query("featured", pattern="^(featured|price_asc|price_desc|newest|name)$"),
    db: Session = Depends(get_db),
):
    query = select(Product).where(Product.is_active.is_(True))
    if category_id:
        query = query.where(Product.category_id == category_id)
    if search.strip():
        # Treat search as text, not a SQL wildcard pattern.
        term = search.strip().replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
        query = query.where(
            or_(
                Product.product_name.ilike(f"%{term}%", escape="\\"),
                Product.description.ilike(f"%{term}%", escape="\\"),
            )
        )
    if featured_only:
        query = query.where(Product.is_featured.is_(True))
    if in_stock:
        query = query.where(Product.stock_quantity > 0)
    total = db.scalar(select(func.count()).select_from(query.subquery()))
    ordering = {
        "featured": Product.is_featured.desc(),
        "price_asc": Product.price.asc(),
        "price_desc": Product.price.desc(),
        "newest": Product.created_at.desc(),
        "name": Product.product_name.asc(),
    }
    rows = db.scalars(
        query.order_by(
            ordering[sort], Product.product_id.desc() if sort == "newest" else Product.product_id
        )
        .offset((page - 1) * page_size)
        .limit(page_size)
    ).all()
    return {
        "items": product_summaries(db, rows),
        "total": total,
        "page": page,
        "page_size": page_size,
    }


@router.get("/products/{product_id}", response_model=s.ProductResponse)
def product(product_id: int, db: Session = Depends(get_db)):
    item = db.get(Product, product_id)
    if not item or not item.is_active:
        raise HTTPException(404, "Product not found")
    return product_summaries(db, [item])[0]


@router.get("/products/{product_id}/reviews", response_model=list[s.ReviewResponse])
def reviews(product_id: int, db: Session = Depends(get_db)):
    rows = db.execute(
        select(Review, User.display_name)
        .join(User)
        .where(Review.product_id == product_id)
        .order_by(Review.is_demo.asc(), Review.created_at.desc(), Review.review_id.desc())
        .limit(100)
    ).all()
    return [
        {
            "is_demo": r.is_demo,
            "review_id": r.review_id,
            "user_id": r.user_id,
            "product_id": r.product_id,
            "rating": r.rating,
            "comment": r.comment,
            "created_at": r.created_at,
            "display_name": name,
        }
        for r, name in rows
    ]


@router.post("/reviews", status_code=201)
def add_review(
    data: s.ReviewCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    product(data.product_id, db)
    try:
        db.add(Review(user_id=user.user_id, **data.model_dump()))
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You have already reviewed this product") from None
    return {"message": "Thanks for sharing your review"}


@router.patch("/reviews/{review_id}")
def edit_review(
    review_id: int,
    data: s.ReviewUpdate,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    review = db.get(Review, review_id)
    if not review:
        raise HTTPException(404, "Review not found")
    if review.user_id != user.user_id or review.is_demo:
        raise HTTPException(403, "You can only edit your own customer reviews")
    review.rating = data.rating
    review.comment = data.comment
    db.commit()
    return {"message": "Your review was updated"}
