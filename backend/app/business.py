"""HTTP interface for the contractor's business (single business for the demo)."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_session
from app.db import Business
from app.schemas import BusinessCreateRequest, BusinessResponse


# Fixed ID so the app can find the demo business without onboarding being connected yet
DEMO_BUSINESS_ID = UUID("00000000-0000-4000-8000-00000000ca71")

router = APIRouter(prefix="/business", tags=["business"])


def ensure_demo_business(session: Session) -> None:
    """Create the demo business once; never overwrite it if it exists."""
    if session.get(Business, DEMO_BUSINESS_ID) is None:
        session.add(
            Business(
                business_id=DEMO_BUSINESS_ID,
                owner_name="Carlos",
                business_name="Carlos Painting & Drywall",
                business_type="painting, drywall",
            )
        )
        session.commit()


@router.post("", response_model=BusinessResponse, status_code=status.HTTP_201_CREATED)
def create_business(
    request: BusinessCreateRequest,
    session: Annotated[Session, Depends(get_session)],
) -> Business:
    business = Business(**request.model_dump())
    session.add(business)
    session.commit()
    session.refresh(business)
    return business


@router.get("/{business_id}", response_model=BusinessResponse)
def get_business(
    business_id: UUID,
    session: Annotated[Session, Depends(get_session)],
) -> Business:
    business = session.get(Business, business_id)
    if business is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Negocio no encontrado.")
    return business
