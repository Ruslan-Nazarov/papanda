"""Exercise the frozen personal app with disposable data and no real AI requests."""
import argparse
import io
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request


def request(url, path, data=None, method=None, form=False):
    headers = {}
    payload = None
    if data is not None:
        payload = (urllib.parse.urlencode(data) if form else json.dumps(data)).encode()
        headers['Content-Type'] = 'application/x-www-form-urlencoded' if form else 'application/json'
    req = urllib.request.Request(url + path, data=payload, headers=headers, method=method)
    try:
        with urllib.request.urlopen(req, timeout=10) as response:
            return response.status, response.read().decode('utf-8')
    except urllib.error.HTTPError as error:
        return error.code, error.read().decode('utf-8')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('executable', type=Path)
    args = parser.parse_args()
    executable = args.executable.resolve()
    command = [str(executable)]
    if executable.suffix == '.py':
        command.insert(0, sys.executable)
    sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
    from personal_runtime import AI_KEYS
    from pypdf import PdfWriter
    with tempfile.TemporaryDirectory(prefix='papanda-personal-smoke-') as temp:
        directory = Path(temp)
        env = dict(os.environ, **{name: 'inherited-author-key-must-not-be-used' for name in AI_KEYS})
        env.update(LIBRARY_PUBLISH_KEY='inherited-publication-key-must-not-be-used',
                   LIBRARY_PUBLISH_URL='https://papanda.kz', GIGACHAT_VERIFY_SSL='false')
        def start():
            log = (directory / 'process.log').open('a', encoding='utf-8')
            process = subprocess.Popen(command + ['--headless', '--data-dir', str(directory), '--port', '0'],
                env=env, stdout=log, stderr=log,
                **({'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}))
            for _ in range(200):
                if process.poll() is not None:
                    log.close()
                    raise RuntimeError('App exited: ' + (directory / 'process.log').read_text()[-3000:]
                                       + (directory / 'personal.log').read_text()[-3000:])
                record = directory / 'instance.json'
                if record.exists():
                    url = json.loads(record.read_text())['url']
                    try:
                        if request(url, '/health')[0] == 200:
                            return process, log, url
                    except (OSError, urllib.error.URLError):
                        pass
                time.sleep(.15)
            process.terminate()
            process.wait(timeout=15)
            log.close()
            raise RuntimeError('App did not become ready')

        def stop(process, log):
            process.terminate()
            process.wait(timeout=15)
            log.close()
        process, log, url = start()
        try:
            status, page = request(url, '/')
            assert status == 200 and '/personal/settings' in page
            assert 'btn-library-publish' not in page and 'menu-item-share' not in page
            assert json.loads(request(url, '/api/dialectics')[1]) == []
            for path in ['/library', '/api/author/deployment/1', '/api/library']:
                assert request(url, path)[0] == 404
            status, body = request(url, '/api/dialectics/save', {
                'title': 'Personal smoke note', 'blocks': [
                    {'id': 'personal-smoke', 'side': 'left', 'html': '<p>Persistent text</p>'}]})
            assert status == 200, body
            note = json.loads(body)
            assert request(url, '/personal/settings', {'provider': 'openai',
                'api_key': 'own-test-key-no-network', 'model': 'gpt-5-mini'}, form=True)[0] == 200
            settings_html = request(url, '/personal/settings')[1]
            assert 'own-test-key-no-network' not in settings_html
            assert 'inherited-author-key-must-not-be-used' not in (directory / 'settings.env').read_text()
        finally:
            stop(process, log)
        # Survives a complete process restart, including reloading the user's settings.
        process, log, url = start()
        try:
            restored = json.loads(request(url, f'/api/dialectics/{note["id"]}')[1])
            assert restored['title'] == 'Personal smoke note'
            assert restored['content_json'][0]['html'] == '<p>Persistent text</p>'
            assert request(url, '/personal/settings')[0] == 200
        finally:
            stop(process, log)
        print('PASS: app startup, empty personal database, publication disabled, own-key settings, save and restart')
        if executable.suffix != '.py':
            writer = PdfWriter()
            writer.add_blank_page(width=100, height=100)
            pdf = io.BytesIO()
            writer.write(pdf)
            worker = subprocess.run([str(executable), '--pdf-worker', '50', str(512 * 1024 * 1024),
                str(8 * 1024 * 1024)], input=pdf.getvalue(), capture_output=True, timeout=20,
                **({'creationflags': subprocess.CREATE_NO_WINDOW} if os.name == 'nt' else {}))
            assert worker.returncode == 0, f'Frozen PDF worker failed: {worker.returncode}'
            print('PASS: isolated PDF worker in the standalone executable')


if __name__ == '__main__':
    main()
