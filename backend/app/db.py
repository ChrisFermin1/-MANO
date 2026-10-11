from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from uuid import UUID as UUIDValue

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    Numeric,
    String,
    Text,
    false,
    func,
    text,
    true,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class Business(Base):
    __tablename__ = "businesses"

    business_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    owner_name: Mapped[str | None] = mapped_column(String(), nullable=True)
    business_name: Mapped[str | None] = mapped_column(String(), nullable=True)
    business_type: Mapped[str | None] = mapped_column(String(), nullable=True)
    business_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(), nullable=True)

    customers: Mapped[list[Customer]] = relationship(back_populates="business")
    jobs: Mapped[list[Job]] = relationship(back_populates="business")


class Customer(Base):
    __tablename__ = "customers"

    customer_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    business_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.business_id"), nullable=False
    )
    customer_name: Mapped[str | None] = mapped_column(String(), nullable=True)
    phone_number: Mapped[str | None] = mapped_column(String(), nullable=True)
    email: Mapped[str | None] = mapped_column(String(), nullable=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)

    business: Mapped[Business] = relationship(back_populates="customers")
    jobs: Mapped[list[Job]] = relationship(back_populates="customer")


class Job(Base):
    __tablename__ = "jobs"

    job_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    business_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), ForeignKey("businesses.business_id"), nullable=False
    )
    customer_id: Mapped[UUIDValue | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("customers.customer_id"), nullable=True
    )
    job_title: Mapped[str | None] = mapped_column(String(), nullable=True)
    job_description: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    job_price: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    status: Mapped[str] = mapped_column(String(), nullable=False)
    start_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    business: Mapped[Business] = relationship(back_populates="jobs")
    customer: Mapped[Customer | None] = relationship(back_populates="jobs")
    quotes: Mapped[list[Quote]] = relationship(back_populates="job")
    actions: Mapped[list[Action]] = relationship(back_populates="job")
    line_items: Mapped[list[LineItem]] = relationship(
        back_populates="job", order_by="LineItem.position", cascade="all, delete-orphan"
    )


class Quote(Base):
    __tablename__ = "quotes"

    quote_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    job_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.job_id"), nullable=False
    )
    amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)
    quote_content: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(), nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    sent_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    approved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    job: Mapped[Job] = relationship(back_populates="quotes")


class Action(Base):
    __tablename__ = "actions"

    action_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    job_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.job_id"), nullable=False
    )
    action_type: Mapped[str] = mapped_column(String(), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(), nullable=False)
    requires_approval: Mapped[bool] = mapped_column(
        Boolean, nullable=False, server_default=true()
    )
    approved: Mapped[bool] = mapped_column(Boolean, nullable=False, server_default=false())
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    job: Mapped[Job] = relationship(back_populates="actions")


class LineItem(Base):
    """One piece of work on a job: English for the customer, Spanish for Carlos."""

    __tablename__ = "job_line_items"

    line_item_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()")
    )
    job_id: Mapped[UUIDValue] = mapped_column(
        UUID(as_uuid=True), ForeignKey("jobs.job_id"), nullable=False
    )
    position: Mapped[int] = mapped_column(Integer, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    description_es: Mapped[str | None] = mapped_column(Text, nullable=True)
    # NULL when the job has one total price instead of a price per item
    amount: Mapped[Decimal | None] = mapped_column(Numeric(12, 2), nullable=True)

    job: Mapped[Job] = relationship(back_populates="line_items")
