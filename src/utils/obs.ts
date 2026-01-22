import { execSync, spawnSync } from "node:child_process";
import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "node:fs";
import { homedir } from "node:os";
import { join, relative } from "node:path";
import Fuse from "fuse.js";

// Vault path from env or default
const VAULT_PATH = process.env.OBSIDIAN_VAULT || join(homedir(), "Obsi");

// Check if obsidian-cli is installed
export function isObsInstalled(): boolean {
	try {
		execSync("which obs", { stdio: "ignore" });
		return true;
	} catch {
		return false;
	}
}

export function getInstallInstructions(): string {
	return `obsidian-cli not found. Install it:

  brew tap yakitrak/yakitrak
  brew install obsidian-cli

Then set your default vault:
  obs set-default <vault-name>`;
}

// Run obs command and return output
function run(args: string[]): {
	success: boolean;
	output: string;
	error: string;
} {
	const result = spawnSync("obs", args, { encoding: "utf8" });
	return {
		success: result.status === 0,
		output: result.stdout?.trim() || "",
		error: result.stderr?.trim() || "",
	};
}

// Get vault path
export function getVaultPath(): string {
	return VAULT_PATH;
}

// Get default vault info
export function getDefaultVault(): { name: string; path: string } | null {
	const result = run(["print-default"]);
	if (!result.success) return null;

	// Parse output: "Default vault name:  Obsi\nDefault vault path:  /path/to/vault"
	const lines = result.output.split("\n");
	const nameLine = lines.find((l) => l.includes("vault name"));
	const pathLine = lines.find((l) => l.includes("vault path"));

	const name = nameLine?.split(":").slice(1).join(":").trim() || "";
	const path = pathLine?.split(":").slice(1).join(":").trim() || "";

	return name && path ? { name, path } : null;
}

// Get all items in the vault (folders and files)
export function getAllItems(): { path: string; isFolder: boolean }[] {
	const results: { path: string; isFolder: boolean }[] = [];

	function searchDir(dir: string) {
		if (!existsSync(dir)) return;
		try {
			const entries = readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.name.startsWith(".")) continue;
				const fullPath = join(dir, entry.name);
				const relativePath = relative(VAULT_PATH, fullPath);

				if (entry.isDirectory()) {
					results.push({ path: relativePath, isFolder: true });
					searchDir(fullPath);
				} else if (entry.isFile() && entry.name.endsWith(".md")) {
					results.push({ path: relativePath, isFolder: false });
				}
			}
		} catch {
			// Skip unreadable directories
		}
	}

	searchDir(VAULT_PATH);
	return results;
}

// Get all notes (files only) - for backwards compatibility
export function getAllNotes(): string[] {
	return getAllItems()
		.filter((i) => !i.isFolder)
		.map((i) => i.path);
}

// Fuzzy search with metadata - folders sorted to top
export function searchWithMeta(
	query: string,
): { path: string; isFolder: boolean }[] {
	const allItems = getAllItems();

	if (!query.trim()) {
		// No query - return files only (too many folders otherwise)
		return allItems.filter((i) => !i.isFolder).slice(0, 50);
	}

	const fuse = new Fuse(allItems, {
		keys: ["path"],
		threshold: 0.4,
		ignoreLocation: true,
		includeScore: true,
	});

	const results = fuse.search(query);

	// Sort: folders first, then by score
	results.sort((a, b) => {
		const aIsFolder = a.item.isFolder;
		const bIsFolder = b.item.isFolder;
		if (aIsFolder && !bIsFolder) return -1;
		if (!aIsFolder && bIsFolder) return 1;
		return (a.score ?? 0) - (b.score ?? 0);
	});

	return results.map((r) => r.item);
}

// Fuzzy search - returns paths only (backwards compatible)
export function search(query: string): string[] {
	return searchWithMeta(query).map((r) => r.path);
}

// Search note contents (native implementation)
export function searchContent(query: string): string[] {
	const results: string[] = [];
	const queryLower = query.toLowerCase();

	function searchDir(dir: string) {
		if (!existsSync(dir)) return;
		try {
			const entries = readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.name.startsWith(".")) continue;
				const fullPath = join(dir, entry.name);

				if (entry.isFile() && entry.name.endsWith(".md")) {
					try {
						const content = readFileSync(fullPath, "utf-8");
						if (content.toLowerCase().includes(queryLower)) {
							results.push(relative(VAULT_PATH, fullPath));
						}
					} catch {
						// Skip unreadable files
					}
				} else if (entry.isDirectory()) {
					searchDir(fullPath);
				}
			}
		} catch {
			// Skip unreadable directories
		}
	}

	searchDir(VAULT_PATH);
	return results;
}

// Print note contents (native implementation)
export function print(noteName: string): string {
	// Try direct path first
	const paths = [
		join(VAULT_PATH, noteName),
		join(VAULT_PATH, `${noteName}.md`),
	];

	for (const p of paths) {
		if (existsSync(p)) {
			return readFileSync(p, "utf-8");
		}
	}

	// Search for the note
	const found = search(noteName).find(
		(n) =>
			n === noteName ||
			n === `${noteName}.md` ||
			n.endsWith(`/${noteName}`) ||
			n.endsWith(`/${noteName}.md`),
	);

	if (found) {
		return readFileSync(join(VAULT_PATH, found), "utf-8");
	}

	return "";
}

// Create a new note (native implementation)
export function create(
	name: string,
	content: string,
	options?: { folder?: string; overwrite?: boolean; open?: boolean },
): { success: boolean; error: string } {
	try {
		const folder = options?.folder || "Inbox";
		const dir = join(VAULT_PATH, folder);

		if (!existsSync(dir)) {
			mkdirSync(dir, { recursive: true });
		}

		const filename = name.endsWith(".md") ? name : `${name}.md`;
		const filePath = join(dir, filename);

		if (existsSync(filePath) && !options?.overwrite) {
			return { success: false, error: "Note already exists" };
		}

		writeFileSync(filePath, content);

		if (options?.open) {
			open(join(folder, filename.replace(".md", "")));
		}

		return { success: true, error: "" };
	} catch (e) {
		return { success: false, error: String(e) };
	}
}

// Resolve item path (file or folder)
function resolvePath(itemName: string): string {
	// Try direct path first
	const directPath = join(VAULT_PATH, itemName);
	if (existsSync(directPath)) {
		return directPath;
	}

	// Try with .md extension
	const mdPath = join(VAULT_PATH, `${itemName}.md`);
	if (existsSync(mdPath)) {
		return mdPath;
	}

	return "";
}

// Escape path for shell use
function shellEscape(path: string): string {
	// Escape spaces and other special shell characters with backslashes
	return path.replace(/([\\$`"!\s'()&;|<>*?[\]#~%])/g, "\\$1");
}

// Copy note path to clipboard (shell-escaped for cd)
export function copyPath(noteName: string): {
	success: boolean;
	path: string;
	error: string;
} {
	const fullPath = resolvePath(noteName);

	if (!fullPath || !existsSync(fullPath)) {
		return { success: false, path: "", error: `Note not found: ${noteName}` };
	}

	// Shell-escape the path so it can be pasted directly into cd
	const escapedPath = shellEscape(fullPath);

	// Copy to clipboard (macOS: pbcopy, Linux: xclip)
	const cmd = process.platform === "darwin" ? "pbcopy" : "xclip";
	const args = process.platform === "darwin" ? [] : ["-selection", "clipboard"];
	const result = spawnSync(cmd, args, { input: escapedPath, encoding: "utf8" });

	return {
		success: result.status === 0,
		path: escapedPath,
		error: result.stderr?.trim() || "",
	};
}

// Get vault name from path
function getVaultName(): string {
	return VAULT_PATH.split("/").pop() || "Obsi";
}

// Open note in Obsidian using URI scheme
export function open(noteName: string): { success: boolean; error: string } {
	const fullPath = resolvePath(noteName);

	if (!fullPath || !existsSync(fullPath)) {
		return { success: false, error: `Note not found: ${noteName}` };
	}

	const stat = statSync(fullPath);
	if (stat.isDirectory()) {
		// For folders, open in Finder/file manager
		const cmd = process.platform === "darwin" ? "open" : "xdg-open";
		const result = spawnSync(cmd, [fullPath], { encoding: "utf8" });
		return { success: result.status === 0, error: result.stderr?.trim() || "" };
	}

	// For files, use Obsidian URI scheme
	const vaultName = getVaultName();
	const relativePath = relative(VAULT_PATH, fullPath);
	const obsidianUrl = `obsidian://open?vault=${encodeURIComponent(vaultName)}&file=${encodeURIComponent(relativePath)}`;

	const result = spawnSync("open", [obsidianUrl], { encoding: "utf8" });
	return { success: result.status === 0, error: result.stderr?.trim() || "" };
}

// Open folder in Claude Code - returns the path to open, caller should exit app
export function openInClaude(itemName: string): {
	success: boolean;
	path: string;
	error: string;
} {
	const fullPath = resolvePath(itemName);

	if (!fullPath || !existsSync(fullPath)) {
		return { success: false, path: "", error: `Item not found: ${itemName}` };
	}

	// Get the directory path (if it's a file, use its parent directory)
	const stat = statSync(fullPath);
	const dirPath = stat.isDirectory() ? fullPath : join(fullPath, "..");

	return { success: true, path: dirPath, error: "" };
}

// Open/create daily note (native implementation)
export function daily(options?: { open?: boolean }): {
	success: boolean;
	path: string;
	error: string;
} {
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
	}

	if (options?.open) {
		open(`+Daily/${dateStr}`);
	}

	return { success: true, path: dailyPath, error: "" };
}

// Get daily note path for a specific date
export function getDailyPath(date: Date): string {
	const dateStr = date.toISOString().split("T")[0];
	return join(VAULT_PATH, "+Daily", `${dateStr}.md`);
}

// List all daily notes (sorted newest first)
export function listDailyNotes(): string[] {
	const dailyDir = join(VAULT_PATH, "+Daily");
	if (!existsSync(dailyDir)) return [];

	try {
		const entries = readdirSync(dailyDir, { withFileTypes: true });
		return entries
			.filter((e) => e.isFile() && e.name.endsWith(".md"))
			.map((e) => e.name.replace(".md", ""))
			.filter((name) => /^\d{4}-\d{2}-\d{2}$/.test(name))
			.sort((a, b) => b.localeCompare(a)); // Newest first
	} catch {
		return [];
	}
}

// Ensure daily note exists for a specific date
export function ensureDaily(date: Date): {
	success: boolean;
	path: string;
	error: string;
} {
	const dateStr = date.toISOString().split("T")[0];
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
	}

	return { success: true, path: dailyPath, error: "" };
}

// Append a task to a daily note's Tasks section
export function appendToDaily(
	date: Date,
	content: string,
): { success: boolean; path: string; error: string } {
	const result = ensureDaily(date);
	if (!result.success) {
		return result;
	}

	try {
		const existing = readFileSync(result.path, "utf-8");

		// Find the ## Tasks section and append there
		const tasksMatch = existing.match(/^## Tasks\s*$/m);
		let updated: string;

		if (tasksMatch && tasksMatch.index !== undefined) {
			// Find the end of the Tasks section (next ## or end of file)
			const afterTasks = existing.slice(
				tasksMatch.index + tasksMatch[0].length,
			);
			const nextSectionMatch = afterTasks.match(/^## /m);

			if (nextSectionMatch && nextSectionMatch.index !== undefined) {
				// Insert before the next section
				const insertPos =
					tasksMatch.index + tasksMatch[0].length + nextSectionMatch.index;
				const before = existing.slice(0, insertPos).trimEnd();
				const after = existing.slice(insertPos);
				updated = `${before}\n- [ ] ${content}\n\n${after}`;
			} else {
				// No next section, append at end of file
				updated = `${existing.trimEnd()}\n- [ ] ${content}\n`;
			}
		} else {
			// No Tasks section, create one
			updated = `${existing.trimEnd()}\n\n## Tasks\n\n- [ ] ${content}\n`;
		}

		writeFileSync(result.path, updated);
		return { success: true, path: result.path, error: "" };
	} catch (e) {
		return { success: false, path: result.path, error: String(e) };
	}
}

// Move/rename note (uses obs for link updating)
export function move(
	from: string,
	to: string,
): { success: boolean; error: string } {
	const result = run(["move", from, to]);
	return { success: result.success, error: result.error };
}

// Delete note (uses obs)
export function deleteNote(name: string): { success: boolean; error: string } {
	const result = run(["delete", name]);
	return { success: result.success, error: result.error };
}

// Get note count (fast)
export function getNoteCount(): number {
	let count = 0;

	function countDir(dir: string) {
		if (!existsSync(dir)) return;
		try {
			const entries = readdirSync(dir, { withFileTypes: true });
			for (const entry of entries) {
				if (entry.name.startsWith(".")) continue;
				const fullPath = join(dir, entry.name);

				if (entry.isFile() && entry.name.endsWith(".md")) {
					count++;
				} else if (entry.isDirectory()) {
					countDir(fullPath);
				}
			}
		} catch {
			// Skip unreadable directories
		}
	}

	countDir(VAULT_PATH);
	return count;
}
