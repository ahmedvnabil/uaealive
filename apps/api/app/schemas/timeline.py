"""Timeline period DTOs."""

from typing import TYPE_CHECKING

from pydantic import BaseModel

from app.schemas.common import Localized, loc

if TYPE_CHECKING:
    from app.models.timeline import TimelinePeriod


class PeriodOut(BaseModel):
    key: str
    name: Localized
    description: Localized
    palette: dict[str, str]

    @classmethod
    def from_model(cls, period: "TimelinePeriod") -> "PeriodOut":
        return cls(
            key=period.key,
            name=loc(period, "name"),
            description=loc(period, "description"),
            palette=dict(period.palette or {}),
        )
