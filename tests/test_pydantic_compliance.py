from fastapi import UploadFile
from fastapi.params import File
from pydantic import BaseModel
from fastapi_app.main import app
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.routing import APIRoute
import inspect

def test_pydantic_usage_in_routers():
    """
    Тест-аудит: проверяет, что эндпоинты используют Pydantic модели.
    """
    non_compliant_endpoints = []
    
    for route in app.routes:
        if isinstance(route, APIRoute):
            # Проверяем response_model
            has_response_model = route.response_model is not None
            
            # Проверяем возвращаемый тип
            is_html_or_redirect = False
            if route.response_class and inspect.isclass(route.response_class):
                is_html_or_redirect = issubclass(route.response_class, (HTMLResponse, RedirectResponse))
            
            # Вспомогательная проверка: если в сигнатуре возвращается HTMLResponse или RedirectResponse
            sig = inspect.signature(route.endpoint)
            return_annotation = sig.return_annotation
            if inspect.isclass(return_annotation) and issubclass(return_annotation, (HTMLResponse, RedirectResponse)):
                is_html_or_redirect = True
            
            has_pydantic_param = False
            has_file_param = False
            for param in sig.parameters.values():
                annotation = param.annotation
                if inspect.isclass(annotation) and issubclass(annotation, BaseModel):
                    has_pydantic_param = True
                    break
                # Проверка на UploadFile или File(...)
                if annotation is UploadFile or (hasattr(param.default, "__class__") and "File" in str(param.default.__class__)):
                    has_file_param = True
                    break
            
            # Исключаем статические файлы и системные роуты
            if "/static" in route.path or route.path in ["/openapi.json", "/docs", "/redoc", "/favicon.ico"]:
                continue

            # Эндпоинты, которые намеренно возвращают dict/list без Pydantic-схемы
            # (поиск, аналитика, debug, гибкие структуры)
            known_dict_endpoints = [
                "/api/db/search/{model_name}",
                "/api/db/get_record/{model_name}/{record_id}",
                "/api/events/month",
                "/import_sentences",
                "/api/sentences",
                "/api/notes/search",
                "/api/stickers/debug_info",
                "/api/observations/full-tree",
            ]
            if route.path in known_dict_endpoints:
                continue

            # HTML и Redirect не требуют Pydantic для ответа, но POST/PUT/DELETE требуют для входа
            if is_html_or_redirect:
                # Если это POST/PUT/PATCH/DELETE в HTML-роуте, требуем хотя бы типизацию входных данных
                if route.methods.intersection({"POST", "PUT", "PATCH", "DELETE"}) and not has_pydantic_param and not has_file_param:
                    # Исключаем простые POST без тела (системные действия)
                    allowed_empty_posts = [
                        "/logout", 
                        "/settings/start_sandbox", "/settings/exit_sandbox",
                        "/settings/deep_clean", "/settings/import_excel",
                        "/settings/delete_db", "/settings/activate_db",
                        "/delete_event_settings"
                    ]
                    if not any(route.path.startswith(p) for p in allowed_empty_posts):
                        non_compliant_endpoints.append(f"{route.methods} {route.path} (HTML Form missing Pydantic)")
                continue

            # Для JSON эндпоинтов требуем либо входную модель, либо выходную
            if not has_response_model and not has_pydantic_param and not has_file_param:
                # Исключаем GET запросы без параметров
                if "GET" in route.methods and len(sig.parameters) == 0:
                    continue
                # Исключаем простые эндпоинты с ID в пути
                if len(sig.parameters) <= 1 and any(p in route.path for p in ["{filename}", "{event_id}", "{note_id}"]):
                    continue
                non_compliant_endpoints.append(f"{route.methods} {route.path} (JSON missing model)")

    if non_compliant_endpoints:
        print(f"\n[!] {len(non_compliant_endpoints)} эндпоинтов требуют внимания:")
        for ep in non_compliant_endpoints:
            print(f"  - {ep}")
            
    assert len(non_compliant_endpoints) == 0, f"Найдено {len(non_compliant_endpoints)} некондиционных эндпоинтов!"

if __name__ == "__main__":
    test_pydantic_usage_in_routers()
