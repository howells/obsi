import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createMockVault } from "../test/fixtures.js";
import { getRelativeTime, readNote, searchNotes } from "./vault.js";

describe("vault utilities", () => {
	let mockVault: { path: string; cleanup: () => void };
	let originalConfig: string | undefined;
	const configPath = path.join(os.homedir(), ".config", "obsi", "config.json");

	beforeEach(() => {
		// Save original config if exists
		if (fs.existsSync(configPath)) {
			originalConfig = fs.readFileSync(configPath, "utf8");
		}

		// Create mock vault
		mockVault = createMockVault();

		// Point config to mock vault
		const configDir = path.dirname(configPath);
		if (!fs.existsSync(configDir)) {
			fs.mkdirSync(configDir, { recursive: true });
		}
		fs.writeFileSync(configPath, JSON.stringify({ vaultPath: mockVault.path }));
	});

	afterEach(() => {
		// Restore original config
		if (originalConfig) {
			fs.writeFileSync(configPath, originalConfig);
		}
		mockVault.cleanup();
	});

	describe("searchNotes", () => {
		it("returns all notes when query is empty", async () => {
			const notes = await searchNotes("");
			expect(notes.length).toBe(3);
		});

		it("filters notes by name", async () => {
			const notes = await searchNotes("test");
			expect(notes.length).toBe(1);
			expect(notes[0].name).toBe("test-note");
		});

		it("filters notes by path", async () => {
			const notes = await searchNotes("project");
			expect(notes.some((n) => n.name === "my-project")).toBe(true);
		});

		it("returns notes sorted by modified date", async () => {
			const notes = await searchNotes("");
			// Most recently modified should be first
			const times = notes.map((n) => n.modified.getTime());
			expect(times).toEqual([...times].sort((a, b) => b - a));
		});
	});

	describe("readNote", () => {
		it("reads note content", () => {
			const notePath = path.join(mockVault.path, "Inbox", "test-note.md");
			const content = readNote(notePath);

			expect(content).toContain("# Test Note");
			expect(content).toContain("This is a test note");
		});

		it("returns empty string for non-existent file", () => {
			const content = readNote("/non/existent/path.md");
			expect(content).toBe("");
		});
	});

	describe("getRelativeTime", () => {
		it('returns "now" for very recent dates', () => {
			const now = new Date();
			expect(getRelativeTime(now)).toBe("now");
		});

		it("returns minutes for recent dates", () => {
			const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
			expect(getRelativeTime(fiveMinutesAgo)).toBe("5m");
		});

		it("returns hours for same-day dates", () => {
			const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);
			expect(getRelativeTime(threeHoursAgo)).toBe("3h");
		});

		it("returns days for recent dates", () => {
			const twoDaysAgo = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
			expect(getRelativeTime(twoDaysAgo)).toBe("2d");
		});

		it("returns weeks for older dates", () => {
			const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
			expect(getRelativeTime(twoWeeksAgo)).toBe("2w");
		});
	});
});
