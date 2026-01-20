import { TextInput } from "@inkjs/ui";
import { Box, Text, useInput } from "ink";
import { useState } from "react";
import * as obs from "../utils/obs.js";

interface Props {
	onBack: () => void;
}

export default function Capture({ onBack }: Props) {
	const [_content, setContent] = useState("");
	const [status, setStatus] = useState<"input" | "saved" | "error">("input");
	const [message, setMessage] = useState("");

	useInput((_, key) => {
		if (key.escape) {
			onBack();
		}
	});

	const handleSubmit = (value: string) => {
		if (!value.trim()) {
			onBack();
			return;
		}

		// Create note title from content
		const title = value.slice(0, 50).trim();

		// Create the note content with frontmatter
		const now = new Date();
		const noteContent = `---
created: ${now.toISOString().split("T")[0]}
tags: [inbox]
source: obsi cli
---

# ${title}

${value}`;

		// Use obs create with folder option for Inbox
		const result = obs.create(title, noteContent, { folder: "Inbox" });

		if (result.success) {
			setMessage(`Created: ${title}`);
			setStatus("saved");
			setTimeout(() => onBack(), 1500);
		} else {
			setMessage(result.error || "Failed to create note");
			setStatus("error");
		}
	};

	if (status === "saved") {
		return (
			<Box flexDirection="column" gap={1}>
				<Box gap={1}>
					<Text color="green">✓</Text>
					<Text>Saved to Inbox</Text>
				</Box>
				<Text dimColor>{message}</Text>
			</Box>
		);
	}

	if (status === "error") {
		return (
			<Box flexDirection="column" gap={1}>
				<Box gap={1}>
					<Text color="red">✗</Text>
					<Text>Failed to save</Text>
				</Box>
				<Text dimColor>{message}</Text>
				<Box marginTop={1}>
					<Text dimColor>Press Esc to go back</Text>
				</Box>
			</Box>
		);
	}

	return (
		<Box flexDirection="column" gap={1}>
			<Box gap={1}>
				<Text bold color="blue">
					Quick Capture
				</Text>
				<Text dimColor>· to Inbox</Text>
			</Box>

			<Box gap={1}>
				<Text color="cyan">{">"}</Text>
				<TextInput
					placeholder="What's on your mind?"
					onChange={setContent}
					onSubmit={handleSubmit}
				/>
			</Box>

			<Box marginTop={1}>
				<Text dimColor>Enter to save · Esc to cancel</Text>
			</Box>
		</Box>
	);
}
