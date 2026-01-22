"""Core API schemas"""

from typing import Generic, TypeVar

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    """Health check response"""

    status: str
    database: str
    redis: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "status": "healthy",
                    "database": "connected",
                    "redis": "connected",
                }
            ]
        }
    }


class RootResponse(BaseModel):
    """Root endpoint response"""

    message: str
    version: str
    status: str

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "message": "SpotPass Backend API",
                    "version": "1.0.0",
                    "status": "healthy",
                }
            ]
        }
    }


T = TypeVar("T")


class PaginatedResponse(BaseModel, Generic[T]):
    """Generic paginated response wrapper"""

    items: list[T] = Field(..., description="List of items for the current page")
    total: int = Field(..., description="Total number of items across all pages")
    page: int = Field(..., description="Current page number (1-indexed)")
    page_size: int = Field(..., description="Number of items per page")
    total_pages: int = Field(..., description="Total number of pages")
    next: str | None = Field(None, description="URL for the next page, if available")
    previous: str | None = Field(None, description="URL for the previous page, if available")

    model_config = {
        "json_schema_extra": {
            "examples": [
                {
                    "items": [],
                    "total": 100,
                    "page": 1,
                    "page_size": 20,
                    "total_pages": 5,
                }
            ]
        }
    }
