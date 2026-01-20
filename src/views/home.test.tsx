import { render } from "ink-testing-library";
import { describe, expect, it, vi } from "vitest";
import Home from "./home.js";

// Mock the vault utils
vi.mock("../utils/vault.js", () => ({
	getVaultStats: vi.fn().mockResolvedValue({
		inbox: 3,
		total: 25,
		daily: true,
	}),
}));

describe("Home", () => {
	it("renders the title", () => {
		const { lastFrame } = render(<Home onNavigate={() => {}} />);
		expect(lastFrame()).toContain("obsi");
	});

	it("shows all menu options", () => {
		const { lastFrame } = render(<Home onNavigate={() => {}} />);

		expect(lastFrame()).toContain("Browse vault");
		expect(lastFrame()).toContain("Quick capture");
		expect(lastFrame()).toContain("Daily note");
		expect(lastFrame()).toContain("Quit");
	});

	it("shows keyboard shortcuts", () => {
		const { lastFrame } = render(<Home onNavigate={() => {}} />);

		expect(lastFrame()).toContain("[b]");
		expect(lastFrame()).toContain("[a]");
		expect(lastFrame()).toContain("[d]");
		expect(lastFrame()).toContain("[q]");
	});

	it("navigates to browse when b is pressed", async () => {
		const onNavigate = vi.fn();
		const { stdin } = render(<Home onNavigate={onNavigate} />);

		stdin.write("b");

		expect(onNavigate).toHaveBeenCalledWith("browse");
	});

	it("navigates to capture when a is pressed", async () => {
		const onNavigate = vi.fn();
		const { stdin } = render(<Home onNavigate={onNavigate} />);

		stdin.write("a");

		expect(onNavigate).toHaveBeenCalledWith("capture");
	});

	it("navigates to daily when d is pressed", async () => {
		const onNavigate = vi.fn();
		const { stdin } = render(<Home onNavigate={onNavigate} />);

		stdin.write("d");

		expect(onNavigate).toHaveBeenCalledWith("daily");
	});
});
