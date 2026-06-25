import json
import os
import sys

sys.path.append(os.path.dirname(os.path.abspath(__file__)))

locales_dir = "fastapi_app/locales"

new_keys = {
    "ru": {
        "cancel": "Отмена"
    },
    "en": {
        "cancel": "Cancel"
    },
    "kk": {
        "cancel": "Болдырмау"
    }
}

for lang, keys in new_keys.items():
    file_path = os.path.join(locales_dir, f"{lang}.json")
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
    
    if "dialectics" not in data:
        data["dialectics"] = {}
        
    for k, v in keys.items():
        data["dialectics"][k] = v
        
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=4)
        
print("Updated locales!")
