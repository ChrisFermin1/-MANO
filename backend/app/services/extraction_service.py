"""Mano extraction: candidate values from a free-text job description (English or Spanish).

Interface agreed with job_service (Joshua): text in, candidate customer_name / job_price out.
No database access.

How it works:
1. Gemini reads the description (when GEMINI_API_KEY is set). It understands messy real notes:
   a company client alone on the last line ("ATL Homeiker"), "Total 1200$", misspellings.
2. Every Gemini answer is checked against the text before it is used: the name must appear in
   the description, and the price must be a number that was actually said (so a made-up value
   or an added-up total is rejected).
3. If there is no key, Gemini fails or times out, or an answer fails the check, the
   deterministic rules below are used instead. They are also the whole behavior in tests.

Principles:
- Candidates only. job_service owns explicit-value precedence, customer resolution,
  and completeness (Ojo decides what is missing).
- Never guess. A price is returned only when the owner actually said one; if several
  prices are mentioned without saying which is the total, no price is returned
  (adding them up would be a business decision, not extraction).
"""

import logging
import os
import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation

logger = logging.getLogger(__name__)


@dataclass(frozen=True)
class ExtractedJobInformation:
    """Candidate values only. Customer IDs must be resolved by job_service."""

    customer_name: str | None = None
    job_price: Decimal | None = None


def extract_job_information(
    description: str,
    *,
    extract_customer_name: bool,
    extract_job_price: bool,
) -> ExtractedJobInformation:
    """Return candidates for the values job_service marked as missing.

    The flags identify missing values that extraction may fill. The job
    service owns explicit-value precedence, customer resolution, and completeness.
    """
    text = description or ""
    if not (extract_customer_name or extract_job_price):
        return ExtractedJobInformation()

    # When Gemini answers, its (checked) answer is final, including "not stated": e.g. "250 and 80"
    # has no single total, and the rules would wrongly pick 250. The rules are the fallback only.
    ai = _ask_gemini(text) if _gemini_configured() else None
    if ai is not None:
        name, price = ai.customer_name, ai.job_price
    else:
        name, price = _find_customer_name(text), _find_job_price(text)
    return ExtractedJobInformation(
        customer_name=name if extract_customer_name else None,
        job_price=price if extract_job_price else None,
    )


# ───────────────────────── Gemini ─────────────────────────

_GEMINI_TIMEOUT_MS = 20_000  # usually ~1s; past this it's hung and the rules take over

_PROMPT = """You extract two values from a contractor's job note. It can be Spanish, English,
or both, written fast, with misspellings. Return JSON only.

customer_name: the client. A person OR a company (property manager, builder, realtor),
e.g. "Maria Lopez" or "ATL Homes". It can appear anywhere, including alone on the first or
last line with no word like "para"/"for". Copy it exactly as written; do not fix its spelling.
Never use a title ("Estimado de trabajo"), a greeting ("Gracias"), a street, or the work as a
name. null if there is no client in the text.

job_price: the price for the WHOLE job, as a number, ONLY if the note states it: one total
("Total 1200$", "son 800 dolares") or a single price. If it lists prices per item without a
total, or only a unit price ("150 por puerta"), return null. Never add numbers up.

Job note:
"""


def _gemini_configured() -> bool:
    return bool(os.getenv("GEMINI_API_KEY", "").strip())


def _ask_gemini(text: str) -> ExtractedJobInformation | None:
    """Gemini's answer, or None when it can't be used (the caller falls back to the rules)."""
    try:
        from google import genai
        from google.genai import types
        from pydantic import BaseModel

        class _Answer(BaseModel):
            customer_name: str | None = None
            job_price: float | None = None

        client = genai.Client(
            api_key=os.environ["GEMINI_API_KEY"].strip(),
            http_options=types.HttpOptions(timeout=_GEMINI_TIMEOUT_MS),
        )
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "").strip() or "gemini-flash-lite-latest",
            contents=_PROMPT + text,
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_Answer,
                temperature=0.1,
            ),
        )
        answer = _Answer.model_validate_json(response.text or "{}")
    except Exception as error:  # network, quota (429), timeout, bad JSON: rules take over
        logger.warning("Gemini extraction unavailable (%s); using rules.", type(error).__name__)
        return None

    return ExtractedJobInformation(
        customer_name=_checked_name(answer.customer_name, text),
        job_price=_checked_price(answer.job_price, text),
    )


def _norm(s: str) -> str:
    return re.sub(r"\s+", " ", s).strip().lower()


def _checked_name(name: str | None, text: str) -> str | None:
    """Keep Gemini's name only if those words are really in the description."""
    if not name or not name.strip():
        return None
    name = re.sub(r"\s+", " ", name).strip()
    return name if _norm(name) in _norm(text) else None


def _checked_price(price: float | None, text: str) -> Decimal | None:
    """Keep Gemini's price only if that amount was actually said (no made-up or summed totals)."""
    if price is None or price <= 0:
        return None
    try:
        amount = Decimal(str(price))
    except InvalidOperation:
        return None
    for m in re.finditer(rf"(?<![\d.,])({_NUM}{_MULT})", text, re.IGNORECASE):
        said = _to_decimal(m.group(1))
        if said is not None and said == amount:
            return said  # the amount as written in the note ("1200", not 1.2E+3)
    return None


# ───────────────────────── customer name ─────────────────────────

# A capitalized word, accents allowed: "María", "O'Neil", "Pérez-Soto"
_WORD = r"[A-ZÁÉÍÓÚÑÜ][a-záéíóúñü]+(?:['’-][A-ZÁÉÍÓÚÑÜa-záéíóúñü]+)?"
# Up to 3 words, allowing Spanish particles inside: "María de la Cruz"
_NAME = rf"{_WORD}(?:\s+(?:(?:de|del|la|las|los|y)\s+)*{_WORD}){{0,2}}"

# Words that introduce the customer. Case-insensitive cue, but the name itself must be capitalized.
# Titles are skipped, not kept: "para la señora Lupe" → "Lupe", "for Mrs. Johnson" → "Johnson"
_HONORIFIC = r"(?:(?:la\s+|el\s+)?(?:señora|señor|sra\.?|sr\.?)|doña|don|mrs\.?|mr\.?|ms\.?|miss)"
_LEAD = (
    r"(?:para|for|(?:cliente|customer|client)(?:\s*:|\s+(?:is|es|name\s+is))?"
    r"|(?:casa|cocina|baño|sala|cuarto|patio|trabajo|proyecto)\s+(?:de|del)(?:\s+la|\s+el)?)"
)
# Case-insensitive cue ("para", "for the", optional title), but the name itself must be capitalized.
_CUE = rf"(?:{_LEAD}(?:\s+{_HONORIFIC})?|{_HONORIFIC})"
_CUE_RE = re.compile(rf"(?<![A-Za-zÁÉÍÓÚÑÜáéíóúñü])(?i:{_CUE})\s+(?-i:({_NAME}))")
# English possessive: "Maria's kitchen", "the Lopez's house"
_POSSESSIVE_RE = re.compile(rf"\b({_NAME})['’]s\s+(?i:house|home|kitchen|bathroom|room|living\s+room|patio|job|place)\b")

# Capitalized words that are not people (days, months, brands/trades that start sentences, etc.)
_NOT_A_NAME = {
    "lunes", "martes", "miércoles", "miercoles", "jueves", "viernes", "sábado", "sabado", "domingo",
    "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday",
    "enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre",
    "octubre", "noviembre", "diciembre", "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december",
    "navidad", "christmas", "home", "depot", "lowes", "sherwin", "williams", "behr",
}


def _find_customer_name(text: str) -> str | None:
    for regex in (_CUE_RE, _POSSESSIVE_RE):
        for match in regex.finditer(text):
            name = _clean_name(match.group(1))
            if name:
                return name
    return None


def _clean_name(raw: str) -> str | None:
    words = raw.split()
    # cut at the first word that is clearly not part of a person's name
    kept: list[str] = []
    for w in words:
        if w.lower() in _NOT_A_NAME:
            break
        kept.append(w)
    # drop trailing particles left behind ("María de")
    while kept and kept[-1].lower() in {"de", "del", "la", "las", "los", "y"}:
        kept.pop()
    return " ".join(kept) or None


# ───────────────────────── job price ─────────────────────────

# 1,240 · 1.240 · 1240 · 1240.50 · 1.240,50 · 2.5 (as in "2.5k")
_NUM = r"\d{1,3}(?:[.,]\d{3})+(?:[.,]\d{1,2})?|\d+(?:[.,]\d{1,2})?"
_MULT = r"(?:\s*(?:k|mil|thousand)\b)?"  # whole word: "$800 kitchen" is not 800k
_CURRENCY = r"(?:dólares|dolares|dólar|dolar|dollars|dollar|bucks|usd)"
_PRICE_WORDS = (
    r"(?:total|precio|presupuesto|cobro|cobrar|cobraría|cobraria|cobraré|cobrare|le\s+cobro|les\s+cobro"
    r"|cuesta|cuestan|costo|vale|price|total\s+of|charge|charging|charged|cost|costs|quote|quoted|for\s+a\s+total\s+of)"
)

_MONEY_RES = [
    # "$1,240"  "$ 800"  "$2.5k"
    re.compile(rf"\$\s*({_NUM}{_MULT})", re.IGNORECASE),
    # "1,240 dólares"  "800 dollars"  "2 mil dólares"
    re.compile(rf"\b({_NUM}{_MULT})\s*{_CURRENCY}\b", re.IGNORECASE),
    # "le cobro 800"  "precio: 1200"  "total de $1,420"  "charge 950"
    re.compile(rf"\b{_PRICE_WORDS}\b\s*(?:es\s+|de\s+|is\s+|of\s+|:\s*)?(?:como\s+|about\s+|around\s+|unos\s+)?\$?\s*({_NUM}{_MULT})", re.IGNORECASE),
]
# "... y 400 por la cocina" / "... and 300 for the trim": a second price in a list
_LIST_PRICE_RE = re.compile(rf"\b(?:y|and)\s+\$?\s*({_NUM}{_MULT})\s+(?:por|for|en|on|para)\b", re.IGNORECASE)
# "800 por la sala" / "300 for the trim": a price attached to one item (so a later "y 400 por…" makes two)
_ITEM_PRICE_RE = re.compile(rf"(?<![\d.,])({_NUM}{_MULT})\s+(?:por|for)\s+(?:la|el|los|las|the)\b", re.IGNORECASE)
_TOTAL_RE = re.compile(
    rf"\b(?:total|en\s+total|in\s+total|todo\s+por|all\s+for|everything\s+for)\b\s*(?:es\s+|de\s+|is\s+|of\s+|:\s*)?\$?\s*({_NUM}{_MULT})",
    re.IGNORECASE,
)


# A unit price is not the job price: "$150 each", "600 por cuarto", "$3 per sq ft", "cada uno"
_PER_UNIT_RE = re.compile(
    r"\s*(?:dólares|dolares|dollars|bucks|usd)?\s*"  # used with .match(text, pos)
    r"(?:each|apiece|a\s+piece|per\b|/|cada\b|c/u|por\s+(?:cada|cuarto|pieza|puerta|ventana|hora|pie|metro|día|dia)"
    r"|a\s+(?:room|door|window|hour|day|foot|sq))",
    re.IGNORECASE,
)


def _find_job_price(text: str) -> Decimal | None:
    # 1) an explicit total wins
    total = _TOTAL_RE.search(text)
    if total:
        return _to_decimal(total.group(1))

    # 2) otherwise only when exactly ONE distinct price was said
    found: dict[int, Decimal] = {}  # start position → amount (same amount matched by 2 rules counts once)
    for regex in (*_MONEY_RES, _LIST_PRICE_RE, _ITEM_PRICE_RE):
        for m in regex.finditer(text):
            if _PER_UNIT_RE.match(text, m.end(1)):
                return None  # a per-unit price was said → the total isn't known; leave it for Ojo
            amount = _to_decimal(m.group(1))
            if amount is not None and not any(abs(pos - m.start(1)) < 3 for pos in found):
                found[m.start(1)] = amount
    distinct = set(found.values())
    return distinct.pop() if len(distinct) == 1 else None


def _to_decimal(raw: str) -> Decimal | None:
    s = raw.strip().lower()
    multiplier = Decimal(1)
    for suffix, value in (("thousand", 1000), ("mil", 1000), ("k", 1000)):
        if s.endswith(suffix):
            multiplier = Decimal(value)
            s = s[: -len(suffix)].strip()
            break

    # Thousands vs decimals: "1,240" / "1.240" = 1240; "1240.50" / "1240,50" = 1240.50
    if re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+", s):
        s = re.sub(r"[.,]", "", s)
    elif re.fullmatch(r"\d{1,3}(?:[.,]\d{3})+[.,]\d{1,2}", s):
        s = re.sub(r"[.,](?=\d{3})", "", s).replace(",", ".")
    else:
        s = s.replace(",", ".")
    try:
        amount = Decimal(s) * multiplier
    except InvalidOperation:
        return None
    return amount if amount > 0 else None
