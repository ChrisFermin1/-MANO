"""Business-scoped customer reads; customer creation is managed separately."""

from uuid import UUID

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.db import Customer
from app.schemas import CustomerResponse
from app.services.job_service import validate_business


def list_customers(session: Session, business_id: UUID) -> list[CustomerResponse]:
    validate_business(session, business_id)
    customers = session.scalars(
        select(Customer)
        .where(Customer.business_id == business_id)
        .order_by(Customer.customer_name, Customer.customer_id)
    ).all()
    return [CustomerResponse.model_validate(customer) for customer in customers]
