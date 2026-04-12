import logging
import sys
import json
from datetime import datetime, timezone

class JSONFormatter(logging.Formatter):
    """
    Форматтер для логирования в формате JSON. 
    Удобно для парсинга в CloudWatch/ELK и просто для порядка.
    """
    def format(self, record):
        log_record = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "func": record.funcName,
        }
        if record.exc_info:
            log_record["exception"] = self.formatException(record.exc_info)
        return json.dumps(log_record)

def setup_logging(log_level="INFO"):
    logger = logging.getLogger()
    logger.setLevel(log_level)

    # Очищаем старые обработчики, если они есть
    if logger.hasHandlers():
        logger.handlers.clear()

    # Стандартный вывод (Console)
    console_handler = logging.StreamHandler(sys.stdout)
    
    # В режиме разработки можно оставить обычный текст, 
    # а в продакшене использовать JSON. 
    # Здесь для примера используем структурированный JSON.
    formatter = JSONFormatter()
    console_handler.setFormatter(formatter)
    
    logger.addHandler(console_handler)
    return logger

# Инициализируем при импорте
from .config import settings
logger = setup_logging(settings.log_level)
