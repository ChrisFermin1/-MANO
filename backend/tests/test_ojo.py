"""Put this file at backend/tests/test_ojo.py (run with pytest)."""
from datetime import date
from decimal import Decimal
from types import SimpleNamespace as NS

from app.models import JobStatus
from app.ojo import validate_job


def make_job(status=JobStatus.NEW_JOB, **overrides):
    customer = NS(name="Maria Rodriguez", phone="555-0100", email=None)
    job = NS(
        status=status, customer=customer, job_address="123 Oak St",
        job_description="Paint three rooms", job_price=Decimal("1800"), start_date=None,
    )
    for k, v in overrides.items():
        setattr(job, k, v)
    return job


def test_complete_new_job_is_not_blocked():
    r = validate_job(make_job())
    assert not r.is_blocked
    assert r.next_status == JobStatus.READY_FOR_QUOTE


def test_missing_price_and_address():
    r = validate_job(make_job(job_price=None, job_address="  "))
    assert r.is_blocked
    assert [c.key for c in r.missing] == ["job_address", "job_price"]
    assert r.blocker_message == "Missing job address and price."


def test_contact_accepts_email_instead_of_phone():
    job = make_job()
    job.customer.phone, job.customer.email = None, "maria@example.com"
    assert not validate_job(job).is_blocked


def test_no_contact_is_blocked():
    job = make_job()
    job.customer.phone = job.customer.email = None
    assert [c.key for c in validate_job(job).missing] == ["contact"]


def test_zero_price_counts_as_missing():
    assert validate_job(make_job(job_price=Decimal("0"))).is_blocked


def test_accepted_job_needs_start_date():
    assert validate_job(make_job(JobStatus.ACCEPTED)).is_blocked
    assert not validate_job(make_job(JobStatus.ACCEPTED, start_date=date(2026, 10, 14))).is_blocked


def test_quote_sent_has_nothing_required():
    assert not validate_job(make_job(JobStatus.QUOTE_SENT, job_price=None)).is_blocked
