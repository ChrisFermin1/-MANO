from elevenlabs import ElevenLabs
from app.config import Settings
import io

settings = Settings()

def transcribe_audio(audio_bytes: bytes) -> str:
    if not settings.elevenlabs_api_key:
        raise RuntimeError("ELEVENLABS_API_KEY is not set")

    client = ElevenLabs(api_key=settings.elevenlabs_api_key)
    audio_file = io.BytesIO(audio_bytes)
    audio_file.name = "audio.webm"

    transcription = client.speech_to_text.convert(
        file=audio_file,
        model_id="scribe_v2",
    )

    text = getattr(transcription, "text", None)
    if not text:
        raise RuntimeError("ElevenLabs returned no transcript")
    return text
