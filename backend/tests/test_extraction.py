"""Tests for app/services/extraction_service.py (Mano extraction (stdlib unittest — no extra dependencies).

Run from backend/:  python -m unittest discover -s tests -v
"""

import os
import unittest
from decimal import Decimal
from unittest import mock

from app.services import extraction_service
from app.services.extraction_service import ExtractedJobInformation, extract_job_information

# The rule tests must never call Gemini, even on a machine that has a key set.
_no_key = mock.patch.dict(os.environ, {"GEMINI_API_KEY": ""})


def setUpModule():
    _no_key.start()


def tearDownModule():
    _no_key.stop()


def both(text: str) -> ExtractedJobInformation:
    return extract_job_information(text, extract_customer_name=True, extract_job_price=True)


class FlagsTest(unittest.TestCase):
    def test_flags_off_extract_nothing(self):
        result = extract_job_information(
            "Pintar la sala para Maria Lopez, le cobro $1,200",
            extract_customer_name=False,
            extract_job_price=False,
        )
        self.assertEqual(result, ExtractedJobInformation())

    def test_only_requested_field_is_filled(self):
        text = "Pintar la sala para Maria Lopez, le cobro $1,200"
        only_name = extract_job_information(text, extract_customer_name=True, extract_job_price=False)
        only_price = extract_job_information(text, extract_customer_name=False, extract_job_price=True)
        self.assertEqual(only_name, ExtractedJobInformation(customer_name="Maria Lopez"))
        self.assertEqual(only_price, ExtractedJobInformation(job_price=Decimal("1200")))

    def test_empty_description(self):
        self.assertEqual(both(""), ExtractedJobInformation())


class CustomerNameTest(unittest.TestCase):
    def test_spanish_para(self):
        self.assertEqual(both("Pintar la sala y cocina para Maria Lopez, dos manos.").customer_name, "Maria Lopez")

    def test_english_for(self):
        self.assertEqual(both("Paint the living room for John Smith next week").customer_name, "John Smith")

    def test_accents_and_particles(self):
        self.assertEqual(both("Reparar la pared para María de la Cruz").customer_name, "María de la Cruz")

    def test_customer_is(self):
        self.assertEqual(both("Paint for $500, customer is Tom Brady").customer_name, "Tom Brady")
        self.assertEqual(both("Cliente: Rosa Méndez, pintar la cocina").customer_name, "Rosa Méndez")

    def test_honorific_is_not_part_of_name(self):
        self.assertEqual(both("Arreglar el baño de la señora Lupe").customer_name, "Lupe")
        self.assertEqual(both("Paint the kitchen for Mrs. Johnson").customer_name, "Johnson")

    def test_casa_de(self):
        self.assertEqual(both("Pintar la casa de Juan Pérez en Katy").customer_name, "Juan Pérez")

    def test_english_possessive(self):
        self.assertEqual(both("Fix the crack in Maria's kitchen").customer_name, "Maria")

    def test_lowercase_words_after_para_are_not_names(self):
        self.assertIsNone(both("Comprar pintura para la sala").customer_name)
        self.assertIsNone(both("Pintar tres cuartos para el lunes").customer_name)

    def test_days_and_brands_are_not_names(self):
        self.assertIsNone(both("Start the job for Monday").customer_name)
        self.assertIsNone(both("Pintura de Sherwin Williams para Navidad").customer_name)

    def test_requirements_example_has_no_customer(self):
        # docs/requirements.md FR-03
        self.assertIsNone(both("Voy a pintar tres cuartos, reparar el trim y comenzar el martes.").customer_name)


class JobPriceTest(unittest.TestCase):
    def test_dollar_sign(self):
        self.assertEqual(both("Paint 3 rooms, $1,240 total").job_price, Decimal("1240"))

    def test_dollar_with_cents(self):
        self.assertEqual(both("Fix the fence for $350.50").job_price, Decimal("350.50"))

    def test_spanish_cobro(self):
        self.assertEqual(both("Le cobro 800 por pintar la cocina").job_price, Decimal("800"))

    def test_spanish_currency_word(self):
        self.assertEqual(both("Son 1,500 dólares por todo").job_price, Decimal("1500"))

    def test_spanish_thousands_with_dot(self):
        self.assertEqual(both("El precio es 1.240 dólares").job_price, Decimal("1240"))

    def test_spanish_decimal_comma(self):
        self.assertEqual(both("Cuesta 1.240,50 dólares").job_price, Decimal("1240.50"))

    def test_mil_and_k(self):
        self.assertEqual(both("Le cobro 2 mil por todo el baño").job_price, Decimal("2000"))
        self.assertEqual(both("Quoted $2.5k for the patio").job_price, Decimal("2500"))

    def test_k_must_be_a_whole_word(self):
        self.assertEqual(both("$800 kitchen repaint").job_price, Decimal("800"))

    def test_same_amount_said_twice_counts_once(self):
        self.assertEqual(both("Le cobro $900, sí, 900 dólares").job_price, Decimal("900"))

    def test_explicit_total_wins_over_parts(self):
        text = "La sala a $600 y la cocina $400, en total $1,000"
        self.assertEqual(both(text).job_price, Decimal("1000"))

    def test_several_prices_without_total_returns_none(self):
        # adding them up is a business decision, not extraction → leave it missing for Ojo
        self.assertIsNone(both("La sala $600 y la cocina $400").job_price)
        self.assertIsNone(both("Cobro 600 por la sala y 400 por la cocina").job_price)

    def test_counts_dates_and_times_are_not_prices(self):
        self.assertIsNone(both("Pintar 3 cuartos, dos manos, empezar el 13 de octubre a las 9").job_price)

    def test_unit_prices_are_not_the_job_price(self):
        # multiplying is a business decision → no price, Ojo asks
        self.assertIsNone(both("Fix 2 doors, $150 each").job_price)
        self.assertIsNone(both("Pintar 3 cuartos, cobro 600 por cuarto").job_price)
        self.assertIsNone(both("Drywall at $3 per sq ft").job_price)
        self.assertIsNone(both("Puertas a 150 dólares cada una").job_price)

    def test_requirements_example_has_no_price(self):
        self.assertIsNone(both("Voy a pintar tres cuartos, reparar el trim y comenzar el martes.").job_price)

    def test_spelled_out_numbers_are_not_handled_yet(self):
        # Known limit of the rule-based version (Gemini will cover it): returns None, never a wrong number
        self.assertIsNone(both("Le cobro ochocientos por la sala").job_price)


class BothFieldsTest(unittest.TestCase):
    def test_full_spanish_description(self):
        result = both("Pintar la sala y cocina para Ana Ruiz, dos manos, le cobro $1,420. Empezamos el lunes.")
        self.assertEqual(result, ExtractedJobInformation(customer_name="Ana Ruiz", job_price=Decimal("1420")))

    def test_full_english_description(self):
        result = both("Drywall patch in the bedroom for Luis Gomez, charge 350")
        self.assertEqual(result, ExtractedJobInformation(customer_name="Luis Gomez", job_price=Decimal("350")))


ATL_NOTE = "636 Wite\nPlantar pasto\nArreglar siding\nPoner Zinc\nTotal 1200$\nATL Homeiker"


class GeminiTest(unittest.TestCase):
    """Gemini's answer is used when it checks out against the text; otherwise the rules take over."""

    def ask(self, name, price):
        return mock.patch.object(
            extraction_service,
            "_ask_gemini",
            lambda text: ExtractedJobInformation(
                customer_name=extraction_service._checked_name(name, text),
                job_price=extraction_service._checked_price(price, text),
            ),
        )

    def setUp(self):
        key = mock.patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})
        key.start()
        self.addCleanup(key.stop)

    def test_gemini_finds_company_on_its_own_line(self):
        # the rules can't see "ATL Homeiker" (no "para"/"for" before it); Gemini can
        self.assertIsNone(extraction_service._find_customer_name(ATL_NOTE))
        with self.ask("ATL Homeiker", 1200):
            self.assertEqual(both(ATL_NOTE), ExtractedJobInformation("ATL Homeiker", Decimal("1200")))

    def test_made_up_name_is_rejected(self):
        with self.ask("ATL Homemaker", 1200):  # spelling "fixed" by the model: not in the text
            self.assertIsNone(both(ATL_NOTE).customer_name)

    def test_summed_price_is_rejected(self):
        # 800 + 400 was never said; adding prices up is not extraction
        with self.ask("Ana Ruiz", 1200):
            result = both("Pintar la sala para Ana Ruiz, 800 por la sala y 400 por la cocina")
        self.assertEqual(result.customer_name, "Ana Ruiz")
        self.assertIsNone(result.job_price)

    def test_spoken_formats_are_accepted(self):
        for text, said in [("le cobro $1,420", 1420), ("son 2.5k", 2500), ("Total 1400$ only Leibor", 1400)]:
            with self.subTest(text=text):
                self.assertEqual(extraction_service._checked_price(said, text), Decimal(said))

    def test_gemini_not_stated_is_final(self):
        # "250 ... y ... por 80" has no single total; Gemini says so and the rules must not override it
        text = "Instalar un ventilador para José Martínez, son 250 dólares, y cambiar dos enchufes por 80"
        self.assertEqual(extraction_service._find_job_price(text), Decimal("250"))  # what the rules alone would say
        with self.ask("José Martínez", None):
            self.assertEqual(both(text), ExtractedJobInformation("José Martínez", None))

    def test_price_comes_back_as_written(self):
        self.assertEqual(str(extraction_service._checked_price(1200.0, "Total 1200$")), "1200")

    def test_gemini_failure_falls_back_to_rules(self):
        with mock.patch.object(extraction_service, "_ask_gemini", return_value=None):
            result = both("Pintar la sala para Maria Lopez, le cobro $1,200")
        self.assertEqual(result, ExtractedJobInformation("Maria Lopez", Decimal("1200")))

    def test_real_call_errors_fall_back_to_rules(self):
        # no network or library here: _ask_gemini must swallow the error, not crash POST /jobs
        with mock.patch("builtins.__import__", side_effect=ImportError("no google-genai")):
            self.assertIsNone(extraction_service._ask_gemini("Pintar para Maria Lopez"))

    def test_flags_still_respected_with_gemini(self):
        with self.ask("ATL Homeiker", 1200):
            result = extract_job_information(ATL_NOTE, extract_customer_name=False, extract_job_price=True)
        self.assertEqual(result, ExtractedJobInformation(None, Decimal("1200")))

    def test_no_key_means_no_gemini_call(self):
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": ""}), \
             mock.patch.object(extraction_service, "_ask_gemini") as ask:
            both("Pintar para Maria Lopez")
        ask.assert_not_called()


if __name__ == "__main__":
    unittest.main()
