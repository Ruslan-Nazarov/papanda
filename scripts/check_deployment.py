"""Check the running revision and built assets without allocating demo sessions."""
import argparse
import json
from pathlib import Path
import time
from urllib.request import urlopen


def check(url, revision, manifest):
    url = url.rstrip('/')
    with urlopen(url + '/health', timeout=3) as response:
        health = json.load(response)
    if health.get('status') != 'ok' or health.get('ready') is not True or health.get('revision') != revision:
        raise RuntimeError('Server is not ready with the expected revision')
    with urlopen(url + '/static/dist/manifest.json', timeout=3) as response:
        if json.load(response) != manifest:
            raise RuntimeError('Server frontend does not match the tested build')
    for name in ('app.js', 'runtime.js', 'notes.css', 'vendor.css'):
        path = manifest[name]
        if not path.startswith('/static/dist/') or '..' in path:
            raise ValueError('Invalid asset path in the tested manifest')
        with urlopen(url + path, timeout=3) as response:
            if response.status != 200:
                raise RuntimeError(f'Frontend asset unavailable: {name}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--sha', required=True)
    parser.add_argument('--url', default='https://papanda.kz')
    args = parser.parse_args()
    manifest = json.loads((Path(__file__).resolve().parents[1] /
                           'fastapi_app/static/dist/manifest.json').read_text())
    for attempt in range(60):
        try:
            check(args.url, args.sha, manifest)
            break
        except (OSError, ValueError, RuntimeError):
            if attempt == 59:
                raise
            time.sleep(0.5)
    print(f'Deployment completed: {args.sha}')
