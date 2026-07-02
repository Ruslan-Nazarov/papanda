# 📚 Smart Notes Interface & Features Reference Handbook (Papanda)

A comprehensive guide to all tools, display modes, graphical editors, and intelligent assistants (AI) in the dialectical analysis note system.

---

## 🧭 Top Toolbar (Main Navigation)

### 1. Category Selector
Dropdown in the top-left corner allowing you to link the current note to a specific project, subject, or research domain. New categories can be created via the relations window or on the main dashboard.

### 2. Note Title
Input field for the document title. All changes to the title and content are saved automatically.

### 3. Display Modes (`🎛️ Mode`)
Dropdown menu to customize visual canvas presentation:
* **Dialectical Note**: Toggles the visual structure of logical connections and dividers.
* **Two-Column View**: Switches between the classic dual-column layout (left column — facts/theses, right column — development/antitheses) and a linear single-column view.
* **Keep Titles Only**: Hides block content, displaying only titles for a quick overview of document structure (outline mode).

### 4. Parsers (`☰ Parsers`)
Quick launch menu for specialized AI structural analysis tools:
* **🧮 Formula Parser**: Automatic dialectical breakdown of mathematical expressions.
* **📄 Article Parser**: Structuring and extracting logical development of ideas from text articles.

### 5. Navigation & Relations
* **🏠 Dashboard**: Navigate to the main application hub featuring notes overview, habits tracking, goals, and language learning modules.
* **🔗 Relations**: Interactive semantic graph visualizer connecting different notes and concepts.
* **📋 Table of Contents**: Opens a side panel with an automatically generated table of contents (based on block titles) for instant jumping to any section.

### 6. Menu (`⋮ Menu`)
* **📄 New**: Clear the canvas and create a fresh note from scratch.
* **📂 Open**: List saved documents with interactive search.
* **↩️ Previous**: Quickly jump back to the previously opened note.
* **💾 Save**: Manually trigger immediate persistence of the current state.
* **🗑️ Delete**: Remove the currently open note.

---

## 📌 Working with Blocks & the Canvas

Dialectical notes are built from interconnected blocks arranged across a two-sided canvas:
* **Left Column (Facts & Theses)**: Captures base concepts, factual statements, and synthesis results from resolved contradictions.
* **Right Column (Development & Opposites)**: Analyzes how facts unfold, searching for contradictions and opposing forces.
* **Center Blocks (Leap / Synthesis)**: Transitional leap blocks marking qualitative transformation during contradiction resolution.

### Block Controls
Every block features its own dedicated control bar:
* **Title & Color**: Assign custom block titles and select color presets for visual categorization.
* **🔗 Sources**: Attach external web links, quotes, books, and articles that served as the foundation for the thesis.
* **📖 Block Dictionary**: Maintain a localized glossary of terms with definitions and cross-connections with other concepts.
* **🏷️ Stickers (Margin Notes)**: Capture instant thoughts, questions, and hooks. Stickers act as guides guiding you through deeper layers of material comprehension.

---

## 🎨 Graphical Editors & Vector Shapes

The multi-tab editor (accessible by clicking any block) supports three modes:
1. **Text**: Full-featured rich text editor with KaTeX mathematical formula formatting.
2. **Graphs**: Plot 2D mathematical function curves directly from algebraic formulas and insert the generated graph straight into your text.
3. **Shapes**: Full-fledged vector graphics drawing canvas:
   * **Drawing Tools**: Selection tool, freehand drawing, rectangle, circle, triangles, diamond, lines, arrows, and text labels.
   * **Object Styling**: Customize stroke color, fill color, transparent fills, and toggle visual alignment grid.
   * **Layer Management**: Group/ungroup objects (🔒), duplicate elements, undo actions, clear canvas, and access the objects list panel (⊞) for precise layer management.

---

## 🤖 Dedicated AI Section: Prompt Logic & Architecture

Papanda employs methodologically rigorous system prompts that elevate language models from basic chat assistants into rigorous scientific methodology partners.

### 1. ✨ AI Opposites Search (`противоположности_промпт.md`)
* **What it means**: Finding an opposite is not merely appending the word "not". A dialectical opposite is an independent process or active force coexisting with the initial thesis while standing in a relation of mutual exclusion and tension.
* **How the prompt works**: The model receives the selected thesis and inspects its underlying mechanics. The prompt strictly forbids trivial formal-logic negations (e.g., "white vs. not white"). Instead, the AI generates real-world antagonistic processes or conflicting dynamics.
* **Human Role**: AI performs the heavy lifting of surfacing candidate opposites. Verifying contradiction validity and synthesizing the leap is strictly reserved for human intellect.

### 2. ❓ Contextual Concept Explanation (`контекстный_промпт.md`)
* **What it means**: The "What is this?" button explains highlighted words within the exact context of your ongoing note rather than offering isolated dictionary definitions.
* **How the prompt works**: The full text of your current note and the highlighted term are passed to the model. The prompt instructs the AI to articulate how the concept connects to your specific domain and what function it performs within the overall system under analysis.

### 3. 🧮 Math Formula Parser (`формулы_промпт.md`)
* **What it means**: Mathematical formulas are frequently presented as static dogma. The formula parser uncovers the historical development of mathematical thought, explaining why a specific formula became necessary.
* **How the prompt works**: The AI decomposes any mathematical expression into a triad:
  1. **Initial Thesis / Notation**: A simple operation or elementary mathematical concept.
  2. **Notation Crisis**: A scenario of growing complexity where old notation leads to clumsiness, limitations, or internal contradiction.
  3. **Qualitative Leap (Resolution)**: The emergence of new notation or formula as an elegant resolution to the crisis.

### 4. 📄 Article Parser (`статьи_промпт.md`)
* **What it means**: A dedicated pipeline for distilling dense scientific papers, articles, or lecture notes into a structured dialectical outline.
* **How the prompt works**: The algorithm strips away fluff and extracts the core: the author's starting facts, the clash of opposing perspectives (conflict of ideas), and the resulting synthesis. The output is structured for immediate import onto your canvas.

### 5. 🎙️ AI Voice & Text to LaTeX Formatting
* **How the prompt works**: Allows you to dictate formulas by voice or type colloquial descriptions (e.g., "integral from zero to infinity of x squared over two"). The AI immediately translates natural language into pristine KaTeX syntax.
