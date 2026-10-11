"""Tests for the job rules in app/services/job_service.py (needs the backend requirements installed).

Run from backend/:  python -m unittest discover -s tests -v
"""

import unittest
from decimal import Decimal
from itertools import product
from types import SimpleNamespace
from unittest import mock
from uuid import uuid4

from app.services import job_service
from app.services.job_service import is_meaningful_description


class MeaningfulDescriptionTest(unittest.TestCase):
    def test_real_job_notes_pass(self):
        for text in [
            "Pintar la sala para Maria Lopez, le cobro 800",
            "636 Wite / Plantar pasto / Arreglar siding / Poner Zinc / Total 1200$ / ATL Homeiker",
            "Cambiar dos enchufes",
            "Stain the deck",
            "Poner stein en el porche exterior",
            "Poner coquin en las ventanas y pintar",
            "Instalar un ventilador de techo",
            "Drywall patch in the bedroom for Luis Gomez, charge 350",
        ]:
            with self.subTest(text=text):
                self.assertTrue(is_meaningful_description(text))

    def test_not_a_job_still_flagged(self):
        for text in ["Hola, gracias", "Total 1200$", "Maria Lopez", "pintar", "la sala", ""]:
            with self.subTest(text=text):
                self.assertFalse(is_meaningful_description(text))


class ResolveCustomerTest(unittest.TestCase):
    """One match links; zero or multiple matches remain unresolved."""

    def session_with(self, matches):
        session = mock.MagicMock()
        session.scalars.return_value.all.return_value = matches
        return session

    def test_unknown_name_does_not_create_a_customer(self):
        session = self.session_with([])
        business_id = uuid4()
        customer = job_service.resolve_customer(session, business_id, customer_id=None, customer_name="  Maria Lopez ")
        self.assertIsNone(customer)
        session.add.assert_not_called()
        session.flush.assert_not_called()

    def test_existing_name_links_without_creating(self):
        existing = object()
        session = self.session_with([existing])
        self.assertIs(job_service.resolve_customer(session, uuid4(), customer_id=None, customer_name="Maria Lopez"), existing)
        session.add.assert_not_called()

    def test_two_customers_with_the_same_name_stay_unlinked(self):
        session = self.session_with([object(), object()])
        self.assertIsNone(job_service.resolve_customer(session, uuid4(), customer_id=None, customer_name="Maria Lopez"))
        session.add.assert_not_called()

    def test_no_name_no_customer(self):
        session = self.session_with([])
        self.assertIsNone(job_service.resolve_customer(session, uuid4(), customer_id=None, customer_name="  "))
        session.add.assert_not_called()



class CompletenessTest(unittest.TestCase):
    def test_new_requires_all_three_fields(self):
        for resolved, meaningful, priced in product([False, True], repeat=3):
            with self.subTest(resolved=resolved, meaningful=meaningful, priced=priced):
                status, missing = job_service.evaluate_completeness(
                    object() if resolved else None,
                    "Paint three bedrooms and repair the trim." if meaningful else "job",
                    Decimal("2500.00") if priced else None,
                )
                expected = []
                if not resolved:
                    expected.append("customer_name")
                if not meaningful:
                    expected.append("job_description")
                if not priced:
                    expected.append("job_price")
                self.assertEqual(missing, expected)
                self.assertEqual(status, "NEEDS_INFORMATION" if expected else "NEW")

    def test_extracted_priced_items_do_not_override_missing_job_fields(self):
        job = SimpleNamespace(
            customer=object(), job_description="job", job_price=None,
            line_items=[SimpleNamespace(description="Paint bedrooms", amount=Decimal("2500"))],
        )
        self.assertEqual(job_service._missing_fields(job), ["job_description", "job_price"])

    def test_zero_price_exists(self):
        status, missing = job_service.evaluate_completeness(
            object(), "Paint the garage.", Decimal("0.00")
        )
        self.assertEqual((status, missing), ("NEW", []))


if __name__ == "__main__":
    unittest.main()
