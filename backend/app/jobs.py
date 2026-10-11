"""HTTP interface for jobs: create, list, read, update, move forward, delete."""

from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_session
from app.schemas import JobCreateRequest, JobCreateResponse, JobResponse, JobStatusRequest, JobUpdateRequest
from app.services import job_service


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
