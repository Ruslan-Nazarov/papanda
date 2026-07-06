# 🧠 Guide to Dialectics and "Smart Notes"

In papanda, dialectics is a protocol that bridges human capabilities and AI possibilities. As a rule, other applications, software, and practices try to understand how to apply AI without separately considering how to apply human capabilities in combination with AI possibilities. The papanda application is an attempt at a unified approach, a protocol that solves this task of effectively combining human and AI.

A "Smart Note" is the implementation of dialectics through papanda's software tools. It is not simply a split screen with category search. A "Smart Note" is the form in which the content of dialectics manifests itself in the web application.

## What do you need to understand?

Dialectics (and the "Smart Note") begins with the question: "What do you need to understand?". This question is easy to ask—and difficult to answer. Look for the most precise formulation that shows the subject of your interest in its development. You do not simply want to know what transformers are in AI; you need to know how the concept of "transformers" emerged in AI, what problems they solve, and how.

** In the left half of the note, you will sequentially "assemble" the nodal points of development: the initial moment of the process, the simplest content of this process, the opposite of the simplest process, the contradiction and its resolution, i.e., the return to the initial moment. Thus, understanding is this entire process. Not a simple listing of A and B, as is customary in textbooks and on educational websites, but specifically a process, a development.

In the right half of the note, the development of these stages will be placed: the simplest is revealed, what leads it to its opposite, which itself is revealed, together forming a contradiction.

Neither the left nor the right half exists separately. The left is the abstraction that receives specificity in the right. In the right is the specificity that together forms the abstraction in the left. **

** The main elements on the right and left of the canvas are called blocks.

Gray blocks are hints on what to do. Bold text indicates the main action, regular text explains how to do it better or more conveniently. Tap on a block and an editor will appear. A description of the editor's capabilities can be found in the Application Features section. **

This is not nitpicking—to formulate through development. Dialectics is a way of presenting the world as a continuous process, as development. From the perspective of dialectics, the meaning of the world is revealed only in development; understanding the world is possible only through describing it as development. By posing the initial question about development, you will be forced to follow development going forward.

## The Simplest Process

Once you have decided on the question "What do you need to understand?", move on to the "Simplest Process" block. Here you need to specify what simplest process lies at the foundation of the process you intend to understand. Simplest means that from which all other processes develop (you will describe them a bit later on the right). The simplest is not what is easy to understand, obvious, etc. The simplest is precisely that from which development proceeds, what generates development.

Remember that you can always return and refine the content of this simplest process. In the Note, we conduct research, not just store data. If, for example, the disclosure of the simplest process (in the right half) shows that this simplest process itself is not the simplest specifically for the process we want to understand, then the simplest process will need to be changed.

** Tap on the block, and the editor will appear. Note that each block can be given a title. All blocks are included in the Table of Contents, where they are easier to find by title. Tapping a block title in the Table of Contents sets the page focus on that block and highlights it. **

** Each block has its own toolbar located at the top. Some functions of this panel are duplicated at the bottom of the block. The panel is divided into two parts—some functions are substantive, others are technical. First, the substantive ones: 1) Links to primary sources and useful materials; 2) Glossary—here you collect words and terms that are important specifically for this block. All words from all blocks gradually form the general glossary of Notes; 3) Understanding hacks—these are useful ideas on how to deal with difficulties in mathematics, physics, and beyond; 4) Stickers can be used for planning or reflection. You can create a sticker "rework block", or list theory errors point by point to work through them later.

Technical functions—editing, changing block border color, deleting a block. **

** Each gray block has an AI Help button. You must always remember that AI cannot perform the work of understanding for a human. AI can imitate such work, can gather facts, can restructure texts, but cannot understand. If you still experience a block in understanding what, for example, would be the simplest process, you can tap the AI Help button. This will not be the final solution, but it will help you move forward. **

## Development of the Simplest Process

The development of the simplest process is filling the abstraction that we formulated in the block above as "the simplest" with specificity. It is important to remember this: on the right, we show precisely the development of the simplest, so on the right, the development must be connected with the simplest, must be its development, its concretization. This follows from the fact that development is the result of the becoming of "one," which already contains "another," and the becoming of "another," which already contains "one." Becoming is the transition of one into another, of another into one.

An abstract simplest is filled with specificity when it interacts with what is not itself.

The development of the simplest process itself can include several processes and consist of contradictions. This is true. However, this does not negate that this development is the filling of the simplest on the left with specificity. That is why the Note tools are designed to allow temporarily hiding information that in and of itself does not directly relate to the development of the simplest.

** You can collapse blocks, leaving only the description. It is assumed that precisely in the description you provide the essential element of the development of the simplest. In the part that was collapsed, you could show how this element of development grew out of another contradiction, but for the current task of developing the simplest, you can temporarily hide this process. Specifically hide, not delete, which is why a collapse mechanism is implemented. In addition, exporting to sources, glossary, the ability to use parsers, a flexible table of contents system, and links—all this should allow retaining maximum information about the development of the simplest in blocks, without losing additional information that is also important. **

Development can be shown historically or logically. Ultimately, these two paths should yield the same result. Historical development is preferable; logical can be used either where there is insufficient historical data or where the historical is misleading (yes, that happens).

How complete should the description of development be? Here we must remember that cognition is infinite. No process can be completely described; one can only strive for such a description. Therefore, in the note as well, we strive to describe development as completely as possible, but we should not get bogged down in details.

For both historical and logical presentation of development, you will need books, articles, and similar sources. As a rule, they are written non-dialectically, which means they are difficult to understand. To simplify the understanding of such books, an algorithm of "restoration to dialectics" was invented. This algorithm was implemented in three tools:

1. Article parser – you can place any article or part of a book into the parser, which will try to present the article or book dialectically

<details markdown="1">
<summary><strong>Article Parser Prompt (expand)</strong></summary>

# PROMPT: DIALECTICAL-HISTORICAL RECONSTRUCTION OF SCIENTIFIC ARTICLES

Your goal is to transform the static text of a scientific or technical article into a description of an objective, continuous process of scientific knowledge development.

*Note: The terminology and basic logic of this prompt must be understood in strict accordance with the documents "1 главный промпт.md" and "2 восстановление_промпт.md".*

The transformation is carried out in the following steps:

Step One. Take the article and remove academic noise (introductions, subjective criticism of predecessors, benchmarks, literature reviews).

Step Two. Identify the simplest process in the article, the development of which yields all other processes described in the article.

Step Three. The simplest process is checked for correspondence to development.
Development is understood as the becoming of one process that already contains another process (in this prompt and in all prompts of the papanda.kz application, this process is designated as **A**), while simultaneously there is the becoming of this other process that contains the initial process (in this prompt and in all prompts of the papanda.kz application, this process is designated as **B**). Becoming is the continuous transition of one into another and another into one.
If the process is a development, then dialectical analysis can be performed on it. If the process itself is not a development, this means it is an element of another development, and therefore can be dialectically analyzed precisely as such an element.

Step Four. Perform dialectical analysis if the simplest process is a development. Dialectical analysis begins with historical analysis, showing how previous development led to the processes described in the article. If historical data is insufficient, dialectical logic can be applied, but with an explicit indication of this.
If the simplest process is not a development, you need to find which other process (that is a development) the simplest process is an element of. Then perform an analysis of this new process and the simplest process within its framework.


**Style Requirements:**

* Output format: Markdown.
* The response must be short, precise, and concise.
* Avoid redundant introductory words and fluff.
* Always address the user politely using formal language.

</details>
 
2. Formula parser – any formula can be reduced to summation through the basic contradiction of mathematics. This significantly simplifies understanding the formula itself.

<details markdown="1">
<summary><strong>Formula Parser Prompt (expand)</strong></summary>

# PROMPT: FORMULA PARSER

You provide a dialectical analysis of mathematical formulas based on the following:

1. Mathematics begins with summation. The unit ("1") is initially taken as the sole number;
2. Summation becomes more complex, requiring the introduction of simpler mathematical operations. For example, complication of summation yields multiplication;
3. Simpler mathematical operations at a certain stage themselves become complex, requiring the introduction of new simpler mathematical operations;
4. Steps 2 and 3 repeat, which yields the development of mathematics. Examples for the first basic mathematical operations are given below.

In accordance with this process, the following statements hold true:

1. It is always possible to build a chain of contradictions from addition to any formula;
2. Any formula can be unfolded along this chain back to addition. To understand a formula means to obtain this chain.


Examples of development from summation to mathematical operations:

1. Simple summation yields: 1 + 1
2. Summation becomes more complex: 1 + 1 + 1 + 1...
3. To simplify summation, references are introduced: 1 + 1 + 1 + 1 = 4. Here "4" is specifically a reference, not an independent number; only the unit remains a number.
4. Complication of multiplication yields exponentiation: 5*5 = 5^2
5. The introduction of a reference shows that summation yields a transition from reference to reference. For example, 1 + 1 + 1 + 1 with the addition of a unit yields 5. The reference becomes not only a fixation of summation, but also a fixation of the transition from reference to reference (from 4 to 5).
6. Division and roots arise as a simplification of summation. For example, 5 can be written as 1 + 1 + 1 + 1 + 1, or as 10/2. Similarly, 1 + 1 + 1 + 1 + 1 can be written as the square root of 25.
7. When dividing a smaller number by a larger one, the unit is lost as a number; the unit becomes a reference. For example, 12 : 24 = 0.5.
8... Continuing this way, one can reach any mathematical operation.



Special Requirements:

1. You do not explain *what* a formula means; you show *how* it can be reached dialectically;

2. Your work is strictly subordinated to the documents "1 главный промпт.md" and "2 восстановление_промпт.md".

---

**⚠ Strict Limitation: Quantitative Analysis Only**

This analysis is strictly quantitative. You describe exclusively the chain of operations—how one operation generates a notation crisis and how the next resolves it. You do not interpret the physical, conceptual, or substantive meaning of operations and formulas. Do not explain *what* the formula describes in reality (probability, attention, speed, measure, etc.)—that is the qualitative side, which is outside the scope of this analysis. Only: predecessor → notation crisis → crisis resolution.

---

**Style Requirements:**

* Output format: Markdown.
* The response must be short, precise, and concise.
* Avoid redundant introductory words and fluff.
* Always address the user politely using formal language.

</details>

3. Contextual explanation of concepts - allows explaining any highlighted piece of text dialectically.

<details markdown="1">
<summary><strong>Contextual Explanation Prompt (expand)</strong></summary>

# PROMPT: "WHAT IS THIS?" MODULE (CONTEXTUAL EXPLANATION)

You are the contextual explanation module of the papanda (papanda.kz) server application. The user highlights text (a term, concept, phrase) and requests its meaning. Your task is to provide a dialectical answer rather than a static encyclopedic excerpt.

Your work is strictly subordinated to the **Main Prompt: Dialectics and Dialectical Analysis** and **PROMPT: RESTORATION TO DIALECTICS**.

The response is formed through the following procedure:

1. The highlighted text is checked for correspondence to development.
Development is understood as the becoming of one process that already contains another process (in this prompt and in all prompts of the papanda.kz application, this process is designated as \*\*A\*\*), while simultaneously there is the becoming of this other process that contains the initial process (in this prompt and in all prompts of the papanda.kz application, this process is designated as \*\*B\*\*). Becoming is the continuous transition of one into another and another into one.
If the process is a development, then dialectical analysis can be performed on it. If the process itself is not a development, this means it is an element of another development, and therefore can be dialectically analyzed precisely as such an element.
2. If difficulties arise in understanding the process, you must refer to **PROMPT: RESTORATION TO DIALECTICS**.
3. If the process is a development, dialectical analysis of the concept is performed in accordance with the **Main Prompt: Dialectics and Dialectical Analysis**. As a result, the simplest, its development, the opposite, its development, the contradiction, and the transition (leap) are established.
The response informs the user of the essence of the contradiction and also shows that the highlighted text is the resolution of this contradiction.
4. If the highlighted text is meaningless and it is impossible to perform dialectical analysis (including after applying **PROMPT: RESTORATION TO DIALECTICS**), honestly say so. Do not try to artificially perform dialectical analysis in all cases.

**Style Requirements:**

* Output format: Markdown.
* The response must be short, precise, and concise.
* Avoid redundant introductory words and fluff.
* Always address the user politely using formal language.

</details>

### The Opposite Process

We need to understand something. This something is a result of this same world, meaning it is the resolution of some contradiction. Everything in the world moves and develops because it is precisely such a resolution of contradictions. Therefore, we must look for contradictions once we have already found the simplest and its development. This is all true. However, finding a contradiction immediately is difficult, and for AI it is generally impossible. The compromise here is that AI can find opposites, and a human can check them for contradiction.

In any case, an opposite is a good sign of a contradiction. Therefore, after developing the simplest, we search within this development for its opposite. What will be the opposite? That which completely denies our simplest. The presence of the opposite must deny the presence of the simplest. It is important to note here that not every element of the content of the opposite necessarily "destroys" every element of the simplest. No, it is enough that the opposite by its presence denies the simplest.

You might stumble upon such an opposite while describing the development of the simplest. But you might not be so lucky. What should you do? Use the AI Opposites tool. Someday this tool will become an independent AI, but for now it works as a prompt to the current AI.

<details markdown="1">
<summary><strong>Opposites Search Prompt (expand)</strong></summary>

# PROMPT: OPPOSITES SEARCH MODULE

You are the opposites search module of the papanda (papanda.kz) server application. Your task is to search for opposites **A** and **B**, as understood in the **Main Prompt: Dialectics and Dialectical Analysis**.

You are invoked at the stage of creating a note when the structure requires finding an opposite for the phenomenon under investigation. You do not search for the final resolution (**C**)—a human does that.

**Execution Algorithm:**
You are given the initial process **[А]**: {INSERT PROCESS}

**Step 1. Revealing the Scope of [A]**
Generate exactly 10 unique statements (situations, conditions, relations) that reveal the content of process **[A]**.

**Step 2. Selecting Candidate [B]**
Based on the content of Step 1, determine a candidate process **[B]** whose development potentially completely destroys the development of **[A]**.

**Step 3. Independent Scope Disclosure of [B]**
Generate exactly 10 unique statements revealing the content of candidate **[B]**.
*Strict Rule:* Statements are generated absolutely independently. It is forbidden to construct them through direct negation of sentences from Step 1, to use the same vocabulary, or simply to invert the situations of process **[A]**.

**Step 4. Verification of Total Destruction (10 vs 10)**
Compare the two arrays. Determine whether total destruction occurs: does the physical or logical realization of the 10 independent situations of **[B]** exclude the existence of the 10 situations of **[A]**?

---

**Style Requirements:**

* Output format: Markdown.
* The response must be short, precise, and concise.
* Avoid redundant introductory words and fluff.
* Always address the user politely using formal language.

</details>

### Development of the Opposite Process

All the same rules apply here as in the development of the simplest.

### Unity and Development of the Simplest and the Opposite

If we have found opposites, we must take them in unity and then see how they "work." They are opposites, which means they should "destroy" each other, shouldn't they? Not necessarily, and that is the "trick." Opposites struggle, but they are also united. Out of this arises a contradiction. The simplest cannot exist because the opposite exists, yet it does exist, and vice versa. The development of this contradiction leads to a leap taking place—the resolution of the contradiction.

### Resolution of the Contradiction

A contradiction is resolved when it either acquires a form in which it continues to exist, or a third arises that sublates (overcomes and preserves) the contradiction itself, elevating the opposites to a higher level.

That which became the resolution of the contradiction itself takes the place of the simplest.
