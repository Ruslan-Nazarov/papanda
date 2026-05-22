---
description: Automatic commit message generator and fast AI-powered commit for all current changes
---

# Workflow: turbo-all

When requested to run the "turbo-all" workflow or "commit all changes", you must execute these steps sequentially without asking for intermediate confirmation:

1. **Stage All Changes**: Execute `git add .` to stage all modified and new files.
2. **Analyze Changes**: Execute `git diff --cached` to analyze the staged changes.
3. **Generate Message**: Based on the diff, generate a concise, professional commit message strictly following the [Conventional Commits](https://www.conventionalcommits.org/) specification (e.g., feat:, fix:, chore:, refactor:).
4. **Commit**: Execute the commit using the generated message: `git commit -m "<ai_generated_message>"`
5. **Report**: Inform the user about the successful commit and display the generated message. Ask if they want to `git push`.