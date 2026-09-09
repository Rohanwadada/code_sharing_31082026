from fastapi import APIRouter, Depends, File, UploadFile

from core.exception import AppException, BadRequestException
from modules.audio_transcription.service import get_transcription_service


router = APIRouter(prefix="/tr", tags=["voice"])


@router.post("/transcribe", status_code=200)
def trabscribe(
    file: UploadFile = File(...),
    transcription_service=Depends(get_transcription_service),
):
    try:
        if file.filename == "":
            raise BadRequestException("Empty filename")

        # Call service
        text = transcription_service.transcribe_audio(
            file_stream=file.file, filename=file.filename, language="en"
        )

        return {"success": True, "text": text}

    except Exception as e:
        raise AppException(message=str(e))
