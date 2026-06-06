from typing import Any, Dict, Optional

class PapandaError(Exception):
    """Базовое исключение для всего приложения."""
    def __init__(
        self, 
        message: str, 
        status_code: int = 500, 
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)

class EntityNotFoundError(PapandaError):
    """Ошибка: объект не найден."""
    def __init__(self, entity_name: str, entity_id: Any):
        super().__init__(
            message=f"{entity_name} с ID {entity_id} не найден(а).",
            status_code=404
        )

class ValidationError(PapandaError):
    """Ошибка валидации бизнес-логики."""
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(message=message, status_code=400, details=details)

class AuthenticationError(PapandaError):
    """Ошибка аутентификации."""
    def __init__(self, message: str = "Ошибка авторизации"):
        super().__init__(message=message, status_code=401)

class PermissionDeniedError(PapandaError):
    """Ошибка доступа."""
    def __init__(self, message: str = "Доступ запрещен"):
        super().__init__(message=message, status_code=403)
