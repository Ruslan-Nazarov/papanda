# Papanda / Conspect

Редактор конспектов: ручной режим по умолчанию, дополнительная ИИ-генерация,
история, формулы, категории и публичные ссылки. Backend: FastAPI + SQLAlchemy +
SQLite; frontend: браузерные ES-модули и TipTap.

## Локальный запуск

Нужны **Python 3.12** и, для frontend-тестов, **Node.js >=22.12**.
Команды выполняются из корня этого репозитория.

### Windows / PowerShell

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\python.exe -m pip install --require-hashes -r requirements-dev.txt
# Если .env ещё нет: Copy-Item .env.example .env
.\.venv\Scripts\python.exe run.py
```

Если Python отсутствует в `py`, вместо него укажите путь к установленному
Python 3.12. Существующий `.env` сохраняйте. `run.bat` использует `.venv`.

### Linux

```sh
python3.12 -m venv .venv
.venv/bin/python -m pip install --require-hashes -r requirements-dev.txt
# Если .env ещё нет: cp .env.example .env
.venv/bin/python run.py
```

Адрес: http://127.0.0.1:8080. `HOST`, `PORT`, `UVICORN_RELOAD` управляют запуском.
В production устанавливайте `requirements.txt` вместо `requirements-dev.txt`;
reload выключайте. Число workers пока оставляйте 1: квоты хранятся в памяти процесса.
Для ручного редактора API-ключи не нужны. Для ИИ настройте используемый провайдер
в `.env`; доступность модели зависит от провайдера и аккаунта.

## Данные и режимы

- `DEMO_MODE=false`: личная общая БД `data/db/papanda.db`, без встроенной авторизации.
  Локальный запуск по умолчанию слушает только loopback.
- `DEMO_MODE=true`: отдельная БД на cookie-сессию в `data/demo/`; это текущая
  анонимная demo-модель, не полноценная авторизация. Sharing между сессиями
  требует исправления F10 из аудита.
- `DATABASE_URL` переопределяет личную БД. На данном этапе проверяется SQLite.
  Для нестандартных путей задавайте `DB_DIR` и `DEMO_DIR` явно: изменение только
  `DATA_DIR` не пересчитывает остальные значения Settings.

Публичное размещение требует оставшихся исправлений доступа, импорта и TLS из плана.
R1 закрывает найденные DOM-инъекции и дефекты сохранения; полный статус этапов —
в `docs/refactoring-progress.md`.

## Проверки

```powershell
.\.venv\Scripts\python.exe -m pytest -q -p no:cacheprovider
.\.venv\Scripts\python.exe -m coverage run -m pytest -q -p no:cacheprovider
.\.venv\Scripts\python.exe -m coverage report
npm ci
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
проверяют DOM в изолированном Chromium без обращения к пользовательскому серверу.
Это ещё не полный E2E интерфейса с CDN.

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

Генератор использует закреплённый `uv==0.10.12` из dev-зависимостей. Dev-lock
ограничен runtime-lock, чтобы общие версии совпадали. Для обновления транзитивного
пакета используйте `uv pip compile --upgrade-package <name>` с остальными флагами
из заголовка lock, затем пересоздайте dev-lock. JS-зависимости редактируются через
package.json/package-lock.json. CDN-библиотеки пока остаются в HTML/importmap;
их перенос в сборку — R5. R0 сохраняет прямые версии; обновления безопасности — R2.

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
Push в main запускает production deploy; подготовка ведётся в отдельной ветке.
Авторские методологические файлы `prompts/*.md` изменяются только по отдельному
конкретному поручению. Изменения кода и исправления контрактов делаются отдельно.
