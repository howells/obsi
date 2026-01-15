# obsi

Capture notes to your Obsidian vault from anywhere. Works with Claude Code and Cursor.

## Install

```bash
npx obsi
```

That's it. Auto-detects your tools and sets up everything.

### Manual alternatives

**Claude Code:**
```bash
claude plugins add howells/obsi
```

**Cursor only:**
```bash
mkdir -p ~/.cursor/commands
curl -o ~/.cursor/commands/obsi.md https://raw.githubusercontent.com/howells/obsi/main/commands/obsi.md
```

## Usage

```
/obsi Add a summary of this conversation
/obsi Remember to refactor the auth module
/obsi Save this error for debugging later
```

Or natural language (Claude Code):
```
"add this to obsi"
"save the api design to obsi"
```

## What It Does

Creates notes in `~/Obsi/Inbox/` with:
- Timestamp filenames: `2026-01-15-183045 - auth-refactor.md`
- YAML frontmatter: created, tags, source
- Context about where the note came from

## Vault Location

Expects `~/Obsi`. Edit the command file to customize.

## License

MIT
