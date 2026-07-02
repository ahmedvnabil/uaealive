"""Shared slowapi rate limiter (own module so routers avoid circular imports)."""

from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)
