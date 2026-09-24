# Выпуск и восстановление — R6

## Проверки и артефакт

`.github/workflows/deploy.yml` работает на PR, push main и workflow_dispatch.
Python 3.12 / Node 24 устанавливаются по lock; выполняются build, Python/JS
тесты, ESLint, проверка типов DTO/синтаксиса, browser smoke и оба dependency audit.
Chromium в изолированном CI запускается с `--no-sandbox`; внешние запросы
браузера блокируются, ИИ заменяется SSE-фикстурой. Локально sandbox сохраняется.

`build_release.py` требует чистые отслеживаемые файлы и SHA=HEAD. Архив содержит
код, prompts, runtime lock и собранный frontend. `release.json` задаёт SHA,
версию БД и SHA256 файлов; отдельный SHA256 проверяет архив до распаковки.
Путь `.cache` явно разрешён в upload-artifact. Actions закреплены commit SHA.
Для PR проверяется GitHub merge SHA; deploy работает только для push main.

## Однократная подготовка Linux-сервера

Этот этап **не выполнен автоматически**. Старую схему `/root/papanda` нужно
переносить в окно обслуживания с отдельной копией данных и прежнего unit.
Первый перенос не имеет автоматического отката к старому checkout.
Не включайте `PAPANDA_RELEASES_READY`, пока staging и начальный перенос не проверены.

Требуются Python 3.12 с venv, SQLite, systemd, sudo и место для двух релизов,
окружений, предварительной копии и окончательного backup. Node нужен только CI.

1. Создайте отдельную учётную запись `papanda` с SSH-ключом deployment.
   Каталог `/opt/papanda` и его `releases`, `incoming`, `shared`, `backups`
   должны принадлежать ей. Приложение и deploy работают **одним пользователем**;
   запуск deploy от root отклоняется, чтобы БД не меняла владельца.
2. Установите из проверенного checkout `scripts/launch_release.py` как
   `/opt/papanda/launcher.py`, `scripts/release_common.py` рядом с ним;
   `deploy/papanda.service` — в `/etc/systemd/system/papanda.service`.
   Выполните `systemctl daemon-reload`. Unit запускает один процесс на loopback:8080.
3. В sudoers разрешите только start/stop этого сервиса (путь systemctl проверьте):

   ```sudoers
   papanda ALL=(root) NOPASSWD: /usr/bin/systemctl start papanda, /usr/bin/systemctl stop papanda
   ```

4. При остановленном старом сервисе перенесите **весь** каталог data в
   `/opt/papanda/shared/data`, включая security.sqlite3, db, demo, ресурсы и CA.
   Отдельно сохраните исходный data и .env. Владелец нового data — papanda;
   права каталогов 700, приватных файлов 600. Не копируйте живой SQLite/WAL
   обычным `cp`; для работающей БД используйте SQLite backup API.
5. Настройки поместите в `/opt/papanda/shared/.env` (papanda, 600).
   Для публичного demo задайте DEMO_MODE=true, HTTPS и точные доверенные proxy
   по [R2](access-and-import-boundaries.md). Личный режим сетевого доступа не даёт.
   Пути к CA задавайте абсолютными. Launcher принудительно задаёт DATA_DIR,
   DB_DIR, DEMO_DIR и очищает DATABASE_URL: произвольная внешняя БД этим deploy
   не управляется. Не меняйте shared/.env в ходе deploy — конфигурация не версионируется.
6. Настройте GitHub environment `production`, secrets `SERVER_HOST`,
   `SERVER_USER=papanda`, `SERVER_SSH_KEY`, `SERVER_KNOWN_HOSTS`.
   Ключ хоста сверяется по доверенному каналу; workflow не использует ssh-keyscan.
   Только после первого проверенного релиза задайте repository variable
   `PAPANDA_RELEASES_READY=true`. Environment protection rules задаются в GitHub.

Первый проверенный CI-архив можно доставить в `/opt/papanda/incoming/<SHA>`
вместе с `deploy_release.py` и `release_common.py` из того же SHA. От papanda:

```sh
python3.12 /opt/papanda/incoming/<SHA>/deploy_release.py \
  --root /opt/papanda --archive /opt/papanda/incoming/<SHA>/release.tar.gz \
  --sha <40-символьный-SHA> --sha256 <SHA256-из-CI>
```

После успешной проверки администратор может включить unit при загрузке системы:
`systemctl enable papanda`. Проверяйте также HTTPS через реальный reverse proxy.

## Последовательность deploy

1. Взять deploy.lock; проверить архив, manifest и точный SHA.
2. Создать новый release/venv, установить runtime-lock с `--require-hashes`, pip check.
3. SQLite backup API копирует security.sqlite3 и все db/demo/*.db в preflight.
   На копиях мигрируются все note DB, запускается кандидат без ключей ИИ;
   проверяются /health, / и четыре входных frontend asset.
4. Остановить сервис. Закрыть ready gate, создать окончательный согласованный
   снимок всех управляемых БД. Мигрировать shared/data.
5. Атомарно записать current.json, запустить сервис, сверить /health.revision
   и HTML. Сохранить last-deployment.json, затем открыть API через ready.json.
   Пока gate закрыт, доступны только GET health, главная страница и static.

Любая ошибка установки/preflight оставляет старый процесс работающим. Ошибка
после stop восстанавливает предыдущий указатель и снимок вместе с прежним venv.
При неудаче восстановления деплой завершается ошибкой, сервис остаётся остановлен.
Старые release/venv/backups не удаляются автоматически; очистка только после
проверки retention и того, что они не нужны для восстановления.

## Ручное восстановление после уже принятого релиза

Сначала остановите пользовательские записи. Снимок до deploy не содержит
изменения, сделанные после него. Сохраните текущие данные для отдельного переноса;
не подменяйте БД работающему процессу. Код ниже возвращает **предыдущий managed
release вместе с его БД** и сохраняет текущее состояние. Выполняется от papanda
из `/opt/papanda`; до выполнения проверьте previous и backup в last-deployment.json.

```sh
cd /opt/papanda
python3.12 - <<'PY'
import json, subprocess, uuid
from pathlib import Path
from release_common import atomic_json, release_lock, snapshot, restore_snapshot
root = Path.cwd().resolve()
with release_lock(root):
    record = json.loads((root / 'last-deployment.json').read_text())
    current = json.loads((root / 'current.json').read_text())
    previous = record['previous']
    assert current == record['current'] and previous, 'No matching previous managed release'
    release = (root / previous['release']).resolve()
    backup = (root / record['backup']).resolve()
    assert release.is_relative_to(root / 'releases') and backup.is_relative_to(root / 'backups')
    assert json.loads((release / 'release.json').read_text())['revision'] == previous['revision']
    assert (release / '.venv/bin/python').is_file()
    subprocess.run(['sudo', '-n', 'systemctl', 'stop', 'papanda'], check=True)
    atomic_json(root / 'ready.json', {'revision': None})
    snapshot(root / 'shared/data', root / 'backups' / ('before-manual-restore-' + uuid.uuid4().hex))
    restore_snapshot(root / 'shared/data', backup)
    atomic_json(root / 'current.json', previous)
    subprocess.run(['sudo', '-n', 'systemctl', 'start', 'papanda'], check=True)
    # Keep API closed until the exact restored revision passes the same health check.
    import sys
    sys.path.insert(0, str(release / 'scripts'))
    from deploy_release import Deployer
    Deployer(root).health(previous['revision'])
    atomic_json(root / 'ready.json', {'revision': previous['revision']})
PY
```

При ошибке оставьте gate закрытым и разбирайте причину на копиях. Если previous
отсутствует (первый перенос), используйте отдельно сохранённый прежний unit,
checkout/venv и исходную БД. Обратное преобразование схемы автоматически не делается.

## Наблюдаемость и границы проверки

`journalctl -u papanda` содержит JSON: время, уровень, logger/event, шаблон
маршрута, HTTP status, duration; generation_finished — run_id, status, calls,
tokens_reserved. Текст исключений и провайдера не выводится. Generic server_log
не содержит свободного сообщения; диагностические события расширяйте только
явными безопасными полями. Это события для агрегирования, не Prometheus endpoint
и не измерение фактической стоимости токенов.

Проверка Windows покрывает реальный SQLite backup/restore, preflight и чистую
установку. Systemd и переключение SSH проверяются тестовым адаптером; фактический
Linux staging, HTTPS, права sudo и секреты GitHub требуют проверки на сервере
перед включением production. Платные LLM в тестах не вызываются.
