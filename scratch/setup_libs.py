import urllib.request
import os
import re

libs_dir = 'fastapi_app/static/js/libs'
pm_dir = os.path.join(libs_dir, '@tiptap/pm')
os.makedirs(pm_dir, exist_ok=True)

# Прямые ссылки на бандлы
files = {
    'tiptap-core.js': 'https://esm.sh/@tiptap/core@3.22.4/es2022/core.bundle.mjs',
    'tiptap-starter-kit.js': 'https://esm.sh/@tiptap/starter-kit@3.22.4/es2022/starter-kit.bundle.mjs',
    '@tiptap/pm/commands.js': 'https://esm.sh/@tiptap/pm@3.22.4/es2022/commands.mjs',
    '@tiptap/pm/keymap.js': 'https://esm.sh/@tiptap/pm@3.22.4/es2022/keymap.mjs',
    '@tiptap/pm/model.js': 'https://esm.sh/@tiptap/pm@3.22.4/es2022/model.mjs',
    '@tiptap/pm/schema-list.js': 'https://esm.sh/@tiptap/pm@3.22.4/es2022/schema-list.mjs',
    '@tiptap/pm/state.js': 'https://esm.sh/@tiptap/pm@3.22.4/es2022/state.mjs',
    '@tiptap/pm/transform.js': 'https://esm.sh/@tiptap/pm@3.22.4/es2022/transform.mjs',
    '@tiptap/pm/view.js': 'https://esm.sh/@tiptap/pm@3.22.4/es2022/view.mjs',
    'mathlive.js': 'https://esm.sh/mathlive?bundle',
    'function-plot.js': 'https://esm.sh/function-plot?bundle',
    'fabric.js': 'https://esm.sh/fabric?bundle'
}

def patch(content):
    # Перенаправляем все импорты @tiptap/pm на локальную папку
    # Ищем паттерн "/@tiptap/pm@.../.../NAME.mjs"
    content = re.sub(r'\"/@tiptap/pm@[^/]+/es2022/([^.]+)\.mjs\"', r'"/static/js/libs/@tiptap/pm/\1.js"', content)
    # Также проверяем одинарные кавычки
    content = re.sub(r"\'/@tiptap/pm@[^/]+/es2022/([^.]+)\.mjs\'", r"'/static/js/libs/@tiptap/pm/\1.js'", content)
    # Исправляем импорты @tiptap/core
    content = re.sub(r'\"/@tiptap/core@[^/]+/es2022/core\.bundle\.mjs\"', r'"/static/js/libs/tiptap-core.js"', content)
    return content

for name, url in files.items():
    path = os.path.join(libs_dir, name)
    print(f'Downloading {name}...')
    try:
        req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
        with urllib.request.urlopen(req) as response:
            content = response.read().decode('utf-8')
            with open(path, 'w', encoding='utf-8') as f:
                f.write(patch(content))
        print(f'Saved {name}')
    except Exception as e:
        print(f'Error {name}: {e}')
