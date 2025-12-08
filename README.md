**[🇷🇺 Читать на русском](README.ru.md)** | [🇬🇧 English Version](README.md)
<div align="center">
  <img src="app/static/logo.ico" alt="Papanda Logo" width="120" height="120">
  <h1>Papanda v0.5</h1>
  
  <p>
    <b>Personal Resource Planning (PRP) System</b>
  </p>

  <p>
    <a href="https://www.python.org/">
      <img src="https://img.shields.io/badge/Python-3.12-blue.svg" alt="Python 3.12">
    </a>
    <a href="https://flask.palletsprojects.com/">
      <img src="https://img.shields.io/badge/Backend-Flask-green.svg" alt="Flask">
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/Database-SQLite-lightgrey.svg" alt="SQLite">
    </a>
    <a href="#">
      <img src="https://img.shields.io/badge/License-MIT-orange.svg" alt="License">
    </a>
  </p>
  
  <p>
    <i>Time and thought organization. Efficiency tracking. Language learning.</i>
  </p>
</div>

---

## 📖 About the Project

**Papanda** is a personal resource management system combining planning, learning, and reflection in a single interface.

Unlike popular alternatives (Notion, Todoist), the project follows the philosophy of **local data storage**. All information is stored in a local `SQLite` database, ensuring complete privacy and data durability.

## Key Features
* **Event Matrix:** A unified timeline for the past (Chronology) and the future (Events).
* **Monolithic Architecture:** Calendar, tasks, habit training, and dictionary are connected into a single ecosystem.
* **Stochastic Learning:** An interval repetition algorithm with probabilistic sampling for language learning.

---

## 📐 Interface Architecture (3 Levels)

The application is built on the principle of a three-level information hierarchy.

### 1. Top Level
Future planning and focus retention zone.
* **Events:** Event calendar. Important events are highlighted 7 days in advance.
* **One Thing:** A method for concentrating on one main goal of the period. "One thing" is the choice of a single activity that is most important to you in the immediate long term. You need to focus on this activity. "Replacement" is an activity to replace the "One thing" when you get tired of one task, for variety.
* **Wink:** A mechanism for "soft" habit formation through subconscious reminders. A Wink appears in the top right corner. If you have entered multiple Winks, they will change (the change speed is set in the settings).
* **Counters:** Day counters "Until" an event and "After" an event. Here you can set a counter until an important event in the future or after an important event in the past.

### 2. Middle Level
The main working zone of the day.
* **Chronology & Notes:** Left column. Reflection on the past. Chronology records facts, Notes record thoughts.
* **Tasks & Habits:** Central column. Lists of current to-dos and habit tracker (Streaks).
* **Linguistics:** Right column. Language learning block with calculation of **Coverage** (dictionary coverage) and **iMW** (intensity) metrics. Includes a pronunciation rule switch (RU/EN).

### 3. Bottom Level
Data management.
* Direct access to database tables (CRUD).

### Access to Settings and Databases
At this level, there are links to settings and databases for editing. On the database pages, it is possible to both edit a record and delete it.

On the Settings page, you see a 3-month calendar grouped by month. The latest database entries are also displayed here. In the settings, you can set the time for Wink and the word change frequency. Additionally, you can upload old databases, clear the database, and edit note categories.

---

## 🛠 Installation and Launch

The project does not require complex configuration. Python is sufficient.

### 1. Cloning
```bash
git clone [https://github.com/Ruslan-Nazarov/papanda.git](https://github.com/Ruslan-Nazarov/papanda.git)
cd papanda
