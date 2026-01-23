#!/usr/bin/env bun
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";

const HOME = homedir();
const VAULT_PATH = process.env.OBSIDIAN_VAULT || join(HOME, "Obsi");

const colors = {
	green: (s: string) => `\x1b[32m${s}\x1b[0m`,
	blue: (s: string) => `\x1b[34m${s}\x1b[0m`,
	yellow: (s: string) => `\x1b[33m${s}\x1b[0m`,
	red: (s: string) => `\x1b[31m${s}\x1b[0m`,
	dim: (s: string) => `\x1b[2m${s}\x1b[0m`,
	bold: (s: string) => `\x1b[1m${s}\x1b[0m`,
};

function printNote(args: string[]) {
	if (args.length === 0) {
		console.error(colors.yellow("Usage: obsi print <note>"));
		process.exit(1);
	}

	const noteName = args.join(" ");
	const possiblePaths = [
		join(VAULT_PATH, noteName),
		join(VAULT_PATH, `${noteName}.md`),
	];

	const searchInDir = (dir: string, name: string): string | null => {
		if (!existsSync(dir)) return null;
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (
				entry.isFile() &&
				(entry.name === name || entry.name === `${name}.md`)
			) {
				return fullPath;
			}
			if (entry.isDirectory() && !entry.name.startsWith(".")) {
				const found = searchInDir(fullPath, name);
				if (found) return found;
			}
		}
		return null;
	};

	let notePath = possiblePaths.find((p) => existsSync(p));
	if (!notePath) {
		notePath = searchInDir(VAULT_PATH, noteName) || undefined;
	}

	if (!notePath || !existsSync(notePath)) {
		console.error(`${colors.red("Note not found:")} ${noteName}`);
		process.exit(1);
	}

	const content = readFileSync(notePath, "utf-8");
	console.log(content);
}

function searchContent(args: string[]) {
	if (args.length === 0) {
		console.error(colors.yellow("Usage: obsi search <query>"));
		process.exit(1);
	}

	const query = args.join(" ").toLowerCase();
	const results: string[] = [];

	const searchInDir = (dir: string) => {
		if (!existsSync(dir)) return;
		const entries = readdirSync(dir, { withFileTypes: true });
		for (const entry of entries) {
			const fullPath = join(dir, entry.name);
			if (entry.isFile() && entry.name.endsWith(".md")) {
				try {
					const content = readFileSync(fullPath, "utf-8");
					if (content.toLowerCase().includes(query)) {
						results.push(relative(VAULT_PATH, fullPath));
					}
				} catch {
					// Skip unreadable
				}
			}
			if (entry.isDirectory() && !entry.name.startsWith(".")) {
				searchInDir(fullPath);
			}
		}
	};

	searchInDir(VAULT_PATH);

	if (results.length === 0) {
		console.log(colors.dim("No notes found containing that text."));
	} else {
		console.log(`${colors.green("Found")} ${results.length} note(s):\n`);
		for (const r of results) {
			console.log(`  ${r}`);
		}
	}
}

function showHelp() {
	console.log(`
${colors.blue("obsi")} - Interactive Obsidian vault CLI

${colors.bold("Usage:")}
  obsi                    Launch interactive TUI
  obsi <command> [args]   Run command directly

${colors.bold("Commands:")}
  ${colors.green("print")} <note>        Print note contents
  ${colors.green("search")} <query>      Search inside note contents

${colors.bold("Options:")}
  ${colors.dim("--help, -h")}           Show this help

${colors.bold("Examples:")}
  obsi                    Browse vault interactively
  obsi search "API"       Find notes containing "API"
  obsi print "My Note"    Print note to terminal

${colors.bold("Environment:")}
  ${colors.dim("OBSIDIAN_VAULT")}       Vault path (default: ~/Obsi)
                         Current: ${VAULT_PATH}

${colors.bold("Interactive TUI:")}
  In the TUI, select a folder and press:
    ${colors.green("c")} - Open in Claude Code
    ${colors.green("y")} - Copy path
    ${colors.green("o")} - Open in Finder
`);
}

async function launchTUI() {
	// Dynamic import to avoid loading React unless needed
	const { launchTUI } = await import("./tui.js");
	launchTUI();
}

const commands: Record<string, (args: string[]) => void> = {
	print: (args) => printNote(args),
	search: (args) => searchContent(args),
};

async function main() {
	const args = process.argv.slice(2);

	if (args.length === 0) {
		await launchTUI();
		return;
	}

	if (args.includes("--help") || args.includes("-h")) {
		showHelp();
		return;
	}

	const cmd = args[0];
	const cmdArgs = args.slice(1);

	if (commands[cmd]) {
		commands[cmd](cmdArgs);
		return;
	}

	console.error(`${colors.red("Unknown command:")} ${cmd}\n`);
	console.error(`Run ${colors.dim("obsi --help")} for usage.\n`);
	process.exit(1);
}

main();
