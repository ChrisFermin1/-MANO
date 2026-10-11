"""Request and response schemas for businesses and jobs."""

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
    customer_name: str | None = None  # the linked customer's name, for the app's lists
    job_title: str | None
    job_description: str | None
    job_address: str | None
    job_price: Decimal | None
    status: str
    start_date: date | None
    created_at: datetime
    updated_at: datetime
    missing_fields: list[str] = Field(default_factory=list)


class BusinessCreateRequest(BaseModel):
    """What onboarding collects (Paso 1 and 2)."""

    model_config = ConfigDict(extra="forbid")

    owner_name: str = Field(min_length=1)
    business_name: str = Field(min_length=1)
    business_type: str | None = None  # trades, e.g. "painting, drywall"
    business_address: str | None = None
    phone_number: str | None = None


class BusinessResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    business_id: UUID
    owner_name: str | None
    business_name: str | None
    business_type: str | None
    business_address: str | None
    phone_number: str | None


# Responses for reading jobs have the same shape as the create response
JobResponse = JobCreateResponse


class JobUpdateRequest(BaseModel):
    """Only the fields sent are changed; completeness is re-checked."""

    model_config = ConfigDict(extra="forbid")

    customer_id: UUID | None = None
    customer_name: str | None = None
    job_title: str | None = None
    job_description: str | None = None
    job_address: str | None = None
    job_price: Decimal | None = Field(default=None, max_digits=12, decimal_places=2)
    start_date: date | None = None


class JobStatusRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
