"""Start a candidate against isolated copies, check its SHA and local assets."""
import argparse
import json
import os
from pathlib import Path
import socket
import subprocess
import sys
import time
from urllib.request import urlopen


def check(url, expected):
    with urlopen(url + '/health', timeout=2) as response:
        health = json.load(response)
    if health.get('status') != 'ok' or health.get('revision') != expected:
        raise RuntimeError('Health revision mismatch')
    with urlopen(url + '/', timeout=3) as response:
        html = response.read().decode()
    if '/static/dist/app-' not in html:
        raise RuntimeError('Frontend missing from candidate')


def smoke(sha):
    root = Path(__file__).resolve().parents[1]
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        port = sock.getsockname()[1]
    env = {**os.environ, 'DEMO_MODE': 'false', 'SECRET_KEY': 'release-smoke-only',
           'PORT': str(port), 'HOST': '127.0.0.1', 'UVICORN_RELOAD': '0', 'WEB_CONCURRENCY': '1'}
    for key in ('GROQ_API_KEY', 'GOOGLE_API_KEY', 'OPENROUTER_API_KEY', 'CEREBRAS_API_KEY', 'GIGACHAT_AUTH_KEY'):
        env[key] = ''
    process = subprocess.Popen([sys.executable, 'run.py'], cwd=root, env=env,
                               stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                               **({'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}))
    try:
        for _ in range(150):
            if process.poll() is not None:
                raise RuntimeError('Candidate startup failed')
            try:
                check(f'http://127.0.0.1:{port}', sha)
                break
            except OSError:
                time.sleep(0.1)
        else:
            raise RuntimeError('Candidate startup timeout')
        manifest = json.loads((root / 'fastapi_app/static/dist/manifest.json').read_text())
        for asset in ('app.js', 'runtime.js', 'notes.css', 'vendor.css'):
            with urlopen(f'http://127.0.0.1:{port}' + manifest[asset], timeout=3) as response:
                if response.status != 200:
                    raise RuntimeError('Candidate asset unavailable')
    finally:
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
            process.wait()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sha', required=True)
    args = parser.parse_args()
    smoke(args.sha)
