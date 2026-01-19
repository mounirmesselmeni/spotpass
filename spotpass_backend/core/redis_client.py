"""Redis client for caching and session management"""

import logging
from typing import Any

import redis

from core.config import settings


class RedisClient:
    """Redis client wrapper"""

    def __init__(self):
        """Initialize Redis client"""
        self._client: redis.Redis | None = None
        self._initialize()

    def _initialize(self):
        """Initialize Redis connection"""
        if settings.redis_host:
            try:
                self._client = redis.Redis(
                    host=settings.redis_host,
                    port=settings.redis_port,
                    password=settings.redis_password if settings.redis_password else None,
                    db=settings.redis_db,
                    decode_responses=True,
                )
                # Test connection
                self._client.ping()
                logging.info(f"Redis connected to {settings.redis_host}:{settings.redis_port}")
            except Exception as e:
                logging.warning(f"Redis connection failed: {e}")
                self._client = None
        else:
            logging.info("Redis not configured, running without cache")

    def get(self, key: str) -> Any:
        """Get value from Redis"""
        if self._client:
            return self._client.get(key)
        return None

    def set(self, key: str, value: Any, ex: int | None = None):
        """Set value in Redis with optional expiration"""
        if self._client:
            self._client.set(key, value, ex=ex)

    def delete(self, key: str):
        """Delete key from Redis"""
        if self._client:
            self._client.delete(key)

    def exists(self, key: str) -> bool:
        """Check if key exists in Redis"""
        if self._client:
            return bool(self._client.exists(key))
        return False

    @property
    def is_available(self) -> bool:
        """Check if Redis is available"""
        return self._client is not None


# Global Redis client instance
redis_client = RedisClient()
