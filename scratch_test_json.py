import re

filepath = 'fastapi_app/static/js/modal_controller.js'
with open(filepath, 'r', encoding='utf-8') as f:
    content = f.read()

content = re.sub(r"modal\.style\.display\s*=\s*'none';", 
                 r"modal.classList.remove('active');\n                    setTimeout(() => { modal.style.display = 'none'; }, 200);", 
                 content)

content = re.sub(r"modal\.style\.display\s*=\s*'flex';", 
                 r"modal.style.display = 'flex';\n            modal.offsetHeight;\n            modal.classList.add('active');", 
                 content)

with open(filepath, 'w', encoding='utf-8') as f:
    f.write(content)

print("Fixed modal_controller.js")
