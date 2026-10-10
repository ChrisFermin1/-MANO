"""Tests for Mano extraction (stdlib unittest — no extra dependencies).

Run from backend/:  python -m unittest discover -s tests -v
"""

import unittest
from decimal import Decimal

from app.mano.extraction import ExtractedJobInformation, extract_job_information


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


if __name__ == "__main__":
    unittest.main()
