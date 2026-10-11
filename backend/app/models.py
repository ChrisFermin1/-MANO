"""Database models for Mano + Ojo.

Put this file at backend/app/models.py

Tables: businesses -> customers -> jobs -> (quotes, actions)
"""
import enum
from datetime import date, datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, ForeignKey, Numeric, String, Text,
)
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


def str_enum(enum_cls, length: int = 30):
    """Store enums as plain strings (e.g. 'quote_sent') instead of a native
    Postgres ENUM type. Much easier to change later."""
    return Enum(
        enum_cls,
        native_enum=False,
        length=length,
        values_callable=lambda e: [m.value for m in e],
    )


class Base(DeclarativeBase):
    pass


# ---------- Enums ----------

class JobStatus(str, enum.Enum):
    NEW_JOB = "new_job"
    NEEDS_INFORMATION = "needs_information"
    READY_FOR_QUOTE = "ready_for_quote"
    QUOTE_SENT = "quote_sent"
    ACCEPTED = "accepted"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    PAYMENT_PENDING = "payment_pending"
    PAID = "paid"


class QuoteStatus(str, enum.Enum):
    DRAFT = "draft"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class ActionType(str, enum.Enum):
    COLLECT_INFO = "collect_info"
    GENERATE_QUOTE = "generate_quote"
    FOLLOW_UP = "follow_up"
    PAYMENT_REMINDER = "payment_reminder"


class ActionStatus(str, enum.Enum):
    PENDING = "pending"      # Ojo created it, waiting on Carlos
    COMPLETED = "completed"  # Done


# ---------- Tables ----------

class Business(Base):
    __tablename__ = "businesses"

    business_id: Mapped[int] = mapped_column(primary_key=True)
    owner_name: Mapped[str] = mapped_column(String(200))
    business_name: Mapped[str] = mapped_column(String(200))
    business_type: Mapped[str | None] = mapped_column(String(100))
    address: Mapped[str | None] = mapped_column(String(300))
    phone: Mapped[str | None] = mapped_column(String(50))

    customers: Mapped[list["Customer"]] = relationship(back_populates="business")
    jobs: Mapped[list["Job"]] = relationship(back_populates="business")


class Customer(Base):
    __tablename__ = "customers"

    customer_id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.business_id"))
    name: Mapped[str] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(50))
    email: Mapped[str | None] = mapped_column(String(200))
    address: Mapped[str | None] = mapped_column(String(300))

    business: Mapped["Business"] = relationship(back_populates="customers")
    jobs: Mapped[list["Job"]] = relationship(back_populates="customer")


class Job(Base):
    __tablename__ = "jobs"

    job_id: Mapped[int] = mapped_column(primary_key=True)
    business_id: Mapped[int] = mapped_column(ForeignKey("businesses.business_id"))
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.customer_id"))

    job_title: Mapped[str | None] = mapped_column(String(200))
    job_description: Mapped[str | None] = mapped_column(Text)
    job_address: Mapped[str | None] = mapped_column(String(300))
    job_price: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    status: Mapped[JobStatus] = mapped_column(
        str_enum(JobStatus), default=JobStatus.NEW_JOB
    )
    start_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow
    )

    business: Mapped["Business"] = relationship(back_populates="jobs")
    customer: Mapped["Customer"] = relationship(back_populates="jobs")
    quotes: Mapped[list["Quote"]] = relationship(back_populates="job")
    actions: Mapped[list["Action"]] = relationship(back_populates="job")


class Quote(Base):
    __tablename__ = "quotes"

    quote_id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.job_id"))
    amount: Mapped[Decimal | None] = mapped_column(Numeric(10, 2))
    content: Mapped[str] = mapped_column(Text)
    status: Mapped[QuoteStatus] = mapped_column(
        str_enum(QuoteStatus), default=QuoteStatus.DRAFT
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    # Ojo's "quote sent 3+ days ago, no reply" rule reads this column
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    job: Mapped["Job"] = relationship(back_populates="quotes")


class Action(Base):
    """Created by Ojo from its rules. Flow:
    pending + approved=False -> approved=True -> status=completed.
    Rows are never deleted, so this doubles as the approval audit trail."""
    __tablename__ = "actions"

    action_id: Mapped[int] = mapped_column(primary_key=True)
    job_id: Mapped[int] = mapped_column(ForeignKey("jobs.job_id"))
    type: Mapped[ActionType] = mapped_column(str_enum(ActionType))
    description: Mapped[str | None] = mapped_column(Text)  # e.g. "Follow up with Maria"
    status: Mapped[ActionStatus] = mapped_column(
        str_enum(ActionStatus), default=ActionStatus.PENDING
    )
    approved: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)

    job: Mapped["Job"] = relationship(back_populates="actions")
