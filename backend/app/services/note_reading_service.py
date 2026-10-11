"""Read a photo of a job note ("Escanear una nota" in the app).

A handwritten estimate, a notebook page or a WhatsApp screenshot goes in; the note's text comes out,
copied word for word (no translating, no fixing). It does not create a job: the app puts the text in
the "Nuevo trabajo" box so Carlos checks it, then sends it to POST /jobs like anything he typed.
"""

import base64
import binascii
import logging
import os
from dataclasses import dataclass

logger = logging.getLogger(__name__)

MIME_TYPES = frozenset({"image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"})
MAX_BYTES = 6 * 1024 * 1024  # the app shrinks photos to ~1600px first; this only stops oversized uploads
MAX_TEXT = 4000
_GEMINI_TIMEOUT_MS = 25_000

_PROMPT = """This is a photo from a contractor: a handwritten estimate, a notebook page, a printed note, or a
screenshot of a chat. Copy the text about the job EXACTLY as written: same words, same spelling mistakes,
same mix of Spanish and English, same numbers and symbols ("1400$"). Keep one line per line of the note
(numbered or bulleted items stay on their own lines). Do not translate, correct, summarize or add anything.
Leave out things that are not part of the note (phone status bar, app buttons, timestamps, chat names
unless they are the client). Unreadable words: write your best reading followed by "(?)".
is_job_note: true if the photo contains a note about work, a job, a client or a price; false otherwise
(then text can be empty)."""


class InvalidImageError(Exception):
    """Not base64, empty, or a type we don't read."""


class ImageTooLargeError(Exception):
    pass


class NotConfiguredError(Exception):
    """No GEMINI_API_KEY."""


class GeminiBusyError(Exception):
    """Gemini answered 429/503: the app says "busy, try again"."""


class GeminiUnavailableError(Exception):
    """Anything else went wrong: the app lets Carlos type the note instead."""


@dataclass(frozen=True)
class NoteReading:
    text: str = ""
    is_job_note: bool = False


def decode_image(image: str, mime_type: str) -> bytes:
    if mime_type not in MIME_TYPES:
        raise InvalidImageError(f"Unsupported image type: {mime_type or 'none'}")
    # cheap size check before decoding: base64 is 4 chars per 3 bytes
    if len(image) * 3 // 4 > MAX_BYTES:
        raise ImageTooLargeError("Image is larger than 6 MB")
    try:
        data = base64.b64decode(image, validate=True)
    except (binascii.Error, ValueError) as error:
        raise InvalidImageError("Image is not valid base64") from error
    if not data:
        raise InvalidImageError("Image is empty")
    return data


def read_note(image: str, mime_type: str) -> NoteReading:
    data = decode_image(image, mime_type)
    if not os.getenv("GEMINI_API_KEY", "").strip():
        raise NotConfiguredError("GEMINI_API_KEY is not set")
    text, is_job_note = _ask_gemini(data, mime_type)
    text = text.strip()[:MAX_TEXT]
    if not is_job_note or not text:
        return NoteReading()
    return NoteReading(text=text, is_job_note=True)


def _ask_gemini(data: bytes, mime_type: str) -> tuple[str, bool]:
    from google import genai
    from google.genai import errors, types
    from pydantic import BaseModel

    class _Answer(BaseModel):
        text: str = ""
        is_job_note: bool = False

    try:
        client = genai.Client(
            api_key=os.environ["GEMINI_API_KEY"].strip(),
            http_options=types.HttpOptions(timeout=_GEMINI_TIMEOUT_MS),
        )
        response = client.models.generate_content(
            model=os.getenv("GEMINI_MODEL", "").strip() or "gemini-flash-lite-latest",
            contents=[_PROMPT, types.Part.from_bytes(data=data, mime_type=mime_type)],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=_Answer,
                temperature=0,
            ),
        )
        answer = _Answer.model_validate_json(response.text or "{}")
    except errors.APIError as error:
        logger.warning("Reading the note failed: Gemini %s", error.code)
        if error.code in (429, 503):
            raise GeminiBusyError("Gemini is busy") from error
        raise GeminiUnavailableError("Gemini failed") from error
    except Exception as error:  # network, timeout, bad JSON
        logger.warning("Reading the note failed (%s)", type(error).__name__)
        raise GeminiUnavailableError("Gemini failed") from error
    return answer.text, answer.is_job_note
