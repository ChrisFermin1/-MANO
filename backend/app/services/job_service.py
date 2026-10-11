"""Business-scoped customer resolution and job creation."""

import logging
import re
import unicodedata
from decimal import Decimal
from uuid import UUID

from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.db import Business, Customer, Job, LineItem
from app.schemas import JobCreateRequest, JobCreateResponse, JobStatusRequest, JobUpdateRequest
from app.services.extraction_service import (
    ExtractedJobInformation,
    WorkItem,
    extract_job_information,
)


logger = logging.getLogger(__name__)

# A deliberately small demo vocabulary: require an action and a work target.
WORK_ACTIONS = frozenset(
    "paint painting repaint repainting repair repairing fix fixing remodel remodeling "
    "renovate renovating install installing replace replacing clean cleaning "
    "pintar pintando pintura repintar reparar reparando arreglar remodelar "
    "remodelacion renovar renovacion instalar instalacion reemplazar limpiar limpieza "
    # common contractor words (Spanish, English, Spanglish) seen in real job notes
    "poner colocar cambiar plantar sembrar cortar quitar sellar resanar parchar lijar "
    "construir demoler lavar tinte tenir sellador calafatear "
    "put change plant build cut remove seal patch sand stain caulk wash demolish mow "
    "stein coquin".split()
)
WORK_TARGETS = frozenset(
    "room rooms bedroom bedrooms bathroom bathrooms kitchen kitchens wall walls "
    "ceiling ceilings trim door doors window windows house home interior exterior "
    "floor floors flooring cabinet cabinets drywall deck fence roof sink "
    "cuarto cuartos habitacion habitaciones dormitorio dormitorios bano banos "
    "cocina cocinas pared paredes techo techos moldura molduras puerta puertas "
    "ventana ventanas casa piso pisos gabinete gabinetes cerca lavabo "
    # common contractor words (Spanish, English, Spanglish) seen in real job notes
    "sala comedor garaje garage cochera patio porche porch escalera stairs closet "
    "siding pasto cesped grass lawn jardin yard arbol tree "
    "enchufe outlet apagador switch ventilador fan lampara light luz "
    "teja shingle zinc lamina canaleta gutter azulejo tile zoclo baseboard "
    "sheetrock concreto concrete banqueta sidewalk driveway entrada fachada muro".split()
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
    if len(matches) == 1:
        return matches[0]
    return None  # no match or ambiguous: Carlos reviews; never create a customer here


def is_meaningful_description(description: str) -> bool:
    normalized = unicodedata.normalize("NFKD", description.lower())
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    words = set(re.findall(r"[a-z]+", normalized))
    # plurals count: "enchufes" → "enchufe", "ventanas" → "ventana", "outlets" → "outlet"
    words |= {w[:-2] for w in words if w.endswith("es") and len(w) > 4}
    words |= {w[:-1] for w in words if w.endswith("s") and len(w) > 3}
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

        # Line items sent by the app are used as they are; otherwise extract them for display.
        # Completeness stays deterministic and requires the Job's own price. One call covers it all.
        given_items = _work_items_from(request.line_items)
        extract_work = given_items is None
        extracted = ExtractedJobInformation()
        if extract_name or extract_price or extract_work:
            try:
                extracted = extract_job_information(
                    request.description,
                    extract_customer_name=extract_name,
                    extract_job_price=extract_price,
                    extract_work_items=extract_work,
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
        work_items = given_items if given_items is not None else (extracted.work_items or ())
        status, missing_fields = evaluate_completeness(
            customer,
            request.description,
            job_price,
        )

        job = Job(
            business_id=request.business_id,
            customer_id=customer.customer_id if customer is not None else None,
            job_description=request.description,
            job_price=job_price,
            job_title=request.job_title,
            job_address=request.job_address,
            status=status,
            line_items=_line_items(work_items),
        )
        session.add(job)
        session.commit()
        session.refresh(job)
        return job_response(job, missing_fields)
    except SQLAlchemyError:
        session.rollback()
        raise


# ───────────────────────── reading and updating jobs ─────────────────────────

# Canonical job states (docs/technical-design.md §4), in workflow order
JOB_STATES = (
    "NEW",
    "NEEDS_INFORMATION",
    "READY_FOR_QUOTE",
    "QUOTE_SENT",
    "ACCEPTED",
    "SCHEDULED",
    "IN_PROGRESS",
    "COMPLETED",
    "PAYMENT_PENDING",
    "PAID",
)
# Before the quote is sent, Ojo sets the status from completeness and the job can be deleted
PRE_QUOTE_STATES = ("NEW", "NEEDS_INFORMATION", "READY_FOR_QUOTE")


class JobNotFoundError(ValueError):
    """The job does not exist or belongs to another business."""


class InvalidStatusChangeError(ValueError):
    """Unknown status, or a move backwards in the workflow."""


class JobLockedError(ValueError):
    """The job can't be deleted once a quote was sent."""


def _work_items_from(items) -> tuple[WorkItem, ...] | None:
    """Line items sent by the app, as WorkItems (None = not sent)."""
    if items is None:
        return None
    return tuple(
        WorkItem(description_es=(i.description_es or "").strip() or None, description=i.description.strip(), amount=i.amount)
        for i in items
    )


def _line_items(work_items: tuple[WorkItem, ...]) -> list[LineItem]:
    return [
        LineItem(position=i, description=w.description, description_es=w.description_es, amount=w.amount)
        for i, w in enumerate(work_items)
    ]


def job_response(job: Job, missing_fields: list[str]) -> JobCreateResponse:
    return JobCreateResponse.model_validate(job).model_copy(
        update={
            "missing_fields": missing_fields,
            "customer_name": job.customer.customer_name if job.customer is not None else None,
        }
    )


def _missing_fields(job: Job) -> list[str]:
    _, missing = evaluate_completeness(
        job.customer,
        job.job_description or "",
        job.job_price,
    )
    return missing


def _get_job(session: Session, job_id: UUID) -> Job:
    job = session.get(Job, job_id)
    if job is None:
        raise JobNotFoundError("Trabajo no encontrado.")
    return job


def list_jobs(session: Session, business_id: UUID) -> list[JobCreateResponse]:
    validate_business(session, business_id)
    jobs = session.scalars(
        select(Job).where(Job.business_id == business_id).order_by(Job.created_at.desc())
    ).all()
    return [job_response(job, _missing_fields(job)) for job in jobs]


def get_job(session: Session, job_id: UUID) -> JobCreateResponse:
    job = _get_job(session, job_id)
    return job_response(job, _missing_fields(job))


def update_job(session: Session, job_id: UUID, request: JobUpdateRequest) -> JobCreateResponse:
    """Change only the fields that were sent; before the quote, Ojo re-checks completeness."""
    try:
        job = _get_job(session, job_id)
        changes = request.model_dump(exclude_unset=True)

        if "customer_id" in changes or "customer_name" in changes:
            job.customer = resolve_customer(
                session,
                job.business_id,
                customer_id=changes.pop("customer_id", None),
                customer_name=changes.pop("customer_name", None),
            )
        given_items = _work_items_from(request.line_items) if "line_items" in changes else None
        changes.pop("line_items", None)
        for field, value in changes.items():
            setattr(job, field, value)

        if given_items is not None:
            job.line_items = _line_items(given_items)
        # A new description before the quote (and no items sent): re-read the work in it
        elif "job_description" in changes and job.status in PRE_QUOTE_STATES:
            try:
                work = extract_job_information(
                    job.job_description or "",
                    extract_customer_name=False,
                    extract_job_price=False,
                    extract_work_items=True,
                ).work_items
            except Exception:
                logger.warning("Job extraction failed; keeping the current line items.")
                work = None
            if work is not None:
                job.line_items = _line_items(work)

        status, missing_fields = evaluate_completeness(
            job.customer,
            job.job_description or "",
            job.job_price,
        )
        if job.status in PRE_QUOTE_STATES:
            job.status = status
        session.commit()
        session.refresh(job)
        return job_response(job, missing_fields)
    except SQLAlchemyError:
        session.rollback()
        raise


def change_status(session: Session, job_id: UUID, request: JobStatusRequest) -> JobCreateResponse:
    """Move a job forward in the workflow (skipping steps is allowed, going back is not)."""
    try:
        job = _get_job(session, job_id)
        target = request.status.strip().upper()
        if target not in JOB_STATES:
            raise InvalidStatusChangeError(f"Estado desconocido: {request.status}.")
        if JOB_STATES.index(target) < JOB_STATES.index(job.status):
            raise InvalidStatusChangeError(f"No se puede volver de {job.status} a {target}.")
        job.status = target
        session.commit()
        session.refresh(job)
        return job_response(job, _missing_fields(job))
    except SQLAlchemyError:
        session.rollback()
        raise


def delete_job(session: Session, job_id: UUID) -> None:
    """Only before anything was sent to the customer."""
    try:
        job = _get_job(session, job_id)
        if job.status not in PRE_QUOTE_STATES:
            raise JobLockedError("Este trabajo ya se envió al cliente; no se puede borrar.")
        for row in [*job.quotes, *job.actions]:
            session.delete(row)  # line items go with the job (cascade)
        session.delete(job)
        session.commit()
    except SQLAlchemyError:
        session.rollback()
        raise
