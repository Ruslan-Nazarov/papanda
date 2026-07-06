from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, Date, Text, Integer, Boolean, DateTime
from datetime import date, datetime
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

class Counter(Base):
    """
    Модель для хранения счетчиков (отсчет до / отсчет после).
    """
    __tablename__ = 'counter'
    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    title: Mapped[str] = mapped_column(String(255))
    date: Mapped[date] = mapped_column(Date, index=True)
    type: Mapped[str] = mapped_column(String(20), index=True)  # "until" или "after"
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime | None] = mapped_column(DateTime, default=datetime.now, nullable=True)
