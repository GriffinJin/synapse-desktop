import { ipcMain } from 'electron';
import os from 'node:os';
import path from 'node:path';
import { execFile } from 'node:child_process';

// CPU snapshot cache for delta calculations (English-only comments)
let prevCpuInfo: ReturnType<typeof os.cpus> | null = null;

function cpuTotals(infos: ReturnType<typeof os.cpus>) {
  let idle = 0;
  let total = 0;
  for (const info of infos) {
    const t = info.times;
    idle += t.idle;
    total += t.user + t.nice + t.sys + t.idle + t.irq;
  }
  return { idle, total };
}

function execFileSafe(cmd: string, args: string[], timeoutMs = 3000): Promise<{ stdout: string; stderr: string } | null> {
  return new Promise((resolve) => {
    try {
      const augmentedPath = [process.env.PATH || '', '/usr/local/bin', '/opt/homebrew/bin']
        .filter(Boolean)
        .join(path.delimiter);
      execFile(cmd, args, { timeout: timeoutMs, env: { ...process.env, PATH: augmentedPath } }, (_error, stdout, stderr) => {
        resolve({ stdout, stderr });
      });
    } catch {
      resolve(null);
    }
  });
}

function parseJavaVersion(out: string) {
  const m = out.match(/version\s+"([^"]+)"/i);
  if (m && m[1]) return m[1];
  const n = out.match(/(\d+\.\d+(?:\.\d+)?)/);
  return n ? n[1] : null;
}
function parsePythonVersion(out: string) {
  const m = out.match(/Python\s+([\d.]+)/i);
  return m ? m[1] : null;
}
function parseMavenVersion(out: string) {
  const m = out.match(/Apache Maven\s+([\d.]+)/i);
  return m ? m[1] : null;
}

export function registerSystemIpc() {
  // System statistics: OS, CPU usage, memory
  ipcMain.handle('system:get-stats', async () => {
    const platform = os.platform();
    const release = os.release();
    const arch = os.arch();

    const nowInfo = os.cpus();
    let cpuPercent: number | null = null;
    if (prevCpuInfo) {
      const prev = cpuTotals(prevCpuInfo);
      const now = cpuTotals(nowInfo);
      const idleDelta = now.idle - prev.idle;
      const totalDelta = now.total - prev.total;
      cpuPercent = totalDelta > 0 ? (100 * (1 - idleDelta / totalDelta)) : null;
    }
    prevCpuInfo = nowInfo;

    const totalBytes = os.totalmem();
    const freeBytes = os.freemem();
    const usedBytes = totalBytes - freeBytes;
    const memPercent = (usedBytes / totalBytes) * 100;

    return {
      os: { platform, release, arch },
      cpu: { percent: cpuPercent },
      memory: { usedBytes, totalBytes, percent: memPercent },
    };
  });

  // Environment versions: Java, Python, Maven
  ipcMain.handle('system:get-env-versions', async () => {
    const javaRes = await execFileSafe('java', ['-version']);
    const javaOut = javaRes ? (javaRes.stderr || javaRes.stdout || '') : '';
    const java = javaOut ? parseJavaVersion(javaOut) : null;

    let python: string | null = null;
    const py3 = await execFileSafe('python3', ['--version']);
    const py3Out = py3 ? (py3.stdout || py3.stderr || '') : '';
    python = py3Out ? parsePythonVersion(py3Out) : null;
    if (!python) {
      const py = await execFileSafe('python', ['--version']);
      const pyOut = py ? (py.stdout || py.stderr || '') : '';
      python = pyOut ? parsePythonVersion(pyOut) : null;
    }

    const mvnRes = await execFileSafe('mvn', ['-v']);
    const mvnOut = mvnRes ? (mvnRes.stdout || mvnRes.stderr || '') : '';
    const mvn = mvnOut ? parseMavenVersion(mvnOut) : null;

    return { java, python, mvn };
  });
}