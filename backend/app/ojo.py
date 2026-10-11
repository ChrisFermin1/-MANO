"""Ojo: validation rules (FR-11, FR-12).

Put this file at backend/app/ojo.py

Plain Python, no AI and no database calls. You give it a Job (with its
customer loaded) and it tells you what is missing and what is blocked.
"""
from dataclasses import dataclass, field

from app.models import JobStatus


# ---------- 1. What counts as "present" ----------

def _has_text(value) -> bool:
    return value is not None and str(value).strip() != ""


def _has_price(value) -> bool:
    return value is not None and value > 0


# field key -> (label shown to Carlos, test on the job)
CHECKS = {
    "customer_name": ("Customer name", lambda j: _has_text(j.customer.name)),
    # phone OR email: Mano needs somewhere to send the quote/follow-up
    "contact": ("Phone or email", lambda j: _has_text(j.customer.phone) or _has_text(j.customer.email)),
    "job_address": ("Job address", lambda j: _has_text(j.job_address)),
    "job_description": ("Scope of work", lambda j: _has_text(j.job_description)),
    "job_price": ("Price", lambda j: _has_price(j.job_price)),
    "start_date": ("Start date", lambda j: j.start_date is not None),
}


# ---------- 2. What each stage needs before the job can move on ----------

# Key = the job's CURRENT status. Value = fields required to leave it.
REQUIRED_TO_ADVANCE = {
    JobStatus.NEW_JOB: ["customer_name", "contact", "job_address", "job_description", "job_price"],
    JobStatus.NEEDS_INFORMATION: ["customer_name", "contact", "job_address", "job_description", "job_price"],
    JobStatus.READY_FOR_QUOTE: ["job_price"],
    JobStatus.QUOTE_SENT: [],           # waiting on the customer
    JobStatus.ACCEPTED: ["start_date"],  # needed to schedule
    JobStatus.SCHEDULED: ["start_date", "job_address"],
    JobStatus.IN_PROGRESS: [],
    JobStatus.COMPLETED: ["job_price"],  # needed to bill
    JobStatus.PAYMENT_PENDING: [],
    JobStatus.PAID: [],
}

NEXT_STATUS = {
    JobStatus.NEW_JOB: JobStatus.READY_FOR_QUOTE,
    JobStatus.NEEDS_INFORMATION: JobStatus.READY_FOR_QUOTE,
    JobStatus.READY_FOR_QUOTE: JobStatus.QUOTE_SENT,
    JobStatus.QUOTE_SENT: JobStatus.ACCEPTED,
    JobStatus.ACCEPTED: JobStatus.SCHEDULED,
    JobStatus.SCHEDULED: JobStatus.IN_PROGRESS,
    JobStatus.IN_PROGRESS: JobStatus.COMPLETED,
    JobStatus.COMPLETED: JobStatus.PAYMENT_PENDING,
    JobStatus.PAYMENT_PENDING: JobStatus.PAID,
}


# ---------- 3. The result ----------

@dataclass
class Check:
    key: str
    label: str
    passed: bool


@dataclass
class ValidationResult:
    checks: list[Check] = field(default_factory=list)
    next_status: JobStatus | None = None

    @property
    def missing(self) -> list[Check]:
        return [c for c in self.checks if not c.passed]

    @property
    def is_blocked(self) -> bool:
        return len(self.missing) > 0

    @property
    def blocker_message(self) -> str | None:
        """The sentence Carlos sees, e.g. 'Missing price and address.'"""
        if not self.is_blocked:
            return None
        labels = [c.label.lower() for c in self.missing]
        return f"Missing {_join(labels)}."

    def checklist(self) -> str:
        """FR-11's example: 'Customer name ✓ / Price ✗'."""
        return "\n".join(f"{c.label:<16}{'✓' if c.passed else '✗'}" for c in self.checks)


def _join(items: list[str]) -> str:
    if len(items) <= 2:
        return " and ".join(items)
    return ", ".join(items[:-1]) + f", and {items[-1]}"


# ---------- 4. The function the rest of the app calls ----------

def validate_job(job) -> ValidationResult:
    """Check a job against what it needs to move past its current status."""
    required = REQUIRED_TO_ADVANCE.get(job.status, [])
    checks = [Check(key, CHECKS[key][0], CHECKS[key][1](job)) for key in required]
    return ValidationResult(checks=checks, next_status=NEXT_STATUS.get(job.status))
