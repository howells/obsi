import React from 'react';
import {render} from 'ink-testing-library';
import {describe, it, expect, vi, beforeEach, afterEach} from 'vitest';
import Browse from './browse.js';
import {createMockVault} from '../test/fixtures.js';
import fs from 'fs';
import path from 'path';
import os from 'os';

describe('Browse', () => {
  let mockVault: {path: string; cleanup: () => void};
  let originalConfig: string | undefined;
  const configPath = path.join(os.homedir(), '.config', 'obsi', 'config.json');

  beforeEach(() => {
    if (fs.existsSync(configPath)) {
      originalConfig = fs.readFileSync(configPath, 'utf8');
    }
    mockVault = createMockVault();
    const configDir = path.dirname(configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, {recursive: true});
    }
    fs.writeFileSync(configPath, JSON.stringify({vaultPath: mockVault.path}));
  });

  afterEach(() => {
    if (originalConfig) {
      fs.writeFileSync(configPath, originalConfig);
    }
    mockVault.cleanup();
  });

  it('renders the browse title', () => {
    const {lastFrame} = render(<Browse onBack={() => {}} />);
    expect(lastFrame()).toContain('Browse');
  });

  it('shows folders first', async () => {
    const {lastFrame} = render(<Browse onBack={() => {}} />);

    // Wait for useEffect to load items
    await new Promise(r => setTimeout(r, 50));
    const frame = lastFrame() || '';

    // Folders should be visible
    expect(frame).toContain('+Daily/');
    expect(frame).toContain('Inbox/');
    expect(frame).toContain('Projects/');
  });

  it('shows navigation hints', () => {
    const {lastFrame} = render(<Browse onBack={() => {}} />);
    expect(lastFrame()).toContain('j/k navigate');
    expect(lastFrame()).toContain('Enter/l open');
    expect(lastFrame()).toContain('h/Esc back');
  });

  it('calls onBack when escape is pressed at root', () => {
    const onBack = vi.fn();
    const {stdin} = render(<Browse onBack={onBack} />);

    stdin.write('\x1B'); // Escape key

    expect(onBack).toHaveBeenCalled();
  });

  it('navigates into folder when l is pressed', async () => {
    const {stdin, lastFrame} = render(<Browse onBack={() => {}} />);

    // Press l to enter first folder (+Daily)
    stdin.write('l');

    // Should now show the path includes +Daily
    await new Promise(r => setTimeout(r, 50));
    expect(lastFrame()).toContain('+Daily');
  });

  it('moves selection down with j', async () => {
    const {stdin, lastFrame} = render(<Browse onBack={() => {}} />);

    // Wait for items to load
    await new Promise(r => setTimeout(r, 50));

    // First item is selected, press j to move down
    stdin.write('j');

    await new Promise(r => setTimeout(r, 50));
    // Cursor indicator should be present
    const frame = lastFrame() || '';
    expect(frame).toContain('>');
    // Should show folders
    expect(frame).toContain('Inbox/');
  });
});
