"""Read existing customers within the explicitly supplied business."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_session
from app.schemas import CustomerResponse
from app.services.customer_service import list_customers
from app.services.job_service import BusinessNotFoundError


router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("", response_model=list[CustomerResponse])
def list_customers_endpoint(
    business_id: UUID,
    session: Annotated[Session, Depends(get_session)],
) -> list[CustomerResponse]:
    try:
        return list_customers(session, business_id)
    except BusinessNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error
