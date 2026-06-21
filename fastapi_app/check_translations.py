import os
import json
import re

ru_json_path = 'locales/ru.json'
with open(ru_json_path, 'r', encoding='utf-8') as f:
    translations = json.load(f)

def get_keys(d, prefix=''):
    keys = []
    for k, v in d.items():
        if isinstance(v, dict):
            keys.extend(get_keys(v, prefix + k + '.'))
        else:
            keys.append(prefix + k)
    return keys

existing_keys = set(get_keys(translations))

found_keys = set()
pattern = re.compile(r"_\(['\"](.*?)['\"]\)")
for root, dirs, files in os.walk('templates'):
    for file in files:
        if file.endswith('.html'):
            with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                content = f.read()
                matches = pattern.findall(content)
                found_keys.update(matches)

for root, dirs, files in os.walk('static/js'):
    for file in files:
        if file.endswith('.js'):
            with open(os.path.join(root, file), 'r', encoding='utf-8') as f:
                content = f.read()
                matches = pattern.findall(content)
                found_keys.update(matches)

missing_keys = found_keys - existing_keys
print('Total keys found in HTML and JS:', len(found_keys))
print('Total missing keys in ru.json:', len(missing_keys))
for k in sorted(missing_keys):
    print(f'- {k}')
