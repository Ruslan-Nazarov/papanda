#!/usr/bin/env bash
# Update the existing checkout, virtualenv and systemd service in place.
set -euo pipefail
trap 'echo "Deployment failed at line $LINENO; see the preceding command output." >&2' ERR

revision=${1:?Expected Git revision}
archive=${2:?Expected release archive}
checksum=${3:?Expected archive checksum}
app_dir=${PAPANDA_APP_DIR:-/root/papanda}
# Check the public site through the existing nginx proxy.
health_url=${PAPANDA_HEALTH_URL:-https://papanda.kz}
[[ "$revision" =~ ^[a-f0-9]{40}$ ]]
[[ "$checksum" =~ ^[a-f0-9]{64}$ ]]
cd "$app_dir"
test -d .git
test -x venv/bin/python
mkdir -p .cache
exec 9>.cache/deploy.lock
flock -n 9
printf '%s  %s\n' "$checksum" "$archive" | sha256sum --check --status
if [[ "$(systemctl show papanda --property=WorkingDirectory --value)" != "$app_dir" ]]; then
    echo "papanda.service must use WorkingDirectory=$app_dir before deploying." >&2
    exit 1
fi
# Refuse to discard server-side edits to tracked files.
git diff --quiet HEAD --
git fetch origin main
git merge-base --is-ancestor "$revision" origin/main
git rev-parse HEAD > .last_deploy_rev
git reset --hard "$revision"

# The current frontend is built in CI and is intentionally absent from Git.
# Keep old hashed assets so already-open pages can finish loading them.
tar -xzf "$archive" fastapi_app/static/dist release.json
venv/bin/python -m pip install --require-hashes -r requirements.txt
venv/bin/python -m pip check
systemctl restart papanda
systemctl is-active --quiet papanda
venv/bin/python scripts/check_deployment.py --sha "$revision" --url "$health_url"
