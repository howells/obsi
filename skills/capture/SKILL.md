---
name: capture
description: >
  Capture notes to the user's Obsidian vault. Use when user says
  "add to obsi", "save to obsi", "note in obsi", "put in obsi",
  "remember in obsi", or references "obsi" for note-taking.
---

# Capture to Obsi

Natural language trigger for the obsi command. When invoked, follow the instructions in `${CLAUDE_PLUGIN_ROOT}/commands/obsi.md`.

Quick reference:
- Vault path: `$OBSIDIAN_VAULT` env var (default: `~/Obsi`)
- Save to: `$OBSIDIAN_VAULT/Inbox/YYYY-MM-DD-HHMMSS - <slug>.md`
- Include YAML frontmatter: created, tags, source
- Confirm with the file path after creating
