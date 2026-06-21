# papanda v.0.6.2

![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat-square&logo=fastapi&logoColor=white)
![SQLite](https://img.shields.io/badge/SQLite-aiosqlite-003B57?style=flat-square&logo=sqlite&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Platform](https://img.shields.io/badge/Platform-Windows-0078D4?style=flat-square&logo=windows&logoColor=white)

*From AI - knowledge, from human - understanding.*  
*Train not only AI, but also humans.*

[Русская версия здесь (Russian version here)](README_RU.md)

**papanda** is a dialectics-based educational environment designed for learning and research in the era of artificial intelligence.

Traditional educational approaches focused on memorization and fact accumulation have lost their meaning, as AI now performs these functions. However, generative models only provide answers; they are fundamentally incapable of comprehension or building a holistic worldview.

papanda resolves this contradiction. The application handles the routine of data collection and provides a methodology for developing your own deep understanding. Instead of passive information consumption, the platform teaches you to discover relationships between concepts exclusively through their development.

It is a comprehensive environment where time management, language acquisition, exact sciences, and note-taking are linked to the methodology of developing a dialectical understanding of the subject.

## Key Features

### 🌀 Dialectics (Core System)
The main module of the application, implementing note-taking based on the rules of dialectical logic. Notes are structured not as a static list of facts, but as the evolution of a thought:
* **Analysis:** For any concept, event, or formula, a primary element and its contradiction (opposite) are defined.
* **Contradiction:** The collision of these opposite elements is analyzed.
* **Resolution:** The contradiction is resolved, which becomes a new concept or formula, but now integrated into your deep understanding.

The module is enhanced by two specialized tools:
* **AI Search for Opposites:** An algorithm that automatically detects opposing concepts in text for you to evaluate.
* **Math Parser:** Simplifies complex formulas step-by-step, showing the logic of their dialectical development.
* Detailed guide: [Dialectics Guide (Russian)](DIALECTICS_GUIDE.md).

### 📚 Linguistics and Language Learning
Language acquisition in papanda is focused on developing a dialectical understanding of speech structure, rather than mechanical memorization:
* **Sentence Trainer:** Learn language through sentence structure. See how a sentence develops and unfolds from its logical core—the predicate (verb).
* **Words in Context:** When working with the vocabulary, the focus shifts to independent construction of meaning. Instead of just memorizing translations, you immediately place new words into your own context.
* **Recognitio (Assessment):** A specialized mode for checking long-term memory, letting you objectively evaluate vocabulary retention.

### 📅 Dialectical Time Management and Self-Analysis
Managing time in papanda is a way to apply dialectics to the development of your own life:
* **Focus on the Core (One Thing):** Instead of a chaotic checklist, you define a single fundamental task ("The Main Thing") from which subordinate sub-tasks branch out. This focuses your resources on the main contradiction of the current stage.
* **Chronology and Task Evolution:** The calendar and scheduling are linked to Chronology. It serves as a tool for retrospective self-analysis, demonstrating how your projects and tasks evolved over time.
* **Cross-cutting Stickers (Sticky Thoughts):** Available across most application modules. Stickers allow you to pin quick thoughts to tasks, events, or notes, serving as a reflection space for your projects.

## 🚀 Installation and Startup

### Option 1: Compiled Executable (.exe)

Download `papanda.exe` from the [Releases](https://github.com/your-username/papanda/releases) section, run it, and the browser will open automatically.

> ⚠️ Windows may show an "Unknown Publisher" warning. Click **"More Info" → "Run Anyway"**.

All data (database, settings, dictionaries) will be automatically created and stored in the `data/` folder next to the `.exe` file.

To **stop the server**, simply close the browser tab—the server process will automatically terminate.

---

### Option 2: Running from Source Code (for Developers)

**Requirements:**
- Python 3.12+

**Steps:**

```bash
# 1. Clone the repository
git clone https://github.com/your-username/papanda.git
cd papanda

# 2. Install dependencies
pip install -r requirements.txt

# 3. Run the application
python run_fastapi.py
```

The application will automatically open in your browser at `http://127.0.0.1:8000`.  
On the first run, the database is created automatically and populated with the default vocabulary from the built-in `translate.xlsx` file.

---

### Building the .exe Yourself

```bash
pip install pyinstaller
```

Run the `create_bundle.bat` file in the project root. The compiled `papanda.exe` will appear in the `dist/` folder, containing all templates, static assets, and the default vocabulary.

## 🛠️ Technology Stack

papanda is a fully-featured web application that runs locally on your computer. No external servers or cloud services are used—your data remains entirely yours.

### Backend

| Component | Library | Role |
|---|---|---|
| **Web Framework** | [FastAPI](https://fastapi.tiangolo.com/) | High-performance asynchronous Python framework. |
| **ASGI Server** | [Uvicorn](https://www.uvicorn.org/) | Asynchronous web server for FastAPI. |
| **Template Engine** | [Jinja2](https://jinja.palletsprojects.com/) | HTML template rendering. |
| **ORM** | [SQLAlchemy](https://www.sqlalchemy.org/) (async) | Database models and asynchronous queries. |
| **Database** | [SQLite](https://www.sqlite.org/) + [aiosqlite](https://github.com/omnilib/aiosqlite) | Embedded file-based database. |
| **Configuration** | [pydantic-settings](https://docs.pydantic.dev/latest/concepts/pydantic_settings/) + [python-dotenv](https://github.com/theskumar/python-dotenv) | Typed settings loaded from a `.env` file. |
| **Excel** | [openpyxl](https://openpyxl.readthedocs.io/) | Exporting and importing vocabulary from `.xlsx` files. |

### Frontend

- **HTML + Jinja2 Templates** — Server-side page rendering with modular structures using `partials/`.
- **Vanilla CSS** — Custom design system with CSS variables, animations, and glassmorphism.
- **Vanilla JavaScript** — Widget interactivity, API fetch requests, drag-and-drop, WebSocket clients, and dynamic DOM updates.

### Packaging and Distribution

- **[PyInstaller](https://pyinstaller.org/)** — Bundles the entire application into a single `.exe` file that runs without a Python installation.

---

## 📄 License

[Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](LICENSE) © Ruslan Nazarov
