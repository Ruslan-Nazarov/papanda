"""Explicit resource allowlist: no .env, author notes, DBs, backups or Git metadata."""
from pathlib import Path
import json
from PyInstaller.utils.hooks import collect_all, collect_submodules, copy_metadata

root = Path(SPECPATH).parent
dist_files = set(json.loads((root / '.cache/frontend-outputs.json').read_text()))
dist_files.add('fastapi_app/static/dist/manifest.json')
dist_files |= {name + '.LEGAL.txt' for name in tuple(dist_files)}
datas = [(str(root / 'CHANGELOG.md'), '.'),
         (str(root / 'fastapi_app/i18n_data.json'), 'fastapi_app')]
for folder in ('fastapi_app/templates', 'fastapi_app/static', 'prompts'):
    for file in (root / folder).rglob('*'):
        relative = file.relative_to(root).as_posix()
        if relative.startswith('fastapi_app/templates/legal/') or relative in {
                'fastapi_app/templates/legal.html', 'fastapi_app/static/js/consent.js'}:
            continue
        if relative.startswith('fastapi_app/static/dist/') and relative not in dist_files:
            continue
        if file.is_file() and file.suffix.lower() in {
                '.html', '.css', '.js', '.json', '.md', '.woff', '.woff2', '.ttf',
                '.eot', '.svg', '.ico', '.png', '.jpg', '.webp', '.txt'}:
            datas.append((str(file), file.parent.relative_to(root).as_posix()))
engine_data, engine_binaries, engine_imports = collect_all('dialectic_world', include_py_files=False)
datas += engine_data
for package in ('uvicorn', 'fastapi', 'pydantic', 'pydantic-settings', 'sqlalchemy'):
    datas += copy_metadata(package)
a = Analysis([str(root / 'run_personal.py')], pathex=[str(root)],
    binaries=engine_binaries, datas=datas,
    hiddenimports=['.'.join(p.relative_to(root).with_suffix('').parts)
                   for p in (root / 'fastapi_app').rglob('*.py')
                   if p.name != '__init__.py'] + engine_imports + [
        'uvicorn.logging', 'uvicorn.loops.asyncio', 'uvicorn.protocols.http.h11_impl',
        'uvicorn.protocols.websockets.websockets_impl', 'uvicorn.lifespan.on',
        'sqlalchemy.dialects.sqlite.aiosqlite', 'aiosqlite', 'tkinter',
    ], excludes=['pytest', 'pip', 'uv', 'IPython', 'matplotlib', 'pandas', 'numpy'])
pyz = PYZ(a.pure)
exe = EXE(pyz, a.scripts, [], exclude_binaries=True, name='Papanda',
          icon=str(root / 'fastapi_app/static/logo.ico'), console=False)
coll = COLLECT(exe, a.binaries, a.datas, strip=False, upx=False, name='Papanda-Personal')
