import {vi} from 'vitest';

// Mock child_process execSync to prevent actually opening files
vi.mock('child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(() => ({
    on: vi.fn(),
  })),
}));
