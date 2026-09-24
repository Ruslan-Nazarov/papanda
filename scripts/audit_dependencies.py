"""Audit every locked version, including dependencies for other platforms."""
import argparse
from pathlib import Path
import re
import subprocess
import sys
import tempfile

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', default='.cache/dependency-audit.json')
    args = parser.parse_args()
    root = Path(__file__).resolve().parents[1]
    pins = set()
    for filename in ('requirements.txt', 'requirements-dev.txt'):
        pins.update(re.findall(r'^([A-Za-z0-9_.-]+==[^\s;\\]+)', (root / filename).read_text(), re.M))
    (root / '.cache').mkdir(exist_ok=True)
    with tempfile.TemporaryDirectory(dir=root / '.cache') as tmp:
        all_platforms = Path(tmp) / 'all-platforms.txt'
        all_platforms.write_text('\n'.join(sorted(pins)) + '\n')
        result = subprocess.run([sys.executable, '-m', 'pip_audit', '-r', str(all_platforms),
                                 '--disable-pip', '--no-deps', '--progress-spinner', 'off',
                                 '--cache-dir', str(root / '.cache/r2-audit'),
                                 '-f', 'json', '-o', args.output], cwd=root)
        raise SystemExit(result.returncode)
