"""Historical character model for the AI chat experience."""

from typing import Any

from sqlalchemy import Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Character(Base):
    __tablename__ = "characters"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    slug: Mapped[str] = mapped_column(String(120), unique=True, index=True)
    name_ar: Mapped[str] = mapped_column(String(255))
    name_en: Mapped[str] = mapped_column(String(255))
    role_ar: Mapped[str] = mapped_column(String(255))
    role_en: Mapped[str] = mapped_column(String(255))
    greeting_ar: Mapped[str] = mapped_column(String(1000))
    greeting_en: Mapped[str] = mapped_column(String(1000))
    avatar: Mapped[str | None] = mapped_column(String(500), nullable=True)
    persona_prompt: Mapped[str] = mapped_column(Text)
    fallback_qa: Mapped[list[Any]] = mapped_column(JSONB, default=list)
