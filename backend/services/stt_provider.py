import asyncio
import json
import os
import urllib.error
import urllib.request
from typing import Dict

from backend.config import (
    FREE_AI_API_KEY,
    FREE_AI_BASE_URL,
    FREE_AI_STT_MODEL,
    PUBLIC_BASE_URL,
    STT_PROVIDER,
)


def using_hosted_stt() -> bool:
    return STT_PROVIDER == "freeai"


def build_uploaded_audio_url(file_path: str) -> str:
    if not PUBLIC_BASE_URL:
        raise RuntimeError("PUBLIC_BASE_URL is required when STT_PROVIDER=freeai")

    filename = os.path.basename(file_path)
    return f"{PUBLIC_BASE_URL}/uploaded-audio/{filename}"


def _post_free_ai_transcription(audio_url: str, language: str) -> Dict:
    if not FREE_AI_API_KEY:
        raise RuntimeError("FREE_AI_API_KEY is required when STT_PROVIDER=freeai")

    payload = {
        "url": audio_url,
        "model": FREE_AI_STT_MODEL,
    }
    if language:
        payload["language"] = language

    request = urllib.request.Request(
        f"{FREE_AI_BASE_URL}/v1/stt/transcribe/",
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {FREE_AI_API_KEY}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            response_body = response.read().decode("utf-8")
    except urllib.error.HTTPError as error:
        error_body = error.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Free.ai STT failed with HTTP {error.code}: {error_body}") from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Free.ai STT request failed: {error.reason}") from error

    data = json.loads(response_body)
    text = data.get("text")
    if not isinstance(text, str):
        raise RuntimeError("Free.ai STT response did not include a text field")

    return data


async def transcribe_with_free_ai(file_path: str, language: str) -> Dict:
    audio_url = build_uploaded_audio_url(file_path)
    loop = asyncio.get_running_loop()
    data = await loop.run_in_executor(None, _post_free_ai_transcription, audio_url, language)
    text = data["text"].strip()

    return {
        "text": text,
        "words": [],
        "average_token_confidence": None,
        "provider": "freeai",
        "raw_response": data,
    }
