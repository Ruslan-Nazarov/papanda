"""Generate Python 3.12 locks for Windows/Linux using the pinned uv tool."""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
if __name__ == "__main__":
    for source, output, constraints in (
        ("requirements.in", "requirements.txt", []),
        ("requirements-dev.in", "requirements-dev.txt", ["-c", "requirements.txt"]),
    ):
        subprocess.run(
            [sys.executable, "-m", "uv", "pip", "compile", source,
             "--universal", "--python-version", "3.12", "--generate-hashes",
             "--cache-dir", ".cache/uv", "--output-file", output, *constraints],
            cwd=ROOT, check=True,
        )
