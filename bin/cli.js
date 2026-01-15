#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

const HOME = os.homedir();
const PACKAGE_ROOT = path.join(__dirname, '..');
const VAULT_PATH = path.join(HOME, 'Obsi');

const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ============================================
// SYSTEM PROMPTS FOR EACH COMMAND
// ============================================

const PROMPTS = {
  add: `You are a note capture assistant. Save the user's content to their Obsidian vault.

Instructions:
1. Extract the content from what the user provides
2. Create a short title (3-6 words)
3. Write a file to ~/Obsi/Inbox/ with this format:

Filename: YYYY-MM-DD-HHMMSS - <slug>.md

Content:
---
created: YYYY-MM-DD HH:MM
tags: [inbox]
source: terminal - obsi CLI
---

# <Title>

<User's content>

After creating, output ONLY: Created: ~/Obsi/Inbox/<filename>.md`,

  find: `You are a vault search assistant. Search the user's Obsidian vault at ~/Obsi.

Instructions:
1. Use grep/find to search for the query in ~/Obsi
2. Return a list of matching notes with:
   - File path (relative to ~/Obsi)
   - A brief snippet showing the match context
3. Sort by relevance (title matches first, then content matches)
4. Limit to 10 results

Output format:
## Found X matches for "query"

1. **Note Title** - path/to/note.md
   > matching snippet...

2. **Another Note** - path/to/another.md
   > matching snippet...

If no matches, say: No notes found matching "query"`,

  daily: `You are a daily notes assistant. Manage the user's daily note in ~/Obsi/+Daily.

Today's date: ${new Date().toISOString().split('T')[0]}

Instructions:
1. Check if ~/Obsi/+Daily/${new Date().toISOString().split('T')[0]}.md exists
2. If it exists, read and display its contents
3. If it doesn't exist, create it with this template:

---
created: ${new Date().toISOString().split('T')[0]}
tags: [daily]
---

# ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}

## Tasks
- [ ]

## Notes


## End of Day


After creating, output: Created daily note for ${new Date().toISOString().split('T')[0]}
If reading, just show the contents.`,

  review: `You are an inbox processing assistant. Help organize notes in ~/Obsi/Inbox.

Instructions:
1. List all files in ~/Obsi/Inbox (excluding .gitkeep)
2. For each note, suggest where it should be filed:
   - Projects/ - active project notes
   - Areas/ - ongoing responsibilities
   - Resources/ - reference material
   - Archive/ - completed/inactive

3. Present as a checklist:

## Inbox Review

Found X notes to process:

1. **Note Title** (created date)
   > Brief summary of content
   → Suggested location: Projects/project-name/

2. **Another Note** (created date)
   > Brief summary
   → Suggested location: Resources/

Ask: "Should I move these notes to the suggested locations?"
If user confirms, move the files.`,

  link: `You are a note linking assistant. Find related notes in ~/Obsi.

Instructions:
1. Read the specified note or use the provided topic
2. Search the vault for related notes by:
   - Similar tags
   - Similar titles
   - Mentioned concepts
3. Suggest [[wikilinks]] to add

Output format:
## Related Notes for "Topic"

**Strong connections:**
- [[Note Name]] - why it's related
- [[Another Note]] - connection reason

**Potential connections:**
- [[Weak Match]] - possible relationship

**Suggested links to add:**
Add these [[wikilinks]] to your note:
- Link to [[Related Concept]] when discussing X
- Reference [[Another Note]] for background on Y`,

  summarize: `You are a note summarization assistant. Summarize notes from ~/Obsi.

Instructions:
1. Read the specified note or folder
2. Create a concise summary with:
   - Key points (bullet list)
   - Main themes
   - Action items (if any)
   - Related concepts

Output format:
## Summary: Note Title

**Key Points:**
- Point 1
- Point 2

**Themes:** theme1, theme2

**Action Items:**
- [ ] Any todos found

**Related:** [[Link1]], [[Link2]]`
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasCursor() {
  return fs.existsSync(path.join(HOME, '.cursor')) || hasCommand('cursor');
}

function hasClaudeCode() {
  return hasCommand('claude');
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  fs.copyFileSync(src, dest);
}

// ============================================
// INSTALL FUNCTIONS
// ============================================

function installForCursor() {
  const commandsDir = path.join(HOME, '.cursor', 'commands');
  ensureDir(commandsDir);

  const src = path.join(PACKAGE_ROOT, 'commands', 'obsi.md');
  const dest = path.join(commandsDir, 'obsi.md');

  copyFile(src, dest);
  console.log(`  ${colors.dim('→')} ~/.cursor/commands/obsi.md`);
}

function installForClaudeCode() {
  const pluginsDir = path.join(HOME, '.claude', 'plugins', 'obsi');
  ensureDir(pluginsDir);

  const filesToCopy = [
    ['.claude-plugin/plugin.json', '.claude-plugin/plugin.json'],
    ['commands/obsi.md', 'commands/obsi.md'],
    ['skills/capture/SKILL.md', 'skills/capture/SKILL.md'],
  ];

  for (const [src, dest] of filesToCopy) {
    const srcPath = path.join(PACKAGE_ROOT, src);
    const destPath = path.join(pluginsDir, dest);
    ensureDir(path.dirname(destPath));
    copyFile(srcPath, destPath);
  }

  console.log(`  ${colors.dim('→')} ~/.claude/plugins/obsi/`);
}

function createVaultStructure() {
  const dirs = ['Inbox', '+Daily', 'Projects', 'Areas', 'Resources', 'Archive'];
  let created = false;

  for (const dir of dirs) {
    const dirPath = path.join(VAULT_PATH, dir);
    if (!fs.existsSync(dirPath)) {
      ensureDir(dirPath);
      created = true;
    }
  }

  if (created) {
    console.log(`\n${colors.green('✓')} Created vault structure at ~/Obsi/`);
  }
}

function install() {
  console.log(`\n${colors.blue('obsi')} - Obsidian vault CLI\n`);

  const hasCursorInstalled = hasCursor();
  const hasClaudeInstalled = hasClaudeCode();

  if (!hasCursorInstalled && !hasClaudeInstalled) {
    console.log(colors.yellow('No supported tools detected.'));
    console.log('Install Claude Code or Cursor first.\n');
    process.exit(1);
  }

  if (hasCursorInstalled) {
    console.log(`${colors.green('✓')} Installing for Cursor...`);
    installForCursor();
  }

  if (hasClaudeInstalled) {
    console.log(`${colors.green('✓')} Installing for Claude Code...`);
    installForClaudeCode();
  }

  createVaultStructure();

  console.log(`\n${colors.green('Done!')} Commands available:\n`);
  console.log(`  obsi "note"       Capture to inbox`);
  console.log(`  obsi find "q"     Search vault`);
  console.log(`  obsi daily        Today's daily note`);
  console.log(`  obsi review       Process inbox`);
  console.log(`  obsi link "note"  Find connections`);
  console.log(`  obsi summarize    Summarize notes\n`);
}

// ============================================
// COMMAND EXECUTION
// ============================================

function runClaude(systemPrompt, userPrompt, tools = ['Read', 'Write', 'Bash', 'Glob', 'Grep']) {
  if (!hasClaudeCode()) {
    console.error(colors.yellow('Claude Code not found. Install it first:'));
    console.error('  npm install -g @anthropic-ai/claude-code\n');
    process.exit(1);
  }

  const child = spawn('claude', [
    '--system-prompt', systemPrompt,
    '--allowedTools', tools.join(','),
    '-p',
    userPrompt
  ], {
    stdio: 'inherit',
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

// ============================================
// COMMANDS
// ============================================

const commands = {
  add: (args) => {
    const content = args.join(' ');
    if (!content) {
      console.error(colors.yellow('Usage: obsi add "content to capture"'));
      process.exit(1);
    }
    runClaude(PROMPTS.add, content, ['Write']);
  },

  find: (args) => {
    const query = args.join(' ');
    if (!query) {
      console.error(colors.yellow('Usage: obsi find "search query"'));
      process.exit(1);
    }
    runClaude(PROMPTS.find, `Search for: ${query}`, ['Read', 'Bash', 'Glob', 'Grep']);
  },

  daily: () => {
    runClaude(PROMPTS.daily, 'Open or create my daily note', ['Read', 'Write']);
  },

  review: () => {
    runClaude(PROMPTS.review, 'Review my inbox and suggest where to file each note', ['Read', 'Bash', 'Glob', 'Grep']);
  },

  link: (args) => {
    const topic = args.join(' ');
    if (!topic) {
      console.error(colors.yellow('Usage: obsi link "note name or topic"'));
      process.exit(1);
    }
    runClaude(PROMPTS.link, `Find notes related to: ${topic}`, ['Read', 'Bash', 'Glob', 'Grep']);
  },

  summarize: (args) => {
    const target = args.join(' ') || 'Inbox';
    runClaude(PROMPTS.summarize, `Summarize: ${target}`, ['Read', 'Bash', 'Glob', 'Grep']);
  },
};

// ============================================
// HELP
// ============================================

function showHelp() {
  console.log(`
${colors.blue('obsi')} - Obsidian vault CLI powered by Claude

${colors.bold('Usage:')}
  obsi [command] [arguments]

${colors.bold('Commands:')}
  ${colors.green('add')} "content"       Capture a note to inbox (default)
  ${colors.green('find')} "query"        Search your vault
  ${colors.green('daily')}               Open/create today's daily note
  ${colors.green('review')}              Process inbox, file notes
  ${colors.green('link')} "topic"        Find related notes, suggest links
  ${colors.green('summarize')} [path]    Summarize a note or folder

  ${colors.dim('--install')}            Install for Claude Code & Cursor
  ${colors.dim('--help')}               Show this help

${colors.bold('Examples:')}
  obsi "Remember to refactor auth"
  obsi add "API design notes"
  obsi find "authentication"
  obsi daily
  obsi review
  obsi link "user management"
  obsi summarize Projects/api

${colors.dim('Vault location:')} ~/Obsi
`);
}

// ============================================
// MAIN
// ============================================

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  if (args.includes('--install') || args.includes('-i')) {
    install();
    return;
  }

  // Check if first arg is a command
  const cmd = args[0];
  const cmdArgs = args.slice(1);

  if (commands[cmd]) {
    commands[cmd](cmdArgs);
  } else {
    // Default: treat everything as content to add
    commands.add(args);
  }
}

main();
