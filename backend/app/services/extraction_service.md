# Mano — extraction

`extraction_service.py` implements the interface Joshua defined for `job_service`:

```python
extract_job_information(description, *, extract_customer_name: bool, extract_job_price: bool)
    -> ExtractedJobInformation(customer_name: str | None, job_price: Decimal | None)
```

- **Gemini first, rules as backup. No database.**
- **Candidates only.** It fills a field only when its flag is `True`. `job_service` keeps owning explicit-value precedence, customer resolution, and completeness (Ojo).

## Gemini

Used when `GEMINI_API_KEY` is set (docker-compose already passes it to the backend). Model: `GEMINI_MODEL`, default `gemini-flash-lite-latest` (about 1 second, bigger free quota). 20-second limit.

Every answer is checked against the note before it's used:
- the **name must appear in the note** (a "corrected" or invented name is dropped);
- the **price must be a number that was said** (an added-up or invented total is dropped).

When Gemini answers, its checked answer is final, including "no single total". If there's no key, the call fails (network, quota 429, timeout), the rules below are used. `POST /jobs` never fails because of Gemini.

Real notes it handles that the rules can't:

| Note | customer_name | job_price |
|---|---|---|
| "636 Wite / Plantar pasto / Arreglar siding / Poner Zinc / Total 1200$ / ATL Homeiker" | ATL Homeiker | 1200 |
| "…poner stein en el porche… Total 1400$ only Leibor… Gracias" | None | 1400 |
| "ventilador para José Martínez, son 250 dólares, y cambiar dos enchufes por 80" | José Martínez | None (no single total) |

## Rules (fallback)

| Field | Found when… | Examples |
|---|---|---|
| `customer_name` | a capitalized name follows a cue | "para **Maria Lopez**", "for **John Smith**", "la señora **Lupe**", "casa de **Juan Pérez**", "**Maria**'s kitchen", "Cliente: **Rosa Méndez**" |
| `job_price` | a price is **actually said** | "$1,240", "le cobro 800", "1.500 dólares", "2 mil", "$2.5k", "en total $1,000" |

**When unsure, return `None`.** Then Ojo marks the field missing and Carlos fills it in:
- Several prices and no total ("sala $600 y cocina $400") → `None`. Adding them up is a business decision.
- A unit price ("$150 each", "600 por cuarto", "$3 per sq ft") → `None`.
- Lowercase words, days, months and a few brands are never names ("para el lunes", "Home Depot").
- Spelled-out numbers ("ochocientos") aren't handled by the rules → `None` (Gemini handles them).

## Tests

From `backend/` (stdlib `unittest`, no extra dependencies; Gemini is mocked, so tests never call the network):

```sh
python -m unittest discover -s tests -v
```

## Open questions for the team

`docs/technical-design.md` §9 says the exact fields are still to be defined. The frontend currently also uses **address**, **service**, and **line items** (each with its own price and English/Spanish text). Decide:
1. One `job_price` (total), or line items? The frontend now supports both: one job total, or a price per item.
2. Should extraction also return `address` / `service` / `scope` / `start_date` / `notes` (FR-06)?
