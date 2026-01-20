"""Core API schemas"""

from pydantic import BaseModel


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
