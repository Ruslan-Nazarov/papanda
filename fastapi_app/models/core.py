from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Date, Text, Integer
from datetime import date
from ..database import Base

class Dashboard(Base):
    __tablename__ = 'dashboard'
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    extra_text: Mapped[str | None] = mapped_column(Text, nullable=True)

class AppSettings(Base):
    __tablename__ = 'app_settings'
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[str | None] = mapped_column(String(255), nullable=True)

class LanguageRule(Base):
    __tablename__ = 'language_rule'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    language: Mapped[str | None] = mapped_column(String(50), nullable=True)
    rule_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    rule_en: Mapped[str | None] = mapped_column(Text, nullable=True)
