from functools import lru_cache
import json
import logging

import requests

from core.config import settings
from core.exception import AppException

logger = logging.getLogger(__name__)


class TranscriptionService:
    def __init__(self) -> None:
        pass

    def transcribe_audio(
        self,
        file_stream,
        filename: str,
        language: str = "auto",
        response_format: str = "verbose_json",
    ):
        try:
            files = {"file": (filename, file_stream, "application/octet-stream")}

            data = {"response_format": response_format, "language": language}

            response = requests.post(
                f"{settings.transcription_server_base_url}/inference",
                files=files,
                data=data,
                timeout=180,
            )

            response.raise_for_status()

            result = response.json()

            logger.info(f"Transcription Entry: {json.dumps(result)}")
            transcribbed_text = result.get("text", "")

            return transcribbed_text

        except requests.exceptions.Timeout:
            raise AppException("Whisper service timeout")

        except requests.exceptions.RequestException as e:
            raise AppException(f"Whisper service error: {str(e)}")

        except Exception as e:
            raise AppException(f"Unexpected error: {str(e)}")


@lru_cache
def get_transcription_service() -> TranscriptionService:
    return TranscriptionService()
