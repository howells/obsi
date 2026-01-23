import { Box, Text, useInput } from "ink";
import { useEffect, useState } from "react";
import type { View } from "../app.js";
import * as obs from "../utils/obs.js";

interface Props {
	onNavigate: (view: View) => void;
}

const menuItems = [
	{ label: "Browse vault", value: "browse", key: "b" },
	{ label: "Quick capture", value: "capture", key: "a" },
	{ label: "Help", value: "help", key: "?" },
	{ label: "Quit", value: "quit", key: "q" },
];

export default function Home({ onNavigate }: Props) {
	const [vault, setVault] = useState<{ name: string; path: string } | null>(
		null,
	);
	const [noteCount, setNoteCount] = useState(0);
	const [selected, setSelected] = useState(0);

	useEffect(() => {
		// Get vault info (fast - just parses obs output)
		const v = obs.getDefaultVault();
		setVault(v);

		// Get note count (native file system - fast)
		setNoteCount(obs.getNoteCount());
	}, []);

	useInput((input, key) => {
		// Arrow key navigation
		if (key.upArrow || input === "k") {
			setSelected((s) => (s > 0 ? s - 1 : menuItems.length - 1));
			return;
		}
		if (key.downArrow || input === "j") {
			setSelected((s) => (s < menuItems.length - 1 ? s + 1 : 0));
			return;
		}

		// Enter to activate selected item
		if (key.return) {
			const item = menuItems[selected];
			if (item.value === "quit") {
				process.exit(0);
			}
			onNavigate(item.value as View);
			return;
		}

		// Shortcut keys still work
		const item = menuItems.find((m) => m.key === input.toLowerCase());
		if (item) {
			if (item.value === "quit") {
				process.exit(0);
			}
			onNavigate(item.value as View);
		}
	});

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Text bold color="blue">
					obsi
				</Text>
				{vault && (
					<>
						<Text dimColor> · </Text>
						<Text>{vault.name}</Text>
					</>
				)}
			</Box>

			<Box flexDirection="column" marginTop={1}>
				{menuItems.map((item, i) => (
					<Box key={item.value}>
						<Text color={i === selected ? "cyan" : undefined}>
							{i === selected ? ">" : " "}
						</Text>
						<Text dimColor> [</Text>
						<Text color="cyan">{item.key}</Text>
						<Text dimColor>] </Text>
						<Text bold={i === selected}>{item.label}</Text>
					</Box>
				))}
			</Box>

			<Box marginTop={1} flexDirection="column">
				<Text dimColor>
					{noteCount > 0 ? `${noteCount} notes` : "Loading..."} · ↑↓ navigate ·
					Enter select
				</Text>
				{vault && <Text dimColor>{vault.path}</Text>}
			</Box>
		</Box>
	);
}
