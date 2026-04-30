import logging
import sys
import json
from datetime import datetime, timezone
from typing import Any, Dict

class JSONFormatter(logging.Formatter):
    """
    Форматтер для логирования в формате JSON. 
    Удобно для парсинга в CloudWatch/ELK и просто для структурированного хранения логов.
    """
    def format(self, record: logging.LogRecord) -> str:
        """
        Форматирует запись лога в JSON-строку.
        
        Args:
            record: Объект записи лога.
            
        Returns:
            str: JSON-представление лога.
        """
        log_record: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "func": record.funcName,
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def setup_logging(log_level: str = "INFO") -> logging.Logger:
    """
    Инициализирует и настраивает корневой логгер приложения.
    
    Args:
        log_level: Уровень логирования (из настроек).
        
    Returns:
        logging.Logger: Настроенный корневой логгер.
    """
    logger = logging.getLogger()
    logger.setLevel(log_level)

    # Очищаем старые обработчики, если они есть
    if logger.hasHandlers():
        logger.handlers.clear()

    # Стандартный вывод (Console)
    console_handler = logging.StreamHandler(sys.stdout)
    
    # Рекомендуется использовать JSON в продакшене и обычный текст в разработке,
    # но здесь мы используем JSONFormatter для демонстрации структурированного подхода.
    formatter = JSONFormatter()
    console_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    return logger

# Инициализируем при импорте
from .config import settings
logger: logging.Logger = setup_logging(settings.log_level)
