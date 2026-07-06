# Comprehensive Guide to papanda Note-Taking Functionality

This document provides an exhaustive reference for all tools, interfaces, and capabilities of the dialectical note-taking module in the papanda system.

---

## 🛠 Top Menu and Toolbar

### 1. Category and Project Linking
Located in the top-left corner, this dropdown menu allows you to link the current note to a specific project, academic discipline, or research domain. If the required category does not yet exist, you can create it instantly via the relations module or directly on the main dashboard.

### 2. Note Title
An input field for the document's title. All modifications to the title, as well as changes within block content, are automatically saved in the background.

### 3. Display Modes (`🎛️ Mode`)
A dropdown menu for customizing the canvas structure and visual presentation:
* **Dialectical Note**: Toggles the display of logical connections, visual dividers, and the classical thesis-antithesis-synthesis structure.
* **Daily Mode**: Switches the interface to a layout optimized for daily journaling, observation logs, and chronological notes.
* **Two-Column / Linear View**: Toggles between the classical two-column grid (left: facts/theses, right: development/antitheses) and a linear sequential layout.
* **Collapse Left Column**: A compact view mode that collapses the left column (facts/theses), allowing you to focus entirely on analyzing thought development, contradictions, and synthesis.
* **Keep Titles Only**: Hides the main text body of all blocks, displaying only their headers for a rapid structural audit and overview of the document's logic.

### 4. Parsers (`☰ Parsers`)
Quick launch menu for specialized artificial intelligence analytical tools:
* **🧮 Formula Parser**: Automatic dialectical breakdown and analysis of mathematical expressions and physical laws.
* **📄 Article Parser**: Deep structuring and extraction of logical thought progression from extensive scientific texts and academic publications.

### 5. Navigation and Structure
Controls for document navigation and semantic interlinking:
* **🏠 Dashboard**: Returns to the system home page, displaying overviews of all notes, habits, goals, and language learning modules.
* **🔗 Relations**: Opens an interactive semantic graph visualizing connections between different notes and knowledge clusters across your database.
* **📋 Table of Contents**: Displays a sidebar table of contents, automatically generated from block and section headers for instant jump-navigation.
* **📑 Section Title**: Opens a specialized modal dialog to insert structural headers and visual dividers directly into the flow of blocks on the canvas.
* **⏱️ Version History**: Document version control tool. Enables you to create named checkpoints (snapshots) of your note, browse a chronological timeline of edits, compare different states, and restore previous versions when necessary.

### 6. Menu (`⋮ Menu`)
File management and export options:
* **📄 New**: Clears the canvas and creates a new empty note.
* **📂 Open**: Accesses the list of saved documents with instant filtering and search capabilities.
* **↩️ Previous**: Instantly returns to the previously opened note with a single click.
* **💾 Save**: Forces a manual save checkpoint (in addition to continuous background auto-saving).
* **🗑️ Trash**: Opens the trash bin of deleted notes, allowing you to review discarded items, restore them to your active database, or permanently delete them.
* **📝 Export to Markdown**: Exports the complete structure of your dialectical note into universal Markdown text format.
* **📑 Export to PDF**: Generates a clean, print-ready or presentation-ready PDF document preserving the visual hierarchy of your blocks.

---

## 📌 Working with Blocks and Canvas

A dialectical note in papanda is structured upon a two-column canvas reflecting the logical movement of thought:
* **Left Column (Facts and Theses)**: Recording initial concepts, empirical data, observed phenomena, and the outcomes of resolving previous contradictions.
* **Right Column (Development and Opposites)**: Analyzing the unfolding of a fact, discovering internal contradictions, negations, and antitheses.
* **Central Blocks (Leap / Synthesis)**: Recording the transitional phase of qualitative change, uniting opposites into a new, higher-order concept.

### Block Controls
Every block on the canvas is equipped with an individual control toolbar and advanced features:
* **Header and Color (🎨)**: Assigning a clear title to the block and selecting a color palette for visual highlighting and categorization of ideas.
* **📌 Pin to Dashboard**: Pinning a critically important block or entire note directly to your main dashboard for continuous monitoring and rapid access.
* **🔗 Sources**: Attaching external links, bibliographic citations, books, and articles that serve as the foundation for the thesis.
* **📖 Block Dictionary**: Maintaining a local terminology dictionary with concept definitions and cross-references to other terms within the system.
* **💡 Understanding Hacks**: An interactive collection of cognitive heuristics and tips (such as the quantitative approach to complex formulas) designed to simplify grasping difficult material. Clicking any tip card instantly copies the advice to your clipboard.
* **🏷️ Stickers (Marginal Notes)**: Capturing fleeting thoughts, insights, questions, and cognitive hooks. Stickers serve as guiding markers through deeper layers of material comprehension.
* **👁 Footnotes / Hidden Phrases**: Expanding or collapsing hidden explanatory notes, detailed comments, and footnotes inside block text without cluttering the primary view.
* **🔒 Draft / Clean Version**: Dual tabs within a single block. The "Draft" tab is dedicated to free-form brainstorming, while the "Clean" tab holds polished, final formulations. Clean versions can be locked (🔒) to prevent accidental editing.
* **✨ Opposites Search**: A specialized intelligent button located on synthesis blocks (step 3), automatically triggering AI to discover new hidden contradictions and propel the dialectical spiral forward.
* **🗑️ Delete**: Moving the block to the trash bin, with the ability to undo the action.

---

## 🎨 Graphical, Formula, and Vector Editors

Clicking the edit button (✎) on any block opens the integrated multi-editor, which supports four specialized tabs:

### 1. Text Tab (`Text`)
A full-featured rich text processor for structuring thought:
* **Floating Formatting Toolbar**: Appears when selecting text, offering rapid access to bold, italic, underline, strikethrough, inline code, blockquotes, and formatting reset.
* **Intelligent AI Inline Tools**:
  * **𔔀 (Alternative Formulations)**: AI analyzes the selected text and generates multiple alternative expressions varying in style, depth, and tone.
  * **❓ (Mark Unclear / Question)**: AI examines an ambiguous text fragment and helps formulate a precise question or provides instant clarification.
  * **👁 (Hidden Phrase / Explanation)**: Converts the selected text into a compact footnote or hidden explanation.
  * **🔗 (Block Link)**: Creates an internal hyperlink pointing to any other block or section within your notes database.
* **Mathematical Palette (`mathMenu`)**: An interactive menu for inserting KaTeX formulas rapidly, categorized by: main operators (Main), brackets and matrices, mathematical analysis (∫ ∑), indices and powers, Latin symbols, and the complete Greek alphabet.
* **🤖 Editor AI Tab**: A dedicated sidebar inside the editor displaying detailed recommendations and analysis from artificial intelligence, complete with a 1-click button to copy generated text directly into your block.

### 2. Graph Tab (`Graphs`)
A tool for mathematical visualization:
* Plotting mathematical function graphs in real time based on inputted formulas.
* Customizing visual parameters and instantly inserting the rendered plot directly into the body of the text block.

### 3. Shapes Tab (`Shapes` - Vector Editor)
An integrated vector graphics editor for creating diagrams, schematics, and visual models:
* **Drawing Tools**: Object selection, freehand drawing (brush), rectangles, circles and ellipses, isosceles and right triangles, diamonds, straight lines, directional arrows, and text labels.
* **Object Properties and Styles**: Precise adjustment of stroke and fill colors, fill removal (transparency), and toggling the coordinate grid for accurate alignment.
* **Layer and Object Management**: Grouping and ungrouping elements (🔒), duplicating (copying), undoing recent actions, and clearing the canvas.
* **Object List Panel (⊞)**: A hierarchical layer list of all shapes on the canvas for easy selection, locking, renaming, and reordering of overlapping elements.
* **Parametric Shapes**: A specialized tool for constructing complex geometric and logical figures from precise numerical parameters and proportions.

---

## 🤖 AI (The papanda Intelligent System)

The papanda system incorporates a deeply integrated suite of artificial intelligence algorithms specifically trained in scientific methodology and dialectical cognition.

### 1. Philosophy and Human Role in papanda
Artificial intelligence in papanda does not replace the researcher's thinking; rather, it acts as a powerful cognitive amplifier. AI takes on the labor-intensive routine of searching for potential candidates for opposites, initial text parsing, and hypothesis formulation. However, verifying contradictions for truth, achieving deep comprehension, and performing the final synthesis (uniting thesis and antithesis into a qualitative leap) always remain the creative responsibility of the user.

### 2. Core Dialectical Analysis Prompt (`1 главный промпт.md`)
The engine of the papanda intelligent system:
* **What it does**: Conducts a comprehensive dialectical analysis of any inputted thesis, concept, or lecture fragment.
* **How it works**: The algorithm identifies the phenomenon's internal contradiction, defines its boundaries, constructs a logical chain of thought development from abstract to concrete, and proposes scientifically grounded options for resolving the contradiction through a qualitative leap.

### 3. Note Reconstruction and Restoration (`2 восстановление_промпт.md`)
A tool for the historical and logical reconstruction of scientific publications and theories:
* **What it does**: Helps reconstruct the underlying logic of a scientific discovery that is often obscured by polished formulas and dry academic writing.
* **How it works**: AI reconstructs the author's historical path of thought: starting from the initial problem and scientific crisis of old concepts, moving through the struggle of competing hypotheses, and arriving at the final theoretical conclusions.

### 4. Opposites Search (`противоположности_промпт.md`)
A tool to combat dogmatism and one-sided thinking:
* **What it does**: Generates well-argued antitheses, alternative scientific hypotheses, and hidden contradictions for any subject under investigation.
* **How it works**: Triggered by clicking the "✨" button on blocks or via the editor, prompting your mind to examine the subject in its continuous change and multifaceted development.

### 5. Contextual Concept Explanation (`контекстный_промпт.md`)
A tool for precise terminological comprehension:
* **What it does**: The "What is this?" function in the editor explains any selected word or term strictly within the context of your ongoing research, rather than providing an isolated encyclopedia definition.
* **How it works**: The model receives the full text of your note alongside the selected term. AI elucidates the term's meaning specifically in terms of the role it plays within the logical framework of that specific document.

### 6. Formula Parser (`формулы_промпт.md`)
Deep analysis of mathematical and physical expressions:
* **What it does**: Overcomes the dogmatic perception of formulas as static, arbitrary rules by unveiling the living history and logical necessity behind their creation.
* **How it works**: AI decomposes any mathematical notation into three dialectical stages:
  1. **Initial Thesis / Notation**: A basic mathematical operation or primary physical concept.
  2. **Crisis of Notation**: Increasing complexity where old notation methods lead to clumsiness, internal contradictions, or logical dead ends.
  3. **Qualitative Leap (Masterpiece of Resolution)**: The birth of a new formula as an elegant and inevitable resolution to the crisis.

### 7. Article Parser (`статьи_промпт.md`)
Intelligent processing of extensive academic literature:
* **What it does**: Transforms complex scientific publications, research papers, or textbook chapters into a transparent, structured dialectical framework.
* **How it works**: The algorithm filters out secondary details and verbal noise, clearly organizing the material around fundamental nodes: empirical baseline facts, the collision of opposing concepts, and the author's final theoretical synthesis.

### 8. Intelligent Assistant (`7 помощник_промпт.md`)
Your personal methodological consultant:
* **What it does**: An integrated interactive assistant ready at any moment to answer questions regarding note-taking methodology in papanda.
* **How it works**: Helps overcome cognitive blocks during material analysis, suggests the next logical step in breaking down a complex topic, and provides recommendations for optimally distributing ideas across the canvas blocks.

### 9. Voice and Text LaTeX Generation & Formatting
Instant conversion of natural language speech into mathematical syntax:
* **What it does**: Eliminates the need to manually write complex KaTeX / LaTeX code structures.
* **How it works**: You can speak a formula aloud or type it in plain words (for example, "integral from zero to infinity of x squared divided by two"). papanda algorithms instantly translate your description into flawlessly formatted KaTeX mathematical notation.
