import pytest
from fastapi import APIRouter
from pydantic import BaseModel
from fastapi_app.main import app

from fastapi.routing import APIRoute

def test_pydantic_usage_in_routers():
    """
    Тест-аудит: проверяет, что эндпоинты используют Pydantic модели.
    """
    non_compliant_endpoints = []
    
    for route in app.routes:
        if isinstance(route, APIRoute):
            # Проверяем response_model
            has_response_model = route.response_model is not None
            
            # Проверяем наличие Pydantic моделей в аргументах функции
            import inspect
            sig = inspect.signature(route.endpoint)
            has_pydantic_param = False
            for param in sig.parameters.values():
                # Проверяем аннотацию типа
                annotation = param.annotation
                if inspect.isclass(annotation) and issubclass(annotation, BaseModel):
                    has_pydantic_param = True
                    break
            
            # Исключаем статические файлы и системные роуты
            if "/static" in route.path or route.path in ["/openapi.json", "/docs", "/redoc"]:
                continue
                
            # Если нет ни модели ответа, ни входной модели (и это не GET запрос без параметров)
            if not has_response_model and not has_pydantic_param:
                non_compliant_endpoints.append(f"{route.methods} {route.path}")

    if non_compliant_endpoints:
        print(f"\n[!] {len(non_compliant_endpoints)} эндпоинтов не используют Pydantic:")
        for ep in non_compliant_endpoints:
            print(f"  - {ep}")
            
    assert len(non_compliant_endpoints) < 40, f"Слишком много эндпоинтов ({len(non_compliant_endpoints)}) не используют Pydantic!"

if __name__ == "__main__":
    test_pydantic_usage_in_routers()
