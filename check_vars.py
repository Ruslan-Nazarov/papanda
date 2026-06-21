import os
import re

valid_vars = set([
    '--color-primary', '--color-primary-dark', '--color-primary-soft', '--color-primary-glow',
    '--color-bg-app', '--color-bg-white', '--color-bg-subtle',
    '--color-text-dark', '--color-text-body', '--color-text-muted', '--color-text-faint',
    '--color-border-light', '--color-border-medium',
    '--color-success', '--color-error', '--color-warning'
])

search_dir = r"d:\Библиотека\Исследования\Искусственный интеллект\papanda\papanda v 0.6.3 experiment\fastapi_app"

var_pattern = re.compile(r'var\((--color-[a-zA-Z0-9-]+)\)')

found_invalid = False
for root, dirs, files in os.walk(search_dir):
    for file in files:
        if file.endswith('.html') or file.endswith('.js') or file.endswith('.css'):
            filepath = os.path.join(root, file)
            try:
                with open(filepath, 'r', encoding='utf-8') as f:
                    for i, line in enumerate(f):
                        matches = var_pattern.findall(line)
                        for match in matches:
                            if match not in valid_vars:
                                print(f"Invalid var {match} in {filepath}:{i+1}")
                                found_invalid = True
            except Exception as e:
                pass

if not found_invalid:
    print("No invalid variables found.")
