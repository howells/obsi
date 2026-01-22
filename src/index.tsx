#!/usr/bin/env bun
import { spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import { appendToDaily } from "./utils/obs.js";

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

function _hasCommand(cmd: string): boolean {
	try {
		const result = spawnSync("which", [cmd], { stdio: "pipe" });
		return result.status === 0;
	} catch {
		return false;
	}
}

function dailyNote() {
	const today = new Date();
	const dateStr = today.toISOString().split("T")[0];
	const dailyDir = join(VAULT_PATH, "+Daily");
	const dailyPath = join(dailyDir, `${dateStr}.md`);

	if (!existsSync(dailyDir)) {
		mkdirSync(dailyDir, { recursive: true });
	}

	if (!existsSync(dailyPath)) {
		const content = `---
created: ${dateStr}
tags: [daily]
---

# ${dateStr}

## Tasks

- [ ]

## Notes

`;
		writeFileSync(dailyPath, content);
		console.log(`${colors.green("Created:")} ${dailyPath}`);
	}

	// Open in Obsidian using URI scheme
	const vaultName = VAULT_PATH.split("/").pop() || "Obsi";
	const relativePath = relative(VAULT_PATH, dailyPath);
	const obsidianUrl = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(relativePath)}`;
	spawnSync("open", [obsidianUrl], { stdio: "inherit" });
}

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

function parseDate(dateArg: string): Date | null {
	if (dateArg === "today") {
		return new Date();
	}
	if (dateArg === "tomorrow") {
		const d = new Date();
		d.setDate(d.getDate() + 1);
		return d;
	}
	if (dateArg === "yesterday") {
		const d = new Date();
		d.setDate(d.getDate() - 1);
		return d;
	}
	// Try to parse as YYYY-MM-DD
	if (/^\d{4}-\d{2}-\d{2}$/.test(dateArg)) {
		const d = new Date(`${dateArg}T12:00:00`);
		if (!Number.isNaN(d.getTime())) {
			return d;
		}
	}
	return null;
}

function addNote(args: string[]) {
	if (args.length === 0) {
		console.error(colors.yellow("Usage: obsi add [date] <content>"));
		console.error(
			colors.dim(
				"  date: today, tomorrow, yesterday, or YYYY-MM-DD (default: today)",
			),
		);
		process.exit(1);
	}

	let date = new Date();
	let content: string;

	// Check if first arg is a date
	const maybeDate = parseDate(args[0]);
	if (maybeDate && args.length > 1) {
		date = maybeDate;
		content = args.slice(1).join(" ");
	} else {
		content = args.join(" ");
	}

	const result = appendToDaily(date, content);
	if (result.success) {
		const dateStr = date.toISOString().split("T")[0];
		console.log(`${colors.green("Added to")} ${dateStr}: ${content}`);
	} else {
		console.error(`${colors.red("Error:")} ${result.error}`);
		process.exit(1);
	}
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
  ${colors.green("daily")}               Open/create today's daily note
  ${colors.green("add")} [date] <text>   Add text to daily note
  ${colors.green("print")} <note>        Print note contents
  ${colors.green("search")} <query>      Search inside note contents

${colors.bold("Options:")}
  ${colors.dim("--help, -h")}           Show this help

${colors.bold("Examples:")}
  obsi                    Browse vault interactively
  obsi daily              Open today's daily note
  obsi add "Call mom"     Add to today's daily note
  obsi add tomorrow "Dentist at 9am"
  obsi add 2026-01-25 "Project deadline"
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
	daily: () => dailyNote(),
	add: (args) => addNote(args),
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
