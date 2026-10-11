"""HTTP interface for job creation."""

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.database import get_session
from app.schemas import JobCreateRequest, JobCreateResponse
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
