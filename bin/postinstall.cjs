#!/usr/bin/env node

const { execSync } = require('child_process');

const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  blue: (s) => `\x1b[34m${s}\x1b[0m`,
  yellow: (s) => `\x1b[33m${s}\x1b[0m`,
  dim: (s) => `\x1b[2m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
};

function hasCommand(cmd) {
  try {
    execSync(`which ${cmd}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function main() {
  console.log(`\n${colors.blue('obsi')} installed successfully!\n`);

  // Check for obsidian-cli
  if (!hasCommand('obs')) {
    console.log(`${colors.yellow('!')} obsidian-cli not found.\n`);
    console.log(`  obsi wraps obsidian-cli for vault operations.`);
    console.log(`  Install it with:\n`);
    console.log(`    ${colors.dim('brew tap yakitrak/yakitrak')}`);
    console.log(`    ${colors.dim('brew install obsidian-cli')}\n`);
    console.log(`  Then set your default vault:`);
    console.log(`    ${colors.dim('obs set-default <vault-name>')}\n`);
  } else {
    console.log(`${colors.green('✓')} obsidian-cli found\n`);
  }

  // Check for Claude Code (optional)
  if (!hasCommand('claude')) {
    console.log(`${colors.dim('Note:')} Claude Code not found.`);
    console.log(`${colors.dim('AI features (review, link, summarize) require it.')}`);
    console.log(`${colors.dim('Install: npm install -g @anthropic-ai/claude-code')}\n`);
  } else {
    console.log(`${colors.green('✓')} Claude Code found (AI features enabled)\n`);
  }

  console.log(`Run ${colors.bold('obsi')} to launch the interactive TUI.`);
  console.log(`Run ${colors.bold('obsi --help')} to see all commands.\n`);
}

main();
