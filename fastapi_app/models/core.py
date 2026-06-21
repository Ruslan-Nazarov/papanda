from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Date, Text, Integer
from datetime import date
from ..database import Base

class Dashboard(Base):
    """
    Модель для хранения элементов дашборда и их метаданных.
    """
    __tablename__ = 'dashboard'
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    extra_text: Mapped[str | None] = mapped_column(Text, nullable=True)

class AppSettings(Base):
    """
    Модель для хранения глобальных настроек приложения (ключ-значение).
    """
    __tablename__ = 'app_settings'
    key: Mapped[str] = mapped_column(String(50), primary_key=True)
    value: Mapped[str | None] = mapped_column(String(255), nullable=True)


