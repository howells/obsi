# obsi

Obsidian vault CLI powered by Claude. Capture, search, and organize your notes from the terminal.

## Install

```bash
npx obsi --install
```

Or install globally:
```bash
npm install -g obsi
```

## Commands

| Command | Description |
|---------|-------------|
| `obsi "note"` | Capture a note to inbox |
| `obsi find "query"` | Search your vault |
| `obsi daily` | Open/create today's daily note |
| `obsi review` | Process inbox, suggest filing |
| `obsi link "topic"` | Find related notes |
| `obsi summarize [path]` | Summarize notes |

## Examples

```bash
# Capture notes
obsi "Remember to refactor the auth module"
obsi add "API design: use REST with JWT"

# Search vault
obsi find "authentication"
obsi find "project:api"

# Daily notes
obsi daily

# Process inbox
obsi review

# Find connections
obsi link "user management"

# Summarize
obsi summarize Projects/api
obsi summarize Inbox
```

## How It Works

Each command invokes Claude Code with a specialized system prompt. Claude reads/writes files in your vault at `~/Obsi`.

## Vault Structure

```
~/Obsi/
├── Inbox/       ← New captures land here
├── +Daily/      ← Daily notes (YYYY-MM-DD.md)
├── Projects/    ← Active projects
├── Areas/       ← Ongoing responsibilities
├── Resources/   ← Reference material
└── Archive/     ← Completed/inactive
```

## In-Editor Usage

### Claude Code
```
/obsi Add a summary of this conversation
```

Or natural language:
```
"add this to obsi"
"save the api design to obsi"
```

### Cursor
```
/obsi Add a summary of this conversation
```

## Requirements

- [Claude Code](https://github.com/anthropics/claude-code) CLI installed
- Obsidian vault at `~/Obsi` (created automatically on install)

## License

MIT
