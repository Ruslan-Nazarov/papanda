from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Date, DateTime, Boolean, Integer, Float, Text
from datetime import datetime, date, timezone
from ..database import Base

class WordStats(Base):
    __tablename__ = 'word_stats'
    word: Mapped[str] = mapped_column(String(100), primary_key=True)
    count: Mapped[int] = mapped_column(Integer, default=0)
    last_shown: Mapped[datetime] = mapped_column(DateTime, default=lambda: datetime.now(timezone.utc))
    eng: Mapped[str | None] = mapped_column(String(100), nullable=True)
    de: Mapped[str | None] = mapped_column(String(100), nullable=True)
    it: Mapped[str | None] = mapped_column(String(100), nullable=True)
    ru: Mapped[str | None] = mapped_column(String(200), nullable=True)
    meaning: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_known_en: Mapped[bool] = mapped_column(Boolean, default=False)
    is_known_it: Mapped[bool] = mapped_column(Boolean, default=False)
    is_known_de: Mapped[bool] = mapped_column(Boolean, default=False)
    is_learned: Mapped[bool] = mapped_column(Boolean, default=False, index=True)

class WordStatsSnapshot(Base):
    __tablename__ = 'word_stats_snapshot'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, unique=True, default=lambda: datetime.now(timezone.utc).date())
    coverage: Mapped[float] = mapped_column(Float)
    imw: Mapped[float] = mapped_column(Float)

class WordShowsDaily(Base):
    __tablename__ = 'word_shows_daily'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    date: Mapped[date] = mapped_column(Date, unique=True, index=True)
    shows_count: Mapped[int] = mapped_column(Integer, default=0)

class Wink(Base):
    __tablename__ = 'wink'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    date: Mapped[datetime] = mapped_column(DateTime, index=True)
