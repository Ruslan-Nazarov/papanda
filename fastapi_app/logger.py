import logging
import sys
import os
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
    formatter = JSONFormatter()
    console_handler.setFormatter(formatter)
    logger.addHandler(console_handler)

    # Файловый вывод (для .exe / frozen mode)
    # Пытаемся получить путь к папке данных
    try:
        from .config import USER_DATA_ROOT
        log_dir = USER_DATA_ROOT / "data"
        log_dir.mkdir(parents=True, exist_ok=True)
        log_file = log_dir / "app.log"
        
        file_handler = logging.FileHandler(str(log_file), encoding='utf-8')
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        # Если не удалось инициализировать файл (например, до загрузки конфига), 
        # просто продолжаем с консолью
        pass

    return logger

# Инициализируем при импорте
from .config import settings
logger = setup_logging(settings.log_level)
