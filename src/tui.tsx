import { spawnSync } from "node:child_process";
import { render } from "ink";
import App from "./app.js";

// Store command to run after exit
let postExitCommand: { cmd: string; args: string[]; cwd?: string } | null =
	null;

export function setPostExitCommand(cmd: string, args: string[], cwd?: string) {
	postExitCommand = { cmd, args, cwd };
}

export function launchTUI() {
	// Clear terminal on start
	process.stdout.write("\x1B[2J\x1B[0f");

	const { waitUntilExit } = render(<App />);

	waitUntilExit().then(() => {
		if (postExitCommand) {
			// Run the command with inherited stdio so it takes over the terminal
			spawnSync(postExitCommand.cmd, postExitCommand.args, {
				stdio: "inherit",
				cwd: postExitCommand.cwd,
			});
		}
	});
}
