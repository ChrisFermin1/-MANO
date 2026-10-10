# Mano — extraction

`extraction_service.py` implements the interface Joshua defined for `job_service`:

```python
extract_job_information(description, *, extract_customer_name: bool, extract_job_price: bool)
    -> ExtractedJobInformation(customer_name: str | None, job_price: Decimal | None)
```

- **No Gemini, no database.** Pure Python, deterministic rules, so `POST /jobs` can work today.
- **Candidates only.** It fills a field only when its flag is `True`. `job_service` keeps owning explicit-value precedence, customer resolution, and completeness (Ojo).

## Rules

| Field | Found when… | Examples |
|---|---|---|
| `customer_name` | a capitalized name follows a cue | "para **Maria Lopez**", "for **John Smith**", "la señora **Lupe**", "casa de **Juan Pérez**", "**Maria**'s kitchen", "Cliente: **Rosa Méndez**" |
| `job_price` | a price is **actually said** | "$1,240", "le cobro 800", "1.500 dólares", "2 mil", "$2.5k", "en total $1,000" |

**When unsure, return `None`.** Then Ojo marks the field missing and Carlos fills it in:
- Several prices and no total ("sala $600 y cocina $400") → `None`. Adding them up is a business decision.
- A unit price ("$150 each", "600 por cuarto", "$3 per sq ft") → `None`.
- Lowercase words, days, months and a few brands are never names ("para el lunes", "Home Depot").
- Spelled-out numbers ("ochocientos") aren't handled yet → `None`. Gemini will cover these.

## Tests

From `backend/` (stdlib `unittest`, no extra dependencies):

```sh
python -m unittest discover -s tests -v
```

## Plugging in Gemini (AI integration)

Keep this function's signature. Inside it, call the Gemini client for the flags that are `True`, validate what comes back (same types), and fall back to these rules if the call fails or returns nothing.

## Open questions for the team

`docs/technical-design.md` §9 says the exact fields are still to be defined. The frontend currently also uses **address**, **service**, and **line items** (each with its own price and English/Spanish text). Decide:
1. One `job_price` (total), or line items?
2. Should extraction also return `address` / `service` / `scope` / `start_date` / `notes` (FR-06)?
