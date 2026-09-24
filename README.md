# Papanda / Conspect 0.12.0

Редактор конспектов: ручной режим по умолчанию, дополнительная ИИ-генерация,
история, формулы, категории и публичные ссылки. Backend: FastAPI + SQLAlchemy +
SQLite; frontend: браузерные ES-модули и TipTap.

## Локальный запуск

Нужны **Python 3.12** и **Node.js >=22.12** для сборки интерфейса и тестов.
Команды выполняются из корня этого репозитория.

### Windows / PowerShell

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --require-hashes -r requirements-dev.txt
# Если .env ещё нет: Copy-Item .env.example .env
npm ci
npm run build
.\.venv\Scripts\python.exe run.py
```

Если Python отсутствует в `py`, вместо него укажите путь к установленному
Python 3.12. Существующий `.env` сохраняйте. `run.bat` использует `.venv`.

### Linux

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r requirements-dev.txt
# Если .env ещё нет: cp .env.example .env
npm ci
npm run build
.venv/bin/python run.py
```

Адрес: http://127.0.0.1:8080. `HOST`, `PORT`, `UVICORN_RELOAD` управляют запуском.
В production устанавливайте `requirements.txt` вместо `requirements-dev.txt`;
reload выключайте. Для demo — один worker (проверяется блокировкой при старте).
Квоты хранятся в SQLite и переживают перезапуск. При прямом запуске Uvicorn
используйте `--no-proxy-headers`, чтобы приложение само проверяло доверенный прокси.
Для ручного редактора API-ключи не нужны. Для ИИ настройте используемый провайдер
в `.env`; доступность модели зависит от провайдера и аккаунта.

## Данные и режимы

- `DEMO_MODE=false`: личная БД `data/db/papanda.db`; запросы разрешены только
  с loopback и локальным Host, без прокси.
- `DEMO_MODE=true`: отдельная БД на серверную сессию в `data/demo/`, случайная
  cookie проверяется в реестре, срок 7 дней. Публичные ссылки работают между
  сессиями через реестр токенов; личные стикеры и служебные поля не публикуются.
- `DATABASE_URL` переопределяет личную БД. На данном этапе проверяется SQLite.
  Для нестандартных путей задавайте `DB_DIR` и `DEMO_DIR` явно: изменение только
  `DATA_DIR` не пересчитывает остальные значения Settings.

Настройка HTTPS/proxy, сессий, квот, импорта и GigaChat CA описана в
[решении R2](docs/access-and-import-boundaries.md). Старые demo-cookie автоматически
не мигрируются: произвольная cookie не подтверждает владение старой БД.
Многопользовательский сервис с аккаунтами пока не поддерживается.
Полный статус этапов — `docs/refactoring-progress.md`.

## Проверки

```powershell
npm ci
npm run build
.\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
.\.venv\Scripts\python.exe -m coverage run -m pytest -q -p no:cacheprovider
.\.venv\Scripts\python.exe -m coverage report
npm run lint
npm run check:types
npm run check:js
npm test
npm run test:browser
```

На Linux используйте `.venv/bin/python`. `npm ci` устанавливает Puppeteer и
совместимый Chromium; Linux также требует системные библиотеки Chromium.
Логические тесты `npm test` и проверка синтаксиса не требуют браузера.
Для установки только пакетов: `npm ci --ignore-scripts`, затем при необходимости
`npx puppeteer browsers install chrome`.

Python-тесты используют временные каталоги и отключённые ключи ИИ. Фикстура
`file_client` запускает настоящий lifespan и get_db с файловой SQLite.
JS unit-тесты загружают реальные тела модулей с подменёнными импортами; browser-тесты
проверяют DOM и пользовательские сценарии на отдельном сервере с временной БД:
ручной ввод, save/reload, версии, sharing, формулы, рисунки, графики, клавиатура,
узкий экран и генерация через mock SSE. Внешние запросы блокируются.

После изменения JS/CSS выполняйте `npm run build` и обновляйте страницу.
Сборка пишет файлы с хешами в игнорируемый `fastapi_app/static/dist` и manifest
для шаблонов. Node не нужен работающему Python-серверу после сборки.
Подробнее: [архитектура редактора](docs/editor-architecture.md).

Регрессии R1 выполняются без `xfail` и `todo`: SQLite FK/история, гонки сохранения,
DOM-инъекции, статусы ИИ-блоков и сохранение рисунков.

В HTML блоков поддерживаются встроенные PNG/JPEG/WebP (base64), не более 2 МиБ
на изображение. Проверяются MIME, сигнатура файла и размер; это не полная проверка
декодирования изображения. SVG и внешние URL изображений не принимаются при записи;
опасные атрибуты удаляются. Ошибка изображения возвращает HTTP 422 до изменения БД.

## Обновление зависимостей

`requirements.in` — прямые runtime-версии; `requirements-dev.in` добавляет
тестовые инструменты. `requirements*.txt` — сгенерированные универсальные locks
для Python 3.12, включая транзитивные версии, условия платформ и хеши.

После изменения `.in`:

```powershell
.\.venv\Scripts\python.exe scripts\lock_dependencies.py
.\.venv\Scripts\python.exe -m pip install --require-hashes -r requirements-dev.txt
.\.venv\Scripts\python.exe -m pip check
```

Генератор использует закреплённый `uv==0.11.15` из dev-зависимостей. Dev-lock
ограничен runtime-lock, чтобы общие версии совпадали. Для обновления транзитивного
пакета используйте `uv pip compile --upgrade-package <name>` с остальными флагами
из заголовка lock, затем пересоздайте dev-lock. JS-зависимости редактируются через
package.json/package-lock.json; библиотеки, иконки и шрифты собираются локально.
После обновления выполняйте `npm run build`, тесты,
`python scripts/audit_dependencies.py` (все платформенные ветви) и `npm audit`.

## Резервная копия SQLite

```powershell
.\.venv\Scripts\python.exe scripts\backup_db.py data\db\papanda.db backups\before-migration.db
```

Используется SQLite backup API: консистентный снимок, включая committed WAL,
проверка целостности и пробное восстановление в памяти. Существующий файл назначения
не перезаписывается. Для восстановления остановите приложение, восстановите снимок
в новый каталог и запустите приложение с `DATABASE_URL`, указывающим на этот файл.
Не заменяйте активную БД с открытыми соединениями и WAL. Backup содержит личные
данные и требует тех же ограничений доступа, что исходная БД.

На каждом соединении включены SQLite foreign keys. При первом открытии БД
нарушенные ссылки блокируют её использование. Для восстановления создайте копию:

```powershell
.\.venv\Scripts\python.exe scripts\repair_db_copy.py data\db\papanda.db backups\repaired.db
```

Исходная БД остаётся неизменной. В копии повреждённые версии/связи удаляются из
рабочих таблиц, несуществующая категория сбрасывается; исходные строки сохраняются
в `_integrity_quarantine`. Неизвестные связи приводят к откату ремонта. Перед
подключением копии проверьте её содержимое. Уже ошибочно привязанную к существующему
ID историю автоматически распознать нельзя — потребуется сверка с резервными копиями.

## Порядок изменений

Статус этапов: [docs/refactoring-progress.md](docs/refactoring-progress.md).
PR и push в main запускают проверки, сборку и аудит зависимостей. Выкладка
проверенного SHA включается отдельно после подготовки сервера и production
environment: [инструкция выпуска и восстановления](docs/deployment.md).
Production не переключается на новую структуру автоматически.
Авторские методологические файлы `prompts/*.md` изменяются только по отдельному
конкретному поручению. Изменения кода и исправления контрактов делаются отдельно.

## Контракты и сопровождение

- SQLite `user_version=3`; формат документа и блока `schema_version=1`.
  Миграция сохраняет общие стикеры в заметке и версиях; старый `sticker_text`
  переносится в массив. Перед изменением существующей БД создаётся снимок.
- Конкурирующие сохранения проверяют `revision`; конфликт возвращает 409.
- Общие стикеры входят в save/history, JSON примеров, Markdown и TXT.
  Публичное представление исключает личные стикеры.
- Активные провайдеры: Groq, Cerebras, Google, OpenRouter, GigaChat.
  Неиспользуемые адаптеры Hugging Face и SambaNova удалены. Режим Auto
  использует доступные настроенные провайдеры; модели задаются через Settings/.env.
  Качество и доступность реальных моделей проверяются отдельно.
- Обычные маршруты ограничены 120 запросами/минуту на IP и endpoint;
  AI-маршруты имеют собственные более строгие лимиты и сохраняемые квоты.
- `/guide`, `/pinned/active`, `/search/notes`, `/{id}/status`, `/{id}/unpin`
  под `/api/dialectics` помечены deprecated. Текущий UI их не использует;
  они сохранены для неизвестных внешних клиентов. Используйте список с
  фильтрами и PATCH документа с revision. Методика доступна в меню приложения.
- `run.py` выдаёт JSON-события без текста запросов, ответов, секретов и URL-токенов.
  `/health` сообщает версию, SHA релиза, готовность и агрегаты генерации.

Решения: [ownership](docs/adr/001-ownership.md),
[формат документа](docs/adr/002-document-format.md),
[генерация](docs/adr/003-generation.md),
[миграции и выпуск](docs/adr/004-release.md).
