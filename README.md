# obsi

Capture notes to your Obsidian vault from anywhere. Works with Claude Code, Cursor, and the terminal.

## Install

```bash
npx obsi --install
```

Or install globally:
```bash
npm install -g obsi
```

## Usage

### From terminal (invokes Claude Code)

```bash
obsi "Remember to refactor the auth module"
obsi "API design: use REST with JWT tokens"
obsi "Bug: login fails with special chars in password"
```

### From Claude Code

```
/obsi Add a summary of this conversation
```

Or natural language:
```
"add this to obsi"
"save the api design to obsi"
```

### From Cursor

```
/obsi Add a summary of this conversation
```

## What It Does

Creates notes in `~/Obsi/Inbox/` with:
- Timestamp filenames: `2026-01-15-183045 - auth-refactor.md`
- YAML frontmatter: created, tags, source
- Context about where the note came from

## Vault Location

Expects `~/Obsi`. Edit `commands/obsi.md` to customize.

## License

MIT
