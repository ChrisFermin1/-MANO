"""Tests for POST /jobs/read-note and app/services/note_reading_service.py (Gemini is mocked, never called).

Run from backend/:  python -m unittest discover -s tests -v
"""

import base64
import os
import unittest
from unittest import mock

from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.jobs import router
from app.services import note_reading_service
from app.services.note_reading_service import GeminiBusyError, GeminiUnavailableError

PHOTO = base64.b64encode(b"\xff\xd8\xff fake jpeg bytes").decode()
NOTE = "ATL Homemaker\n1. tile floor 1400$\n2. paint kitchen 600$"

# only the jobs router: these routes never touch the database
app = FastAPI()
app.include_router(router)
client = TestClient(app)

_with_key = mock.patch.dict(os.environ, {"GEMINI_API_KEY": "test-key"})


def post(image=PHOTO, mime="image/jpeg"):
    return client.post("/jobs/read-note", json={"image": image, "mimeType": mime})


class ReadNoteRouteTest(unittest.TestCase):
    def setUp(self):
        _with_key.start()
        self.addCleanup(_with_key.stop)

    def gemini(self, **kwargs):
        patcher = mock.patch.object(note_reading_service, "_ask_gemini", **kwargs)
        self.addCleanup(patcher.stop)
        return patcher.start()

    def test_returns_the_note_text(self):
        ask = self.gemini(return_value=(f"  {NOTE}  ", True))
        response = post()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"text": NOTE, "isJobNote": True})
        ask.assert_called_once_with(base64.b64decode(PHOTO), "image/jpeg")

    def test_not_a_job_note_returns_empty_text(self):
        self.gemini(return_value=("a cat on a sofa", False))
        self.assertEqual(post().json(), {"text": "", "isJobNote": False})

    def test_empty_text_is_not_a_job_note(self):
        self.gemini(return_value=("   ", True))
        self.assertEqual(post().json(), {"text": "", "isJobNote": False})

    def test_long_text_is_cut(self):
        self.gemini(return_value=("x" * 5000, True))
        self.assertEqual(len(post().json()["text"]), note_reading_service.MAX_TEXT)

    def test_unsupported_type_is_400(self):
        ask = self.gemini(return_value=(NOTE, True))
        self.assertEqual(post(mime="application/pdf").status_code, 400)
        ask.assert_not_called()

    def test_bad_base64_is_400(self):
        self.gemini(return_value=(NOTE, True))
        self.assertEqual(post(image="not base64!!").status_code, 400)

    def test_empty_image_is_400(self):
        self.gemini(return_value=(NOTE, True))
        self.assertEqual(post(image="").status_code, 400)

    def test_too_large_is_413(self):
        ask = self.gemini(return_value=(NOTE, True))
        huge = "A" * (note_reading_service.MAX_BYTES * 4 // 3 + 8)
        self.assertEqual(post(image=huge).status_code, 413)
        ask.assert_not_called()

    def test_missing_field_is_422(self):
        self.assertEqual(client.post("/jobs/read-note", json={"image": PHOTO}).status_code, 422)

    def test_no_key_is_503(self):
        ask = self.gemini(return_value=(NOTE, True))
        with mock.patch.dict(os.environ, {"GEMINI_API_KEY": ""}):
            self.assertEqual(post().status_code, 503)
        ask.assert_not_called()

    def test_gemini_busy_is_429(self):
        self.gemini(side_effect=GeminiBusyError("busy"))
        self.assertEqual(post().status_code, 429)

    def test_gemini_failure_is_502(self):
        self.gemini(side_effect=GeminiUnavailableError("down"))
        self.assertEqual(post().status_code, 502)


class AskGeminiErrorsTest(unittest.TestCase):
    """Gemini's own errors become busy (429/503) or unavailable (anything else)."""

    def setUp(self):
        _with_key.start()
        self.addCleanup(_with_key.stop)

    def failing_client(self, error):
        patcher = mock.patch("google.genai.Client")
        self.addCleanup(patcher.stop)
        patcher.start().return_value.models.generate_content.side_effect = error

    def test_429_is_busy(self):
        from google.genai import errors

        self.failing_client(errors.ClientError(429, {"error": {"message": "quota"}}))
        with self.assertRaises(GeminiBusyError):
            note_reading_service._ask_gemini(b"x", "image/jpeg")

    def test_400_is_unavailable(self):
        from google.genai import errors

        self.failing_client(errors.ClientError(400, {"error": {"message": "bad"}}))
        with self.assertRaises(GeminiUnavailableError):
            note_reading_service._ask_gemini(b"x", "image/jpeg")

    def test_timeout_is_unavailable(self):
        self.failing_client(TimeoutError())
        with self.assertRaises(GeminiUnavailableError):
            note_reading_service._ask_gemini(b"x", "image/jpeg")


if __name__ == "__main__":
    unittest.main()
