#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const os = require('os');

const HOME = os.homedir();
const PACKAGE_ROOT = path.join(__dirname, '..');

const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
};

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

  // Copy essential files
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

function main() {
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

  console.log(`\n${colors.green('Done!')} Use: /obsi <what to capture>\n`);
}

main();
