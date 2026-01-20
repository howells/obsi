---
description: Capture notes to your Obsidian vault. Usage: /obsi <what to capture>
---

# Capture to Obsidian

Capture the provided content to the user's Obsidian vault.

## Vault Path

The vault path is defined by the `OBSIDIAN_VAULT` environment variable. If not set, default to `~/Obsi`.

**Always use the env var value directly** — do not hardcode paths.

## Instructions

1. **Extract content**: Identify what should be saved from the user's request
2. **Determine context**: Note the current project/file as the source
3. **Create title**: Short descriptive name (3-6 words)

## Create the Note

Write to `$OBSIDIAN_VAULT/Inbox/YYYY-MM-DD-HHMMSS - <slug>.md`:

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

- Always save to `$OBSIDIAN_VAULT/Inbox/` — user files it later
- Include source context (project, file, conversation)
- Keep titles short (3-6 words)
- Preserve content as-is unless summarization requested
- Add relevant tags: `inbox` always, plus 1-2 obvious ones

## Confirm

After creating, confirm with the full file path.
