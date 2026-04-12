from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, Boolean, Integer, ForeignKey
from datetime import datetime, timezone
from ..database import Base

class Observation(Base):
    __tablename__ = 'observations'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    text: Mapped[str] = mapped_column(String(500))
    priority: Mapped[int] = mapped_column(Integer, default=1)
    is_main: Mapped[bool] = mapped_column(Boolean, default=False)
    status: Mapped[str] = mapped_column(String(50), default="periodic")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
    end_time: Mapped[str | None] = mapped_column(String(10), nullable=True)
    no_time: Mapped[bool] = mapped_column(Boolean, default=False)

class ObservationLog(Base):
    __tablename__ = 'observation_logs'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    observation_id: Mapped[int] = mapped_column(ForeignKey('observations.id', ondelete='CASCADE'), index=True)
    done_at: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc), index=True)
