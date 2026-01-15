#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync, spawn } = require('child_process');
const os = require('os');

const HOME = os.homedir();
const PACKAGE_ROOT = path.join(__dirname, '..');

const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

const SYSTEM_PROMPT = `You are a note capture assistant. Your ONLY job is to save the user's content to their Obsidian vault.

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

After creating the file, output ONLY:
Created: ~/Obsi/Inbox/<filename>.md

Do not ask questions. Do not explain. Just create the note and confirm.`;

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

function createVaultInbox() {
  const inboxPath = path.join(HOME, 'Obsi', 'Inbox');
  if (!fs.existsSync(inboxPath)) {
    ensureDir(inboxPath);
    console.log(`\n${colors.green('✓')} Created ~/Obsi/Inbox/`);
  }
}

function install() {
  console.log(`\n${colors.blue('obsi')} - capture notes to Obsidian\n`);

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

  createVaultInbox();

  console.log(`\n${colors.green('Done!')} Use: obsi "what to capture"\n`);
}

function capture(content) {
  if (!hasClaudeCode()) {
    console.error(colors.yellow('Claude Code not found. Install it first:'));
    console.error('  npm install -g @anthropic-ai/claude-code\n');
    process.exit(1);
  }

  // Spawn claude with system prompt and content
  const child = spawn('claude', [
    '--system-prompt', SYSTEM_PROMPT,
    '--allowedTools', 'Write',
    '-p',
    content
  ], {
    stdio: 'inherit',
  });

  child.on('close', (code) => {
    process.exit(code || 0);
  });
}

function showHelp() {
  console.log(`
${colors.blue('obsi')} - capture notes to Obsidian

${colors.dim('Usage:')}
  obsi --install          Install for Claude Code and Cursor
  obsi "what to capture"  Capture a note via Claude Code
  obsi --help             Show this help

${colors.dim('Examples:')}
  obsi "Remember to refactor the auth module"
  obsi "API design: use REST with JWT tokens"
  obsi "Bug: login fails when password has special chars"

${colors.dim('Notes are saved to:')} ~/Obsi/Inbox/
`);
}

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

  // Everything else is content to capture
  const content = args.join(' ');
  capture(content);
}

main();
