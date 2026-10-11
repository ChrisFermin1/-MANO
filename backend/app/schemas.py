"""Request and response schemas for job creation."""

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class JobCreateRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    business_id: UUID
    description: str
    customer_id: UUID | None = None
    customer_name: str | None = None
    job_price: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)


class JobCreateResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    job_id: UUID
    business_id: UUID
    customer_id: UUID | None
    job_title: str | None
    job_description: str | None
    job_address: str | None
    job_price: Decimal | None
    status: str
    start_date: date | None
    created_at: datetime
    updated_at: datetime
    missing_fields: list[str] = Field(default_factory=list)
