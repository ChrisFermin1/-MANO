"""HTTP interface for jobs: create, list, read, update, move forward, delete."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_session
from app.schemas import (
    JobCreateRequest,
    JobCreateResponse,
    JobResponse,
    JobStatusRequest,
    JobUpdateRequest,
    ReadNoteRequest,
    ReadNoteResponse,
)
from app.services import job_service, note_reading_service


router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.post("", response_model=JobCreateResponse, status_code=status.HTTP_201_CREATED)
def create_job_endpoint(
    request: JobCreateRequest,
    session: Annotated[Session, Depends(get_session)],
) -> JobCreateResponse:
    try:
        return job_service.create_job(session, request)
    except job_service.BusinessNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except job_service.InvalidCustomerError as error:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)
        ) from error
    except SQLAlchemyError as error:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="No se pudo guardar el trabajo.",
        ) from error


# "Escanear una nota": photo in, the note's text out. Doesn't save anything; the app sends the
# checked text to POST /jobs afterwards.
@router.post("/read-note", response_model=ReadNoteResponse)
def read_note_endpoint(request: ReadNoteRequest) -> ReadNoteResponse:
    try:
        reading = note_reading_service.read_note(request.image, request.mime_type)
    except note_reading_service.InvalidImageError as error:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(error)) from error
    except note_reading_service.ImageTooLargeError as error:
        raise HTTPException(status_code=status.HTTP_413_CONTENT_TOO_LARGE, detail=str(error)) from error
    except note_reading_service.NotConfiguredError as error:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(error)) from error
    except note_reading_service.GeminiBusyError as error:
        raise HTTPException(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=str(error)) from error
    except note_reading_service.GeminiUnavailableError as error:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(error)) from error
    return ReadNoteResponse(text=reading.text, is_job_note=reading.is_job_note)


_DB_ERROR = HTTPException(
    status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail="No se pudo guardar el trabajo."
)


@router.get("", response_model=list[JobResponse])
def list_jobs_endpoint(
    business_id: UUID,
    session: Annotated[Session, Depends(get_session)],
) -> list[JobResponse]:
    try:
        return job_service.list_jobs(session, business_id)
    except job_service.BusinessNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.get("/{job_id}", response_model=JobResponse)
def get_job_endpoint(job_id: UUID, session: Annotated[Session, Depends(get_session)]) -> JobResponse:
    try:
        return job_service.get_job(session, job_id)
    except job_service.JobNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error


@router.patch("/{job_id}", response_model=JobResponse)
def update_job_endpoint(
    job_id: UUID,
    request: JobUpdateRequest,
    session: Annotated[Session, Depends(get_session)],
) -> JobResponse:
    try:
        return job_service.update_job(session, job_id, request)
    except job_service.JobNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except job_service.InvalidCustomerError as error:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(error)) from error
    except SQLAlchemyError as error:
        raise _DB_ERROR from error


@router.post("/{job_id}/status", response_model=JobResponse)
def change_status_endpoint(
    job_id: UUID,
    request: JobStatusRequest,
    session: Annotated[Session, Depends(get_session)],
) -> JobResponse:
    try:
        return job_service.change_status(session, job_id, request)
    except job_service.JobNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except job_service.InvalidStatusChangeError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    except SQLAlchemyError as error:
        raise _DB_ERROR from error


@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job_endpoint(job_id: UUID, session: Annotated[Session, Depends(get_session)]) -> Response:
    try:
        job_service.delete_job(session, job_id)
    except job_service.JobNotFoundError as error:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail=str(error)) from error
    except job_service.JobLockedError as error:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(error)) from error
    except SQLAlchemyError as error:
        raise _DB_ERROR from error
    return Response(status_code=status.HTTP_204_NO_CONTENT)
