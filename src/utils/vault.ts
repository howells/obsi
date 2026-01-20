import fs from 'fs';
import path from 'path';
import os from 'os';

const HOME = os.homedir();
const CONFIG_PATH = path.join(HOME, '.config', 'obsi', 'config.json');

interface Config {
  vaultPath: string;
}

export function loadConfig(): Config {
  const defaultConfig: Config = {
    vaultPath: path.join(HOME, 'Obsi'),
  };

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      return {...defaultConfig, ...data};
    }
  } catch {
    // Ignore
  }
  return defaultConfig;
}

export function getVaultPath(): string {
  return loadConfig().vaultPath;
}

export async function getVaultStats(): Promise<{inbox: number; total: number; daily: boolean}> {
  const vaultPath = getVaultPath();
  let inbox = 0;
  let total = 0;
  let daily = false;

  try {
    const inboxPath = path.join(vaultPath, 'Inbox');
    if (fs.existsSync(inboxPath)) {
      const files = fs.readdirSync(inboxPath).filter(f => f.endsWith('.md'));
      inbox = files.length;
    }

    const today = new Date().toISOString().split('T')[0];
    const dailyPath = path.join(vaultPath, '+Daily', `${today}.md`);
    daily = fs.existsSync(dailyPath);

    // Count total notes recursively
    const countNotes = (dir: string): number => {
      if (!fs.existsSync(dir)) return 0;
      let count = 0;
      const entries = fs.readdirSync(dir, {withFileTypes: true});
      for (const entry of entries) {
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          count += countNotes(path.join(dir, entry.name));
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          count++;
        }
      }
      return count;
    };

    total = countNotes(vaultPath);
  } catch {
    // Ignore errors
  }

  return {inbox, total, daily};
}

export interface Note {
  name: string;
  path: string;
  relativePath: string;
  modified: Date;
}

export async function searchNotes(query: string): Promise<Note[]> {
  const vaultPath = getVaultPath();
  const notes: Note[] = [];
  const lowerQuery = query.toLowerCase();

  const scanDir = (dir: string, relative: string = '') => {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, {withFileTypes: true});

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      const relPath = path.join(relative, entry.name);

      if (entry.isDirectory() && !entry.name.startsWith('.')) {
        scanDir(fullPath, relPath);
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        const name = entry.name.replace(/\.md$/, '');
        if (!query || name.toLowerCase().includes(lowerQuery) || relPath.toLowerCase().includes(lowerQuery)) {
          const stat = fs.statSync(fullPath);
          notes.push({
            name,
            path: fullPath,
            relativePath: relPath,
            modified: stat.mtime,
          });
        }
      }
    }
  };

  scanDir(vaultPath);

  // Sort by modified date (newest first), limit results
  return notes
    .sort((a, b) => b.modified.getTime() - a.modified.getTime())
    .slice(0, 50);
}

export function readNote(notePath: string): string {
  try {
    return fs.readFileSync(notePath, 'utf8');
  } catch {
    return '';
  }
}

export function getRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w`;
  return `${Math.floor(diffDays / 30)}mo`;
}
