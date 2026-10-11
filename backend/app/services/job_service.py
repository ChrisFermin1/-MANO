"""Business-scoped customer resolution and job creation."""

import logging
import re
import unicodedata
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import Business, Customer, Job
from app.schemas import JobCreateRequest, JobCreateResponse
from app.services.extraction_service import (
    ExtractedJobInformation,
    extract_job_information,
)


logger = logging.getLogger(__name__)

# A deliberately small demo vocabulary: require an action and a work target.
WORK_ACTIONS = frozenset(
    "paint painting repaint repainting repair repairing fix fixing remodel remodeling "
    "renovate renovating install installing replace replacing clean cleaning "
    "pintar pintando pintura repintar reparar reparando arreglar remodelar "
    "remodelacion renovar renovacion instalar instalacion reemplazar limpiar limpieza".split()
)
WORK_TARGETS = frozenset(
    "room rooms bedroom bedrooms bathroom bathrooms kitchen kitchens wall walls "
    "ceiling ceilings trim door doors window windows house home interior exterior "
    "floor floors flooring cabinet cabinets drywall deck fence roof sink "
    "cuarto cuartos habitacion habitaciones dormitorio dormitorios bano banos "
    "cocina cocinas pared paredes techo techos moldura molduras puerta puertas "
    "ventana ventanas casa piso pisos gabinete gabinetes cerca lavabo".split()
)


class BusinessNotFoundError(ValueError):
    """The supplied business ID does not identify an existing business."""


class InvalidCustomerError(ValueError):
    """An explicit customer ID is missing or belongs to another business."""


def validate_business(session: Session, business_id: UUID) -> Business:
    business = session.get(Business, business_id)
    if business is None:
        raise BusinessNotFoundError("Negocio no encontrado. Revisa la selección.")
    return business


def resolve_customer(
    session: Session,
    business_id: UUID,
    *,
    customer_id: UUID | None,
    customer_name: str | None,
) -> Customer | None:
    scoped_customers = select(Customer).where(Customer.business_id == business_id)

    if customer_id is not None:
        customer = session.scalar(
            scoped_customers.where(Customer.customer_id == customer_id)
        )
        if customer is None:
            raise InvalidCustomerError("Cliente no encontrado. Revisa la selección.")
        return customer

    if customer_name is None or not customer_name.strip():
        return None

    matches = session.scalars(
        scoped_customers.where(
            func.lower(func.trim(Customer.customer_name)) == customer_name.strip().lower()
        ).limit(2)
    ).all()
    return matches[0] if len(matches) == 1 else None


def is_meaningful_description(description: str) -> bool:
    normalized = unicodedata.normalize("NFKD", description.lower())
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    words = set(re.findall(r"[a-z]+", normalized))
    return bool(words & WORK_ACTIONS) and bool(words & WORK_TARGETS)


def evaluate_completeness(
    customer: Customer | None,
    description: str,
    job_price: Decimal | None,
) -> tuple[str, list[str]]:
    missing_fields = []
    if customer is None:
        missing_fields.append("customer_name")
    if not is_meaningful_description(description):
        missing_fields.append("job_description")
    if job_price is None:
        missing_fields.append("job_price")
    status = "NEEDS_INFORMATION" if missing_fields else "NEW"
    return status, missing_fields


def create_job(session: Session, request: JobCreateRequest) -> JobCreateResponse:
    """Create one job; explicit values always take precedence over extraction."""
    try:
        validate_business(session, request.business_id)

        customer_name = request.customer_name
        job_price = request.job_price
        extract_name = request.customer_id is None and customer_name is None
        extract_price = job_price is None

        extracted = ExtractedJobInformation()
        if extract_name or extract_price:
            try:
                extracted = extract_job_information(
                    request.description,
                    extract_customer_name=extract_name,
                    extract_job_price=extract_price,
                )
            except Exception:
                # Extraction is optional assistance; explicit input remains usable.
                logger.warning("Job extraction failed; continuing with explicit inputs.")

        if extract_name:
            customer_name = extracted.customer_name
        if extract_price:
            job_price = extracted.job_price

        customer = resolve_customer(
            session,
            request.business_id,
            customer_id=request.customer_id,
            customer_name=customer_name,
        )
        status, missing_fields = evaluate_completeness(
            customer, request.description, job_price
        )

        job = Job(
            business_id=request.business_id,
            customer_id=customer.customer_id if customer is not None else None,
            job_description=request.description,
            job_price=job_price,
            status=status,
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        return JobCreateResponse.model_validate(job).model_copy(
            update={"missing_fields": missing_fields}
        )
    except SQLAlchemyError:
        session.rollback()
        raise
