"""Mano extraction: candidate values from a free-text job description (English or Spanish).

Interface agreed with job_service (Joshua): no Gemini calls, no database access.
This version uses deterministic rules so POST /jobs works end to end today. When the
Gemini integration exists, it can fill the same fields behind this same function,
with these rules kept as the fallback.

Principles:
- Candidates only. job_service owns explicit-value precedence, customer resolution,
  and completeness (Ojo decides what is missing).
- Never guess. A price is returned only when the owner actually said one; if several
  prices are mentioned without saying which is the total, no price is returned
  (adding them up would be a business decision, not extraction).
"""

import re
from dataclasses import dataclass
from decimal import Decimal, InvalidOperation


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
    return ExtractedJobInformation(
        customer_name=_find_customer_name(text) if extract_customer_name else None,
        job_price=_find_job_price(text) if extract_job_price else None,
    )


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
    for regex in (*_MONEY_RES, _LIST_PRICE_RE):
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
