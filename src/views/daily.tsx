import { spawn } from "node:child_process";
import { Spinner, TextInput } from "@inkjs/ui";
import { Box, Text, useInput } from "ink";
import { useCallback, useEffect, useState } from "react";
import * as obs from "../utils/obs.js";

interface Props {
	onBack: () => void;
}

type Mode = "menu" | "amend" | "processing" | "list";

const menuItems = [
	{ label: "Amend with Claude", key: "a" },
	{ label: "View in Obsidian", key: "v" },
	{ label: "All daily notes", key: "l" },
	{ label: "Back", key: "escape" },
];

export default function Daily({ onBack }: Props) {
	const [status, setStatus] = useState<"loading" | "ready">("loading");
	const [preview, setPreview] = useState("");
	const [mode, setMode] = useState<Mode>("menu");
	const [selected, setSelected] = useState(0);
	const [dailyNotes, setDailyNotes] = useState<string[]>([]);
	const [listSelected, setListSelected] = useState(0);

	const dateStr = new Date().toISOString().split("T")[0];

	const refreshPreview = useCallback(() => {
		const content = obs.print(`+Daily/${dateStr}`);
		if (content) {
			const lines = content.split("\n").slice(0, 15);
			setPreview(lines.join("\n"));
		}
	}, [dateStr]);

	useEffect(() => {
		obs.daily();
		refreshPreview();
		setStatus("ready");
	}, [refreshPreview]);

	const runClaude = (prompt: string) => {
		setMode("processing");

		const vaultPath = obs.getVaultPath();
		const notePath = `${vaultPath}/+Daily/${dateStr}.md`;

		const systemPrompt = `You are a daily note assistant. The user's daily note is at: ${notePath}

Read the note, make the requested changes, and confirm what you did. Be concise.`;

		const child = spawn(
			"claude",
			[
				"--system-prompt",
				systemPrompt,
				"--allowedTools",
				"Read,Edit",
				"-p",
				prompt,
			],
			{
				stdio: "inherit",
			},
		);

		child.on("close", () => {
			refreshPreview();
			setMode("menu");
		});
	};

	useInput((input, key) => {
		if (mode === "processing") return;

		if (mode === "amend") {
			if (key.escape) {
				setMode("menu");
			}
			return;
		}

		if (mode === "list") {
			if (key.escape) {
				setMode("menu");
				return;
			}
			if (key.upArrow || input === "k") {
				setListSelected((s) => Math.max(0, s - 1));
				return;
			}
			if (key.downArrow || input === "j") {
				setListSelected((s) => Math.min(dailyNotes.length - 1, s + 1));
				return;
			}
			if (key.return) {
				const selectedDate = dailyNotes[listSelected];
				if (selectedDate) {
					obs.open(`+Daily/${selectedDate}`);
				}
				return;
			}
			return;
		}

		if (key.escape) {
			onBack();
			return;
		}

		if (key.upArrow || input === "k") {
			setSelected((s) => (s > 0 ? s - 1 : menuItems.length - 1));
			return;
		}
		if (key.downArrow || input === "j") {
			setSelected((s) => (s < menuItems.length - 1 ? s + 1 : 0));
			return;
		}

		if (key.return) {
			handleAction(menuItems[selected].key);
			return;
		}

		if (input === "v") handleAction("v");
		if (input === "a") handleAction("a");
		if (input === "l") handleAction("l");
	});

	const handleAction = (action: string) => {
		if (action === "v") {
			obs.daily({ open: true });
		} else if (action === "a") {
			setMode("amend");
		} else if (action === "l") {
			const notes = obs.listDailyNotes();
			setDailyNotes(notes);
			setListSelected(0);
			setMode("list");
		} else if (action === "escape") {
			onBack();
		}
	};

	const handleAmendSubmit = (value: string) => {
		if (!value.trim()) {
			setMode("menu");
			return;
		}
		runClaude(value);
	};

	if (status === "loading") {
		return <Spinner label="Loading..." />;
	}

	if (mode === "processing") {
		return (
			<Box flexDirection="column" gap={1}>
				<Box gap={1}>
					<Text bold color="blue">
						Daily
					</Text>
					<Text dimColor>· {dateStr}</Text>
				</Box>
				<Spinner label="Claude is working..." />
			</Box>
		);
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Box gap={1}>
				<Text bold color="blue">
					Daily
				</Text>
				<Text dimColor>· {dateStr}</Text>
			</Box>

			{preview && (
				<Box
					flexDirection="column"
					borderStyle="single"
					borderColor="gray"
					paddingX={1}
					paddingY={1}
				>
					{preview.split("\n").map((line, i) => (
						<Text
							key={`line-${i}`}
							dimColor={
								line.startsWith("---") ||
								line.startsWith("tags:") ||
								line.startsWith("created:")
							}
						>
							{line || " "}
						</Text>
					))}
				</Box>
			)}

			{mode === "menu" && (
				<Box flexDirection="column" marginTop={1}>
					{menuItems.map((item, i) => (
						<Box key={item.key}>
							<Text color={i === selected ? "cyan" : undefined}>
								{i === selected ? ">" : " "}
							</Text>
							<Text dimColor> [</Text>
							<Text color="cyan">
								{item.key === "escape" ? "esc" : item.key}
							</Text>
							<Text dimColor>] </Text>
							<Text bold={i === selected}>{item.label}</Text>
						</Box>
					))}
				</Box>
			)}

			{mode === "amend" && (
				<Box flexDirection="column" marginTop={1}>
					<Box gap={1}>
						<Text color="cyan">{">"}</Text>
						<TextInput
							placeholder="e.g., add a task to call mom, remove completed items..."
							onSubmit={handleAmendSubmit}
						/>
					</Box>
					<Text dimColor>Enter to send · Esc cancel</Text>
				</Box>
			)}

			{mode === "list" && (
				<Box flexDirection="column" marginTop={1}>
					<Text bold>All Daily Notes ({dailyNotes.length})</Text>
					<Box flexDirection="column" marginTop={1}>
						{dailyNotes.slice(0, 15).map((date, i) => (
							<Box key={date}>
								<Text color={i === listSelected ? "cyan" : undefined}>
									{i === listSelected ? ">" : " "}
								</Text>
								<Text bold={i === listSelected}> {date}</Text>
							</Box>
						))}
						{dailyNotes.length > 15 && (
							<Text dimColor> ... {dailyNotes.length - 15} more</Text>
						)}
					</Box>
					<Box marginTop={1}>
						<Text dimColor>↑↓ navigate · Enter open · Esc back</Text>
					</Box>
				</Box>
			)}
		</Box>
	);
}
