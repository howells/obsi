import { Box, Text, useInput } from "ink";

interface Props {
	onBack: () => void;
}

const obsCommands = [
	{ cmd: "obsi open <note>", desc: "Open in Obsidian" },
	{ cmd: "obsi create <note>", desc: "Create new note" },
	{ cmd: "obsi search <q>", desc: "Fuzzy search" },
	{ cmd: "obsi search-content <q>", desc: "Search contents" },
	{ cmd: "obsi print <note>", desc: "Print to terminal" },
	{ cmd: "obsi move <from> <to>", desc: "Move (updates links)" },
	{ cmd: "obsi delete <note>", desc: "Delete note" },
	{ cmd: "obsi fm get|set", desc: "Frontmatter" },
];

const aiCommands = [
	{ cmd: "obsi review", desc: "AI inbox processing" },
	{ cmd: "obsi link <topic>", desc: "AI find related" },
	{ cmd: "obsi summarize <note>", desc: "AI summarize" },
];

export default function Help({ onBack }: Props) {
	useInput((_, key) => {
		if (key.escape || key.return) {
			onBack();
		}
	});

	return (
		<Box flexDirection="column" gap={1}>
			<Box>
				<Text bold color="blue">
					Help
				</Text>
				<Text dimColor> · CLI Commands</Text>
			</Box>

			<Box marginTop={1}>
				<Text bold dimColor>
					Obsidian CLI
				</Text>
				<Text dimColor> (proxied to obs)</Text>
			</Box>

			<Box flexDirection="column">
				{obsCommands.map((item) => (
					<Box key={item.cmd} gap={1}>
						<Text color="cyan">{item.cmd.padEnd(26)}</Text>
						<Text dimColor>{item.desc}</Text>
					</Box>
				))}
			</Box>

			<Box marginTop={1}>
				<Text bold dimColor>
					AI-powered
				</Text>
				<Text dimColor> (requires Claude Code)</Text>
			</Box>

			<Box flexDirection="column">
				{aiCommands.map((item) => (
					<Box key={item.cmd} gap={1}>
						<Text color="green">{item.cmd.padEnd(26)}</Text>
						<Text dimColor>{item.desc}</Text>
					</Box>
				))}
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Press Esc or Enter to go back</Text>
			</Box>
		</Box>
	);
}
