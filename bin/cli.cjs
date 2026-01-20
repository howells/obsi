#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn, spawnSync } = require('child_process');
const os = require('os');

const HOME = os.homedir();
const PACKAGE_ROOT = path.join(__dirname, '..');

// Vault path from env or default
const VAULT_PATH = process.env.OBSIDIAN_VAULT || path.join(HOME, 'Obsi');

const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

// ============================================
// DEPENDENCY CHECKS
// ============================================

function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function hasObs() {
  return hasCommand('obs');
}

function hasClaudeCode() {
  return hasCommand('claude');
}

function requireObs() {
  if (!hasObs()) {
    console.error(`\n${colors.red('Error:')} obsidian-cli not found.\n`);
    console.error(`Install it first:\n`);
    console.error(`  ${colors.dim('brew tap yakitrak/yakitrak')}`);
    console.error(`  ${colors.dim('brew install obsidian-cli')}\n`);
    console.error(`Then set your default vault:`);
    console.error(`  ${colors.dim('obs set-default <vault-name>')}\n`);
    process.exit(1);
  }
}

// ============================================
// OBS PROXY - Pass through to obsidian-cli
// ============================================

function proxyToObs(args) {
  requireObs();
  const result = spawnSync('obs', args, { stdio: 'inherit' });
  process.exit(result.status || 0);
}

// ============================================
// NATIVE COMMANDS (not in obs)
// ============================================

function getVaultPath() {
  return VAULT_PATH;
}

function dailyNote() {
  const today = new Date();
  const dateStr = today.toISOString().split('T')[0]; // YYYY-MM-DD
  const dailyPath = path.join(getVaultPath(), '+Daily', `${dateStr}.md`);
  const dailyDir = path.dirname(dailyPath);

  // Ensure +Daily directory exists
  if (!fs.existsSync(dailyDir)) {
    fs.mkdirSync(dailyDir, { recursive: true });
  }

  // Create if doesn't exist
  if (!fs.existsSync(dailyPath)) {
    const content = `---
created: ${dateStr}
tags: [daily]
---

# ${dateStr}

## Tasks

- [ ]

## Notes

`;
    fs.writeFileSync(dailyPath, content);
    console.log(`${colors.green('Created:')} ${dailyPath}`);
  }

  // Open with system default
  const openCmd = process.platform === 'darwin' ? 'open' : 'xdg-open';
  spawnSync(openCmd, [dailyPath], { stdio: 'inherit' });
}

function printNote(args) {
  if (args.length === 0) {
    console.error(colors.yellow('Usage: obsi print <note>'));
    process.exit(1);
  }

  const noteName = args.join(' ');

  // Try to find the note
  const possiblePaths = [
    path.join(getVaultPath(), noteName),
    path.join(getVaultPath(), `${noteName}.md`),
  ];

  // Also search in subdirectories
  const searchInDir = (dir, name) => {
    if (!fs.existsSync(dir)) return null;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && (entry.name === name || entry.name === `${name}.md`)) {
        return fullPath;
      }
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        const found = searchInDir(fullPath, name);
        if (found) return found;
      }
    }
    return null;
  };

  let notePath = possiblePaths.find(p => fs.existsSync(p));
  if (!notePath) {
    notePath = searchInDir(getVaultPath(), noteName);
  }

  if (!notePath || !fs.existsSync(notePath)) {
    console.error(`${colors.red('Note not found:')} ${noteName}`);
    process.exit(1);
  }

  const content = fs.readFileSync(notePath, 'utf-8');
  console.log(content);
}

function searchContent(args) {
  if (args.length === 0) {
    console.error(colors.yellow('Usage: obsi search-content <query>'));
    process.exit(1);
  }

  const query = args.join(' ').toLowerCase();
  const results = [];

  const searchInDir = (dir) => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isFile() && entry.name.endsWith('.md')) {
        try {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.toLowerCase().includes(query)) {
            const relativePath = path.relative(getVaultPath(), fullPath);
            results.push(relativePath);
          }
        } catch (e) {
          // Skip unreadable files
        }
      }
      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        searchInDir(fullPath);
      }
    }
  };

  searchInDir(getVaultPath());

  if (results.length === 0) {
    console.log(colors.dim('No notes found containing that text.'));
  } else {
    console.log(`${colors.green('Found')} ${results.length} note(s):\n`);
    results.forEach(r => console.log(`  ${r}`));
  }
}

// ============================================
// CLAUDE-POWERED COMMANDS
// ============================================

const PROMPTS = {
  review: `You are an inbox processing assistant. Help organize notes in the user's Obsidian vault at ${VAULT_PATH}.

Instructions:
1. List files in ${VAULT_PATH}/Inbox/ using ls or find
2. Read each note's content using cat
3. For each note, suggest where it should be filed:
   - Projects/ - active project notes
   - Areas/ - ongoing responsibilities
   - Resources/ - reference material
   - Archive/ - completed/inactive

4. Present as a checklist with suggestions
5. If user confirms, use "obs move <from> <to>" to move notes

Ask: "Should I move these notes to the suggested locations?"`,

  link: `You are a note linking assistant. Find related notes in the user's Obsidian vault at ${VAULT_PATH}.

Instructions:
1. Use grep or find to search for related notes
2. Read note content using cat
3. Suggest [[wikilinks]] to add based on:
   - Similar tags
   - Similar titles
   - Mentioned concepts

Output format:
## Related Notes for "Topic"

**Strong connections:**
- [[Note Name]] - why it's related

**Suggested links to add:**
- Link to [[Related Concept]] when discussing X`,

  summarize: `You are a note summarization assistant for the vault at ${VAULT_PATH}.

Instructions:
1. Read the note content using cat
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
- [ ] Any todos found`
};

function runClaude(systemPrompt, userPrompt) {
  if (!hasClaudeCode()) {
    console.error(colors.yellow('Claude Code not found. Install it first:'));
    console.error('  npm install -g @anthropic-ai/claude-code\n');
    process.exit(1);
  }

  const child = spawn('claude', [
    '--system-prompt', systemPrompt,
    '--allowedTools', 'Bash,Read,Glob,Grep',
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
// OBSI COMMANDS
// ============================================

const obsiCommands = {
  // Native commands (implemented here)
  daily: () => dailyNote(),
  print: (args) => printNote(args),
  'search-content': (args) => searchContent(args),

  // AI-powered commands
  review: () => {
    runClaude(PROMPTS.review, 'Review my inbox and suggest where to file each note');
  },

  link: (args) => {
    const topic = args.join(' ');
    if (!topic) {
      console.error(colors.yellow('Usage: obsi link "note name or topic"'));
      process.exit(1);
    }
    runClaude(PROMPTS.link, `Find notes related to: ${topic}`);
  },

  summarize: (args) => {
    const target = args.join(' ');
    if (!target) {
      console.error(colors.yellow('Usage: obsi summarize "note name"'));
      process.exit(1);
    }
    runClaude(PROMPTS.summarize, `Summarize the note: ${target}`);
  },
};

// Commands that proxy directly to obs (only ones that actually exist)
const obsProxyCommands = [
  'open', 'create', 'move', 'delete', 'search', 'set-default', 'print-default'
];

// ============================================
// HELP
// ============================================

function showHelp() {
  console.log(`
${colors.blue('obsi')} - Obsidian CLI with AI powers

${colors.bold('Usage:')}
  obsi                      Interactive TUI
  obsi <command> [args]     Run command

${colors.bold('Vault commands')}
  ${colors.green('daily')}                 Open/create today's daily note
  ${colors.green('print')} <note>          Print note contents to terminal
  ${colors.green('search-content')} <q>    Search inside note contents

${colors.bold('Obsidian CLI commands')} ${colors.dim('(via obs)')}
  ${colors.green('open')} <note>           Open note in Obsidian
  ${colors.green('create')} <note>         Create new note
  ${colors.green('search')} <query>        Fuzzy search by filename
  ${colors.green('move')} <from> <to>      Move/rename note
  ${colors.green('delete')} <note>         Delete note

${colors.bold('AI-powered commands')} ${colors.dim('(requires Claude Code)')}
  ${colors.green('review')}                Process inbox with AI suggestions
  ${colors.green('link')} <topic>          Find related notes with AI
  ${colors.green('summarize')} <note>      AI-powered note summary

${colors.bold('Options:')}
  ${colors.dim('--help, -h')}             Show this help

${colors.bold('Examples:')}
  obsi                      Launch interactive browser
  obsi daily                Open today's daily note
  obsi search auth          Find notes matching "auth"
  obsi search-content API   Find notes containing "API"
  obsi print "My Note"      Print note to terminal
  obsi review               AI-assisted inbox processing

${colors.bold('Environment:')}
  ${colors.dim('OBSIDIAN_VAULT')}         Vault path (current: ${VAULT_PATH})
`);
}

// ============================================
// INTERACTIVE MODE
// ============================================

function launchInteractive() {
  const child = spawn('npx', ['tsx', path.join(PACKAGE_ROOT, 'src', 'index.tsx')], {
    stdio: 'inherit',
    cwd: PACKAGE_ROOT,
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

// ============================================
// MAIN
// ============================================

function main() {
  const args = process.argv.slice(2);

  // No args = interactive mode
  if (args.length === 0) {
    launchInteractive();
    return;
  }

  // Help
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }

  const cmd = args[0];
  const cmdArgs = args.slice(1);

  // Check if it's one of our commands
  if (obsiCommands[cmd]) {
    obsiCommands[cmd](cmdArgs);
    return;
  }

  // Check if it's a proxied obs command
  if (obsProxyCommands.includes(cmd)) {
    proxyToObs(args);
    return;
  }

  // Unknown command - show help
  console.error(`${colors.red('Unknown command:')} ${cmd}\n`);
  console.error(`Run ${colors.dim('obsi --help')} for usage.\n`);
  process.exit(1);
}

main();
