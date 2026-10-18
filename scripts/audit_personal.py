"""Audit a personal ZIP and staged changes without printing confidential values."""
import argparse
import io
import json
import marshal
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import zipfile

from dotenv import dotenv_values


TOKEN_PATTERNS = (
    re.compile(rb'\b(?:sk-|gsk_)[A-Za-z0-9_-]{24,}\b'),
    re.compile(rb'\bAIza[A-Za-z0-9_-]{30,}\b'),
    re.compile(rb'-{5}BEGIN (?:[A-Z]+ )?PRIVATE KEY-{5}'),
)
PRIVATE_NAMES = {'.env', 'settings.env', '.git', '.ssh', '.claude',
                 'backups', 'library_notes.json', 'example_notes.json'}


class Audit:
    def __init__(self, secrets, markers=()):
        self.secrets = {name: value.encode() for name, value in secrets.items() if value}
        self.markers = [value.encode() for value in markers if len(value) >= 5]
        self.findings = []
        self.checked = 0

    def blob(self, name, payload):
        self.checked += 1
        for key, value in self.secrets.items():
            if value in payload:
                self.findings.append({'member': name, 'kind': 'author_secret', 'setting': key})
        if any(pattern.search(payload) for pattern in TOKEN_PATTERNS):
            self.findings.append({'member': name, 'kind': 'credential_pattern'})
        if any(marker.lower() in payload.lower() for marker in self.markers):
            self.findings.append({'member': name, 'kind': 'author_local_path_or_login'})

    def archive_member(self, name, payload):
        parts = Path(name).parts
        if (any(part in PRIVATE_NAMES for part in parts)
                or Path(name).suffix.lower() in {'.db', '.sqlite', '.sqlite3', '.log', '.py'}):
            self.findings.append({'member': name, 'kind': 'private_or_unnecessary_member'})
        self.blob(name, payload)
        if payload.startswith(b'PK\x03\x04'):
            with zipfile.ZipFile(io.BytesIO(payload)) as nested:
                for member in nested.infolist():
                    if not member.is_dir():
                        self.blob(name + ':' + member.filename, nested.read(member))


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', type=Path)
    parser.add_argument('--staged', action='store_true')
    parser.add_argument('--tools', type=Path)
    parser.add_argument('--report', type=Path, default=Path('.cache/privacy-audit.json'))
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    values = dotenv_values(root / '.env', interpolate=False)
    secrets = {key: value for key, value in values.items()
               if value and len(value) >= 12 and any(word in key for word in ('KEY', 'TOKEN', 'PASSWORD'))}
    audit = Audit(secrets, (str(root), root.as_posix(), str(Path.home()), Path.home().name))
    if args.staged:
        names = subprocess.check_output(['git', 'diff', '--cached', '--name-only', '-z',
                                          '--diff-filter=ACMR'], cwd=root).decode('utf-8').split('\0')
        for name in filter(None, names):
            parts = Path(name).parts
            if parts[0] in {'data', 'output', 'tmp', '.cache', '.claude'} or parts[0].startswith('.pytest-'):
                audit.findings.append({'member': name, 'kind': 'local_data_staged'})
            if Path(name).name in {'.env', 'settings.env'} or Path(name).suffix in {'.db', '.sqlite', '.sqlite3', '.log'}:
                audit.findings.append({'member': name, 'kind': 'local_secret_or_database_staged'})
            audit.blob('git:' + name, subprocess.check_output(['git', 'show', ':' + name], cwd=root))
    if args.archive:
        tools = args.tools or root / '.cache/personal-build-tools'
        if tools.exists():
            sys.path.insert(0, str(tools.resolve()))
        from PyInstaller.archive.readers import CArchiveReader
        with zipfile.ZipFile(args.archive) as package, tempfile.TemporaryDirectory(dir=root / '.cache') as temp:
            for member in package.infolist():
                if member.is_dir():
                    continue
                payload = package.read(member)
                audit.archive_member(member.filename, payload)
                if member.filename.endswith('/Papanda.exe'):
                    executable = Path(temp) / 'Papanda.exe'
                    executable.write_bytes(payload)
                    reader = CArchiveReader(str(executable))
                    for name, entry in reader.toc.items():
                        if entry[-1] == 's':
                            audit.blob(member.filename + ':' + name, reader.extract(name))
                        elif entry[-1] == 'z':
                            pyz = reader.open_embedded_archive(name)
                            for module in pyz.toc:
                                code = pyz.extract(module)
                                if code is not None:
                                    audit.blob(member.filename + ':' + module, marshal.dumps(code))
    report = {'checked_payloads': audit.checked, 'findings': audit.findings,
              'public_author_contacts': 'retained by explicit user request'}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding='utf-8')
    print(json.dumps(report, ensure_ascii=False))
    return bool(audit.findings)


if __name__ == '__main__':
    raise SystemExit(main())
