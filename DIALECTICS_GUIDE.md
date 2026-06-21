# 🧠 Smart Notes Guide (Dialectics) in papanda

A **Dialectics** smart note is a tool for dialectical analysis, assisted by AI-powered search for opposites and an AI-powered formula parser (at the current stage, general-purpose models are used, which will be replaced by specialized ones in the future).

The layout is based on splitting the screen into two parts: we capture facts on the left, and show the development of these facts on the right.

The analysis process is structured as follows. We start with the simplest concept that belongs to the subject under study — the fact. It is placed on the left side. To the right of it, we provide its development: showing exactly how it unfolds. In the course of this unfolding, we aim to detect an element that contradicts the initial fact. To do this, we must first find opposites — AI can help with this step, but only with this step.

Once the opposites are found, we test them for contradiction. To do this, we unite them with the simplest concept and see how they interact. If the contradiction test succeeds, we move this element to the left.

After that, we show how this discovered contradiction unfolds and develops on the right side. In the process of this development, we find the leap to resolving the contradiction. The result of such a leap will be reflected on the left side, but the result on the canvas is always preceded by a central block showing exactly how this leap is carried out.

---

## 📋 Key Features

### 1. Two-Sided Canvas (Facts and their development)

* **Screen Division**: The left side is designed for capturing facts, contradicting elements, and the results of resolving contradictions. The right side is for reflecting the process of their development and unfolding.
* **Dialectical Process**: The block structure clearly demonstrates the transition from the simplest fact to its development, finding opposites using AI, capturing the contradiction, and making the leap to its resolution.

### 2. Math Editor

* **AI Transformation**: The editor works based on dictation or plain text input, which is then converted by artificial intelligence into beautiful LaTeX layout (KaTeX) for rendering formulas of any complexity.

### 3. Creating Graphs and Shapes

* **Embedding into the Note**: You can construct mathematical graphs from formulas and create vector shapes directly in the editor, and then instantly insert them into the body of text blocks.

### 4. Sticker Integration (Sticky Thoughts)

* **Guides through Layers of Knowledge**: Just like in the rest of the application, stickers serve not only to capture immediate thoughts and considerations, but also to create anchors for future reflection. The learning process cannot happen "all at once or deep into it" — knowledge is infinite, so we absorb it layer by layer. Stickers in this process act as guides through these layers of comprehension.

---

## 🚀 Step-by-Step Guide on Working with the Note

### Step 1. Creating and Managing the Note

1. Open the **Dialectics** section in the main menu of the application.
2. Set the topic of the note in the **"Note topic..."** field on the top panel.
3. To save your work, use the menu in the upper right corner: **Menu** -> **Save**.
4. The **Menu** button also allows you to:
    * **New** — clear the canvas and start a new note from scratch.
    * **Open** — open a list of previously saved notes.
    * **Parser** — launch the AI formula parser, which breaks down a mathematical expression into three dialectical stages (thesis, notation crisis, and resolution).
    * **Example** — load a demonstration example note.

### Step 2. Adding and Placing Blocks

You can add new blocks to the canvas in two ways:

1. **Click on an empty space on the canvas**: creates a block with automatic side selection (sides alternate: if the previous block was on the left, the new one will be on the right, and vice versa).
2. **Insertion buttons in divider rows (`+`)**: hover between blocks (or at the beginning/end of the canvas) to see a row with three buttons:
    * **Left round `+`**: adds a block to the left side (for capturing base facts and contradicting elements).
    * **Right round `+`**: adds a block to the right side (for development and unfolding).
    * **Center square `+`**: adds a block in the center (for displaying the results of the leap to resolve contradictions).

### Step 3. Filling Blocks in the Editor

To open a block for editing, **double-click** on it or click the **✎ (Edit)** icon on its top panel. In the editor window that opens:

* **Text Tab**:
    * Enter text and formulas.
    * For entering formulas, you can use **AI dictation or text conversion**: describe the formula in words (e.g., "integral of x over dx"), and the AI will translate it into LaTeX.
* **Graphs Tab**: Enter a function (e.g., `x^2`) and click **Plot** to generate an interactive graph, then transfer it into the note using the **"Insert to text"** button.
* **Shapes Tab**: Work with the built-in vector editor (drawing geometric shapes, arrows, grouping, managing layers) and insert the finished drawing into the block using the **"Insert to text"** button.
* **Saving Changes**: Click the **"OK"** button in the lower right corner of the editor to apply changes to the block on the canvas.

### Step 4. Managing Structure and Analysis

* **Finding Opposites**: Click the **✨ (Ask AI)** icon on the top panel of any block describing a process — the AI will analyze the text and suggest opposite sides to study the contradiction.
* **Linking with Stickers**: Click the sticker icon on a block or inside the editor to capture current thoughts and considerations, creating anchors for layer-by-layer learning.
* **Relations**: The **"Relations"** button on the top panel is designed to manage connections of the note. Currently it is a placeholder, but in the future, the feature will combine AI search across all notes and manual links created by the author to integrate knowledge into a unified system.
* **Deleting Blocks**: Click the trash can icon **🗑️ (Delete)** on a block to remove it from the canvas.
