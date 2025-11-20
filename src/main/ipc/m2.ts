import { ipcMain } from 'electron';
import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs/promises';
import fssync from 'node:fs';
import type { FileMeta } from '../types';

// Base directory for Maven configuration (English-only comments)
const M2_CONFIG_DIR = path.join(os.homedir(), '.m2', 'config');
const DEFAULT_XML = '<?xml version="1.0" encoding="UTF-8"?>\n<configuration/>\n';

async function listRecursive(dir: string, base: string): Promise<FileMeta[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: FileMeta[] = [];
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    let realAbs: string;
    try { realAbs = await fs.realpath(abs); } catch { realAbs = abs; }
    const rel = path.relative(base, abs);
    if (entry.isDirectory()) {
      out.push({ name: entry.name, relativePath: rel, absolutePath: realAbs, isDirectory: true });
      out.push(...(await listRecursive(abs, base)));
    } else {
      const stat = await fs.stat(abs);
      out.push({ name: entry.name, relativePath: rel, absolutePath: realAbs, isDirectory: false, size: stat.size });
    }
  }
  return out;
}

export function registerM2Ipc() {
  // List files under ~/.m2/config
  ipcMain.handle('m2:list-files', async () => {
    if (!fssync.existsSync(M2_CONFIG_DIR)) return [];
    return await listRecursive(M2_CONFIG_DIR, M2_CONFIG_DIR);
  });

  // Read a specific file (relative path under ~/.m2/config) safely
  ipcMain.handle('m2:read-file', async (_event, relativePath: string) => {
    if (typeof relativePath !== 'string' || !relativePath.length) {
      throw new Error('Invalid relativePath');
    }
    const base = path.resolve(M2_CONFIG_DIR);
    const abs = path.resolve(path.join(base, relativePath));
    const isInside = abs === base || abs.startsWith(base + path.sep);
    if (!isInside) throw new Error('Access denied: outside ~/.m2/config');
    const content = await fs.readFile(abs, 'utf-8');
    return content;
  });

  // Create a new XML file safely inside ~/.m2/config
  ipcMain.handle('m2:create-file', async (_event, fileName: string, content?: string) => {
    if (typeof fileName !== 'string' || !fileName.trim()) {
      throw new Error('Invalid fileName');
    }
    const base = path.resolve(M2_CONFIG_DIR);
    await fs.mkdir(base, { recursive: true });
    let safeName = path.basename(fileName.trim());
    const safePattern = /^[a-zA-Z0-9._-]+(\.xml)?$/;
    if (!safePattern.test(safeName)) throw new Error('Invalid fileName characters');
    if (!/\.xml$/i.test(safeName)) safeName += '.xml';
    const abs = path.resolve(path.join(base, safeName));
    const isInside = abs === base || abs.startsWith(base + path.sep);
    if (!isInside) throw new Error('Access denied: outside ~/.m2/config');
    if (fssync.existsSync(abs)) throw new Error('File already exists');
    await fs.writeFile(abs, content ?? DEFAULT_XML, 'utf-8');
    return true;
  });

  // Resolve active config target of ~/.m2/config symlink
  ipcMain.handle('m2:get-active-config', async () => {
    try {
      const linkPath = path.join(os.homedir(), '.m2', 'config');
      const stat = await fs.lstat(linkPath);
      if (!stat.isSymbolicLink()) return null;
      const targetReal = await fs.realpath(linkPath);
      return targetReal;
    } catch {
      return null;
    }
  });
}