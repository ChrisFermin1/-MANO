"""Extraction interface only; no Gemini calls or database access."""

from dataclasses import dataclass
from decimal import Decimal


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
    """Return no candidates while extraction is disabled.

    The flags identify missing values that future extraction may fill. The job
    service owns explicit-value precedence, customer resolution, and completeness.
    """
    return ExtractedJobInformation()
