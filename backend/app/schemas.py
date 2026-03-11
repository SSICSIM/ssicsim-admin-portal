from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str = "ok"


class CommitteeBase(BaseModel):
    name: str = Field(min_length=1, max_length=255)


class CommitteeCreate(CommitteeBase):
    pass


class CommitteeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)


class CommitteeOut(CommitteeBase):
    id: int

    class Config:
        from_attributes = True

