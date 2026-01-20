import fs from 'fs';
import path from 'path';
import os from 'os';

export function createMockVault() {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'obsi-test-'));

  // Create vault structure
  const dirs = ['Inbox', '+Daily', 'Projects', 'Areas', 'Resources'];
  dirs.forEach(dir => {
    fs.mkdirSync(path.join(tmpDir, dir), {recursive: true});
  });

  // Create some test notes
  const notes = [
    {
      path: 'Inbox/test-note.md',
      content: `---
created: 2026-01-16
tags: [inbox]
---

# Test Note

This is a test note.`,
    },
    {
      path: 'Projects/my-project.md',
      content: `---
created: 2026-01-15
tags: [project]
---

# My Project

Project description here.`,
    },
    {
      path: '+Daily/2026-01-16.md',
      content: `---
created: 2026-01-16
tags: [daily]
---

# Thursday, January 16, 2026

## Tasks
- [ ] Test the CLI

## Notes
Testing obsi CLI.`,
    },
  ];

  notes.forEach(note => {
    const fullPath = path.join(tmpDir, note.path);
    fs.writeFileSync(fullPath, note.content);
  });

  return {
    path: tmpDir,
    cleanup: () => {
      fs.rmSync(tmpDir, {recursive: true, force: true});
    },
  };
}
