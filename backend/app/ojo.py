"""Deterministic Ojo rules for the teammate's db.py objects; no models.py.

Load job.customer before calling. Pass the explicitly selected quote separately.
This module never writes to the DB, sends messages, or authenticates callers.
Evidence must be constructed by the backend from verified events, never copied
from arbitrary request booleans. See README for the integration contract.
"""
from dataclasses import asdict, dataclass
from datetime import date, datetime, timedelta
from decimal import Decimal, InvalidOperation

STATUSES = frozenset(('NEW', 'NEEDS_INFORMATION', 'READY_FOR_QUOTE', 'QUOTE_SENT',
    'ACCEPTED', 'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PAYMENT_PENDING', 'PAID'))
NEXT = dict(zip(('READY_FOR_QUOTE', 'QUOTE_SENT', 'ACCEPTED', 'SCHEDULED',
    'IN_PROGRESS', 'COMPLETED', 'PAYMENT_PENDING'), ('QUOTE_SENT', 'ACCEPTED',
    'SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'PAYMENT_PENDING', 'PAID')))

@dataclass(frozen=True)
class Evidence:
    """Server-verified facts for THIS job and selected/current quote revision."""
    owner_approved_quote: bool = False
    quote_sent: bool = False
    customer_accepted: bool = False
    schedule_confirmed: bool = False
    work_started: bool = False
    work_completed: bool = False
    outstanding_payment_confirmed: bool = False
    payment_received: bool = False

@dataclass(frozen=True)
class Check:
    key: str
    label: str
    passed: bool

@dataclass(frozen=True)
class Alert:
    code: str
    message: str
    severity: str = 'warning'

@dataclass(frozen=True)
class Recommendation:
    code: str
    message: str
    requires_owner_approval: bool = True

@dataclass(frozen=True)
class ValidationResult:
    current_status: str
    checks: tuple[Check, ...]
    recommended_status: str
    candidate_next_status: str | None
    blockers: tuple[str, ...]
    recommendation: Recommendation | None
    alerts: tuple[Alert, ...]

    @property
    def missing(self):
        return tuple(c for c in self.checks if not c.passed)

    @property
    def information_complete(self):
        return not self.missing

    @property
    def can_advance(self):
        return self.candidate_next_status is not None and not self.blockers

    @property
    def next_status(self):
        """Only expose an allowed forward transition, never an unverified one."""
        return self.candidate_next_status if self.can_advance else None

    @property
    def is_blocked(self):
        return bool(self.blockers)

    @property
    def blocker_message(self):
        return ' '.join(self.blockers) or None

    def checklist(self):
        return '\n'.join(f"{c.label}: {'OK' if c.passed else 'MISSING/INVALID'}" for c in self.checks)

    def to_dict(self):
        return {**asdict(self), 'information_complete': self.information_complete,
                'can_advance': self.can_advance, 'next_status': self.next_status,
                'is_blocked': self.is_blocked, 'blocker_message': self.blocker_message}


def _text(value):
    return isinstance(value, str) and bool(value.strip())


def _money(value):
    if isinstance(value, bool) or value is None:
        return None
    try:
        amount = Decimal(str(value))
        return amount if amount.is_finite() and amount > 0 else None
    except (InvalidOperation, ValueError, TypeError):
        return None


def _aware(value):
    return isinstance(value, datetime) and value.tzinfo is not None and value.utcoffset() is not None


def validate_job(job, *, quote=None, evidence=None, now=None, follow_up_after=None):
    """Evaluate one job without mutating it.

    Status strings are strict/canonical: unknown, lowercase and legacy new_job
    values raise ValueError. Reminder timing is opt-in (timedelta + aware now).
    No time threshold is silently chosen. No DB query is made explicitly here;
    eager-load relationships to avoid SQLAlchemy lazy queries.
    """
    status = job.status
    if not isinstance(status, str) or status not in STATUSES:
        raise ValueError(f'Unknown job status: {status!r}. Expected one of {sorted(STATUSES)}')
    evidence = evidence if evidence is not None else Evidence()
    if not isinstance(evidence, Evidence) or any(type(v) is not bool for v in asdict(evidence).values()):
        raise ValueError('Evidence must contain strict booleans from verified backend events.')
    if follow_up_after is not None:
        if not isinstance(follow_up_after, timedelta) or follow_up_after <= timedelta(0) or not _aware(now):
            raise ValueError('Follow-up policy requires a positive timedelta and timezone-aware now.')
    customer = getattr(job, 'customer', None)
    checks = []
    def check(key, label, passed):
        checks.append(Check(key, label, bool(passed)))
    intake = status in ('NEW', 'NEEDS_INFORMATION', 'READY_FOR_QUOTE')
    if intake:
        check('customer_name', 'Customer name', _text(getattr(customer, 'customer_name', None)))
        check('contact', 'Phone or email', _text(getattr(customer, 'phone_number', None)) or _text(getattr(customer, 'email', None)))
        check('job_address', 'Job address', _text(getattr(job, 'job_address', None)))
        check('job_description', 'Scope of work', _text(getattr(job, 'job_description', None)))
        check('job_price', 'Positive finite price', _money(getattr(job, 'job_price', None)) is not None)
    if status in ('ACCEPTED', 'SCHEDULED'):
        start = getattr(job, 'start_date', None)
        check('start_date', 'Start date', isinstance(start, date) and not isinstance(start, datetime))
    if status == 'SCHEDULED':
        check('job_address', 'Job address', _text(getattr(job, 'job_address', None)))
    if status in ('COMPLETED', 'PAYMENT_PENDING'):
        check('job_price', 'Positive finite price', _money(getattr(job, 'job_price', None)) is not None)
    missing = [c.label for c in checks if not c.passed]
    blockers = ['Missing or invalid: ' + ', '.join(missing) + '.'] if missing else []
    alerts = [Alert('MISSING_INFORMATION', blockers[0])] if missing else []
    recommended_status = 'NEEDS_INFORMATION' if intake and missing else ('READY_FOR_QUOTE' if intake else status)
    candidate = 'READY_FOR_QUOTE' if status in ('NEW', 'NEEDS_INFORMATION') else NEXT.get(status)
    rec = None
    def require(passed, message):
        if not passed:
            blockers.append(message)
    if status in ('NEW', 'NEEDS_INFORMATION'):
        rec = Recommendation('REVIEW_QUOTE', 'Review the job details before generating a quote.')
    elif status == 'READY_FOR_QUOTE':
        rec = Recommendation('GENERATE_QUOTE' if quote is None else 'REVIEW_AND_SEND_QUOTE',
                             'Review and approve the quote, then record successful sending.')
        require(quote is not None, 'A quote must exist before sending.')
        if quote is not None:
            job_id = getattr(job, 'job_id', None)
            require(job_id is not None and getattr(quote, 'job_id', None) == job_id,
                    'Selected quote must belong to this job.')
            require(_text(getattr(quote, 'quote_content', None)), 'Quote content is missing.')
            amount = _money(getattr(quote, 'amount', None))
            require(amount is not None and amount == _money(getattr(job, 'job_price', None)),
                    'Quote amount must be positive and match the current job price.')
        require(evidence.owner_approved_quote, 'Owner approval of the current quote is required.')
        require(evidence.quote_sent, 'Successful sending of the approved quote must be recorded.')
    elif status == 'QUOTE_SENT':
        require(evidence.customer_accepted, 'Customer acceptance must be recorded.')
        rec = Recommendation('WAIT_FOR_CUSTOMER', 'Waiting for customer acceptance.', False)
        if not evidence.customer_accepted and follow_up_after is not None:
            sent_at = getattr(quote, 'sent_at', None)
            if quote is None or getattr(job, 'job_id', None) is None or getattr(quote, 'job_id', None) != job.job_id or not _aware(sent_at) or sent_at > now:
                alerts.append(Alert('INVALID_QUOTE_TIMESTAMP', 'Select this job\'s sent quote with a valid timezone-aware sent_at.'))
            elif now - sent_at >= follow_up_after:
                rec = Recommendation('FOLLOW_UP', 'Review and approve a customer follow-up.')
                alerts.append(Alert('QUOTE_AWAITING_RESPONSE', 'The quote has reached the configured follow-up interval.'))
    elif status == 'ACCEPTED':
        require(evidence.schedule_confirmed, 'Owner must confirm scheduling.')
        rec = Recommendation('CONFIRM_SCHEDULE', 'Review the start date and confirm scheduling.')
    elif status == 'SCHEDULED':
        require(evidence.work_started, 'Owner must confirm work started.')
        rec = Recommendation('CONFIRM_WORK_STARTED', 'Confirm when work actually starts.')
    elif status == 'IN_PROGRESS':
        require(evidence.work_completed, 'Owner must confirm work completed.')
        rec = Recommendation('CONFIRM_WORK_COMPLETED', 'Confirm when work is complete.')
    elif status == 'COMPLETED':
        require(evidence.outstanding_payment_confirmed, 'Outstanding payment must be confirmed.')
        rec = Recommendation('REVIEW_PAYMENT', 'Review the final amount and outstanding payment.')
    elif status == 'PAYMENT_PENDING':
        require(evidence.payment_received, 'Payment receipt must be confirmed.')
        rec = Recommendation('CONFIRM_PAYMENT', 'Review payment and confirm receipt.')
        if not evidence.payment_received:
            alerts.append(Alert('PAYMENT_PENDING', 'Payment remains unconfirmed; review whether a reminder is appropriate.', 'info'))
    if missing:
        rec = Recommendation('COLLECT_INFORMATION', 'Complete the missing or invalid job information.', False)
    if not blockers and candidate is not None:
        rec = Recommendation('RECORD_STATUS', f'Record the verified transition to {candidate}.', False)
    if blockers and not missing:
        alerts.append(Alert('WORKFLOW_BLOCKED', ' '.join(blockers), 'info'))
    return ValidationResult(status, tuple(checks), recommended_status, candidate,
                            tuple(blockers), rec, tuple(alerts))


def validate_transition(job, target_status, **kwargs):
    """Raise ValueError on a skip/unverified transition; caller persists atomically.

    NEEDS_INFORMATION is an allowed pre-quote classification, not advancement.
    Reevaluate within the service transaction against current data.
    """
    if not isinstance(target_status, str) or target_status not in STATUSES:
        raise ValueError(f'Unknown target status: {target_status!r}')
    result = validate_job(job, **kwargs)
    classification = (job.status in ('NEW', 'READY_FOR_QUOTE') and
                      target_status == 'NEEDS_INFORMATION' and not result.information_complete)
    if not classification and target_status != result.next_status:
        raise ValueError(result.blocker_message or 'Transition is not allowed from the current state.')
    return result
