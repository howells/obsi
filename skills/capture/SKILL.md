---
name: capture
description: >
  Capture notes to the user's Obsidian vault. Use when user says
  "add to obsi", "save to obsi", "note in obsi", "put in obsi",
  "remember in obsi", or references "obsi" for note-taking.
---

# Capture to Obsi

Capture content to the user's Obsidian vault at `~/Obsi`.

Usage:
- "add this to obsi"
- "save the api design to obsi"
- "put a reminder in obsi to review auth"
- "/obsi <content>"

## Vault Structure

```
~/Obsi/
  Inbox/          <- Captures go here
  Projects/       <- Active projects
  Areas/          <- Ongoing areas of responsibility
  Resources/      <- Reference material
  Archive/        <- Completed/inactive
  +Daily/         <- Daily notes
```

## Instructions

### 1. Determine What to Capture

From the user's request, identify:
- **Content**: What they want to save
- **Context**: Where it came from (current project, conversation, URL)
- **Title**: Short descriptive name (3-6 words)

### 2. Create the Note

Create a file at `~/Obsi/Inbox/YYYY-MM-DD-HHMMSS - <slug>.md`:

```markdown
---
created: YYYY-MM-DD HH:MM
tags: [inbox]
source: <context about where this came from>
---

# <Title>

<Content>
```

### 3. Guidelines

- **Always capture to Inbox/** — the user files it later
- **Include source context** — which project, file, or conversation
- **Keep titles short** — 3-6 words
- **Preserve the content** — don't summarize unless asked
- **Add relevant tags** — `inbox` always, plus 1-2 obvious ones

### 4. Confirm

After creating, output:
```
Created: ~/Obsi/Inbox/<filename>.md
```

## Examples

**User in project `~/Sites/api`:** "add this error to obsi"
```markdown
---
created: 2026-01-15 15:30
tags: [inbox, error, api]
source: ~/Sites/api - debugging session
---

# API Connection Error

<the error message and context>
```

**User after discussion:** "save our auth design to obsi"
```markdown
---
created: 2026-01-15 15:30
tags: [inbox, design, auth]
source: Claude Code conversation
---

# Auth Design Decisions

<key points from the conversation>
```
