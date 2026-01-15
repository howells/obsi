---
description: Capture notes to your Obsidian vault. Usage: /obsi <what to capture>
---

# Capture to Obsidian

Capture the provided content to the user's Obsidian vault at `~/Obsi/Inbox/`.

## Instructions

1. **Extract content**: Identify what should be saved from the user's request
2. **Determine context**: Note the current project/file as the source
3. **Create title**: Short descriptive name (3-6 words)

## Create the Note

Write to `~/Obsi/Inbox/YYYY-MM-DD-HHMMSS - <slug>.md`:

```markdown
---
created: YYYY-MM-DD HH:MM
tags: [inbox]
source: <current project or context>
---

# <Title>

<Content>
```

## Guidelines

- Always save to `~/Obsi/Inbox/` — user files it later
- Include source context (project, file, conversation)
- Keep titles short (3-6 words)
- Preserve content as-is unless summarization requested
- Add relevant tags: `inbox` always, plus 1-2 obvious ones

## Confirm

After creating:
```
Created: ~/Obsi/Inbox/<filename>.md
```
