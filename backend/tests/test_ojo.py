"""Run from backend: python -m unittest discover -s tests -v."""
import json
import unittest
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from uuid import uuid4
from app.db import Job, Customer, Quote
from app.ojo import Evidence, validate_job, validate_transition


def job(status='NEW', **changes):
    value = Job(job_id=uuid4(), business_id=uuid4(), status=status,
                customer=Customer(customer_name='Maria', phone_number='555-0100'),
                job_address='123 Oak St', job_description='Paint three rooms',
                job_price=Decimal('1800'), start_date=date(2026, 10, 14))
    for key, item in changes.items():
        setattr(value, key, item)
    return value


def quote(j, **changes):
    q = Quote(quote_id=uuid4(), job_id=j.job_id, amount=j.job_price,
              quote_content='Paint three rooms for $1800', status='draft')
    for key, item in changes.items():
        setattr(q, key, item)
    return q


class OjoTests(unittest.TestCase):
    def test_complete_new_is_ready(self):
        r = validate_job(job())
        self.assertTrue(r.information_complete)
        self.assertEqual(r.next_status, 'READY_FOR_QUOTE')

    def test_missing_customer_does_not_crash(self):
        r = validate_job(job(customer=None))
        self.assertEqual([c.key for c in r.missing], ['customer_name', 'contact'])
        self.assertEqual(r.recommended_status, 'NEEDS_INFORMATION')
        self.assertIsNone(r.next_status)
        self.assertEqual(r.recommendation.code, 'COLLECT_INFORMATION')
        self.assertTrue(r.alerts)

    def test_email_can_replace_phone(self):
        j = job()
        j.customer.phone_number = None
        j.customer.email = 'maria@example.com'
        self.assertTrue(validate_job(j).information_complete)

    def test_invalid_prices(self):
        for price in (None, 0, -1, True, 'bad', Decimal('NaN'), Decimal('Infinity')):
            with self.subTest(price=price):
                self.assertFalse(validate_job(job(job_price=price)).information_complete)

    def test_unknown_status_rejected(self):
        for status in ('new_job', 'NEW_JOB', 'new', 'BOGUS', None):
            with self.subTest(status=status), self.assertRaises(ValueError):
                validate_job(job(status))

    def test_ready_rechecks_all_intake_fields(self):
        for field in ('job_address', 'job_description', 'job_price', 'customer'):
            with self.subTest(field=field):
                j = job('READY_FOR_QUOTE', **{field: None})
                r = validate_job(j, quote=quote(j), evidence=Evidence(owner_approved_quote=True, quote_sent=True))
                self.assertFalse(r.can_advance)
                self.assertEqual(r.recommended_status, 'NEEDS_INFORMATION')

    def test_information_is_not_permission(self):
        j = job('READY_FOR_QUOTE')
        r = validate_job(j, quote=quote(j))
        self.assertTrue(r.information_complete)
        self.assertFalse(r.can_advance)
        self.assertIsNone(r.next_status)

    def test_quote_belongs_to_job_and_matches_amount(self):
        j = job('READY_FOR_QUOTE')
        for changes in ({'job_id': uuid4()}, {'amount': 12}, {'amount': None}, {'quote_content': ' '}):
            with self.subTest(changes=changes):
                self.assertFalse(validate_job(j, quote=quote(j, **changes),
                    evidence=Evidence(owner_approved_quote=True, quote_sent=True)).can_advance)

    def test_quote_requires_both_approval_and_sending(self):
        j = job('READY_FOR_QUOTE')
        for e in (Evidence(), Evidence(owner_approved_quote=True), Evidence(quote_sent=True)):
            self.assertFalse(validate_job(j, quote=quote(j), evidence=e).can_advance)
        self.assertEqual(validate_job(j, quote=quote(j), evidence=Evidence(
            owner_approved_quote=True, quote_sent=True)).next_status, 'QUOTE_SENT')

    def test_missing_quote_blocks_even_with_evidence(self):
        self.assertFalse(validate_job(job('READY_FOR_QUOTE'), evidence=Evidence(
            owner_approved_quote=True, quote_sent=True)).can_advance)

    def test_each_later_stage_requires_its_own_event(self):
        cases = [('QUOTE_SENT', 'customer_accepted', 'ACCEPTED'),
            ('ACCEPTED', 'schedule_confirmed', 'SCHEDULED'),
            ('SCHEDULED', 'work_started', 'IN_PROGRESS'),
            ('IN_PROGRESS', 'work_completed', 'COMPLETED'),
            ('COMPLETED', 'outstanding_payment_confirmed', 'PAYMENT_PENDING'),
            ('PAYMENT_PENDING', 'payment_received', 'PAID')]
        for state, event, target in cases:
            with self.subTest(state=state):
                j = job(state)
                self.assertFalse(validate_job(j).can_advance)
                self.assertEqual(validate_job(j, evidence=Evidence(**{event: True})).next_status, target)

    def test_schedule_date_still_required(self):
        for start in (None, '2026-10-14', datetime.now()):
            self.assertFalse(validate_job(job('ACCEPTED', start_date=start),
                evidence=Evidence(schedule_confirmed=True)).can_advance)

    def test_paid_is_terminal(self):
        r = validate_job(job('PAID'))
        self.assertFalse(r.can_advance)
        self.assertFalse(r.is_blocked)
        self.assertIsNone(r.recommendation)

    def test_no_skipping_stages(self):
        with self.assertRaises(ValueError):
            validate_transition(job(), 'PAID', evidence=Evidence(payment_received=True))

    def test_missing_information_and_recovery(self):
        j = job(customer=None)
        validate_transition(j, 'NEEDS_INFORMATION')
        j.status = 'NEEDS_INFORMATION'
        j.customer = Customer(customer_name='Maria', email='m@example.com')
        validate_transition(j, 'READY_FOR_QUOTE')

    def test_stale_ready_classification(self):
        validate_transition(job('READY_FOR_QUOTE', job_address=None), 'NEEDS_INFORMATION')
        with self.assertRaises(ValueError):
            validate_transition(job('QUOTE_SENT'), 'NEEDS_INFORMATION')

    def test_followup_boundary_and_approval(self):
        now = datetime(2026, 10, 11, tzinfo=timezone.utc)
        j = job('QUOTE_SENT')
        for elapsed, expected in ((timedelta(days=2, hours=23), 'WAIT_FOR_CUSTOMER'),
                                   (timedelta(days=3), 'FOLLOW_UP')):
            r = validate_job(j, quote=quote(j, sent_at=now-elapsed), now=now,
                             follow_up_after=timedelta(days=3))
            self.assertEqual(r.recommendation.code, expected)
            self.assertFalse(r.can_advance)
            if expected == 'FOLLOW_UP':
                self.assertTrue(r.recommendation.requires_owner_approval)

    def test_no_followup_after_acceptance(self):
        now = datetime.now(timezone.utc)
        j = job('QUOTE_SENT')
        r = validate_job(j, quote=quote(j, sent_at=now-timedelta(days=10)), now=now,
            follow_up_after=timedelta(days=3), evidence=Evidence(customer_accepted=True))
        self.assertFalse(any(a.code == 'QUOTE_AWAITING_RESPONSE' for a in r.alerts))
        self.assertEqual(r.next_status, 'ACCEPTED')

    def test_invalid_quote_time_alert(self):
        j = job('QUOTE_SENT')
        r = validate_job(j, quote=quote(j, sent_at=datetime.now()),
            now=datetime.now(timezone.utc), follow_up_after=timedelta(days=3))
        self.assertIn('INVALID_QUOTE_TIMESTAMP', [a.code for a in r.alerts])

    def test_no_default_timer(self):
        self.assertEqual(validate_job(job('QUOTE_SENT')).recommendation.code, 'WAIT_FOR_CUSTOMER')

    def test_strict_evidence(self):
        with self.assertRaises(ValueError):
            validate_job(job('QUOTE_SENT'), evidence=Evidence(customer_accepted='false'))

    def test_policy_requires_aware_clock(self):
        with self.assertRaises(ValueError):
            validate_job(job(), now=datetime.now(), follow_up_after=timedelta(days=3))

    def test_no_mutation_and_json_output(self):
        j = job()
        r = validate_job(j)
        self.assertEqual(j.status, 'NEW')
        self.assertIsInstance(json.dumps(r.to_dict()), str)

if __name__ == '__main__':
    unittest.main()
