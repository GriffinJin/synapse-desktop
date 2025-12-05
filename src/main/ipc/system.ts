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
function parseNodeVersion(out: string) {
  const m = out.match(/v([\d.]+)/);
  return m ? m[1] : null;
}
function parseNpmVersion(out: string) {
  const m = out.match(/([\d.]+)/);
  return m ? m[1] : null;
}
function parseGitVersion(out: string) {
  const m = out.match(/git version\s+([\d.]+)/i);
  return m ? m[1] : null;
}
function parseDockerVersion(out: string) {
  const m = out.match(/Docker version\s+([\d.]+)/i);
  return m ? m[1] : null;
}
function parseGoVersion(out: string) {
  const m = out.match(/go version go([\d.]+)/i);
  return m ? m[1] : null;
}
function parseRustVersion(out: string) {
  const m = out.match(/rustc\s+([\d.]+)/i);
  return m ? m[1] : null;
}

async function getCommandPath(cmd: string): Promise<string | null> {
  const result = await execFileSafe('which', [cmd]);
  if (result && result.stdout) {
    return result.stdout.trim();
  }
  return null;
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

  // Environment versions: Java, Python, Maven, Node, etc.
  ipcMain.handle('system:get-env-versions', async () => {
    const environments = [];

    // Java
    const javaRes = await execFileSafe('java', ['-version']);
    const javaOut = javaRes ? (javaRes.stderr || javaRes.stdout || '') : '';
    const javaVersion = javaOut ? parseJavaVersion(javaOut) : null;
    const javaPath = javaVersion ? await getCommandPath('java') : null;
    environments.push({
      name: 'Java',
      command: 'java',
      version: javaVersion,
      path: javaPath,
      installed: !!javaVersion,
      icon: 'codicon-file-code',
      color: '#f89820'
    });

    // Python
    let pythonVersion: string | null = null;
    let pythonPath: string | null = null;
    const py3 = await execFileSafe('python3', ['--version']);
    const py3Out = py3 ? (py3.stdout || py3.stderr || '') : '';
    pythonVersion = py3Out ? parsePythonVersion(py3Out) : null;
    if (pythonVersion) {
      pythonPath = await getCommandPath('python3');
    } else {
      const py = await execFileSafe('python', ['--version']);
      const pyOut = py ? (py.stdout || py.stderr || '') : '';
      pythonVersion = pyOut ? parsePythonVersion(pyOut) : null;
      if (pythonVersion) {
        pythonPath = await getCommandPath('python');
      }
    }
    environments.push({
      name: 'Python',
      command: 'python',
      version: pythonVersion,
      path: pythonPath,
      installed: !!pythonVersion,
      icon: 'codicon-snake',
      color: '#3776ab'
    });

    // Maven
    const mvnRes = await execFileSafe('mvn', ['-v']);
    const mvnOut = mvnRes ? (mvnRes.stdout || mvnRes.stderr || '') : '';
    const mvnVersion = mvnOut ? parseMavenVersion(mvnOut) : null;
    const mvnPath = mvnVersion ? await getCommandPath('mvn') : null;
    environments.push({
      name: 'Maven',
      command: 'mvn',
      version: mvnVersion,
      path: mvnPath,
      installed: !!mvnVersion,
      icon: 'codicon-package',
      color: '#c71a36'
    });

    // Node.js
    const nodeRes = await execFileSafe('node', ['--version']);
    const nodeOut = nodeRes ? (nodeRes.stdout || nodeRes.stderr || '') : '';
    const nodeVersion = nodeOut ? parseNodeVersion(nodeOut) : null;
    const nodePath = nodeVersion ? await getCommandPath('node') : null;
    environments.push({
      name: 'Node.js',
      command: 'node',
      version: nodeVersion,
      path: nodePath,
      installed: !!nodeVersion,
      icon: 'codicon-symbol-method',
      color: '#68a063'
    });

    // npm
    const npmRes = await execFileSafe('npm', ['--version']);
    const npmOut = npmRes ? (npmRes.stdout || npmRes.stderr || '') : '';
    const npmVersion = npmOut ? parseNpmVersion(npmOut) : null;
    const npmPath = npmVersion ? await getCommandPath('npm') : null;
    environments.push({
      name: 'npm',
      command: 'npm',
      version: npmVersion,
      path: npmPath,
      installed: !!npmVersion,
      icon: 'codicon-package',
      color: '#cb3837'
    });

    // Git
    const gitRes = await execFileSafe('git', ['--version']);
    const gitOut = gitRes ? (gitRes.stdout || gitRes.stderr || '') : '';
    const gitVersion = gitOut ? parseGitVersion(gitOut) : null;
    const gitPath = gitVersion ? await getCommandPath('git') : null;
    environments.push({
      name: 'Git',
      command: 'git',
      version: gitVersion,
      path: gitPath,
      installed: !!gitVersion,
      icon: 'codicon-git-commit',
      color: '#f05032'
    });

    // Docker
    const dockerRes = await execFileSafe('docker', ['--version']);
    const dockerOut = dockerRes ? (dockerRes.stdout || dockerRes.stderr || '') : '';
    const dockerVersion = dockerOut ? parseDockerVersion(dockerOut) : null;
    const dockerPath = dockerVersion ? await getCommandPath('docker') : null;
    environments.push({
      name: 'Docker',
      command: 'docker',
      version: dockerVersion,
      path: dockerPath,
      installed: !!dockerVersion,
      icon: 'codicon-server',
      color: '#2496ed'
    });

    // Go
    const goRes = await execFileSafe('go', ['version']);
    const goOut = goRes ? (goRes.stdout || goRes.stderr || '') : '';
    const goVersion = goOut ? parseGoVersion(goOut) : null;
    const goPath = goVersion ? await getCommandPath('go') : null;
    environments.push({
      name: 'Go',
      command: 'go',
      version: goVersion,
      path: goPath,
      installed: !!goVersion,
      icon: 'codicon-symbol-interface',
      color: '#00add8'
    });

    // Rust
    const rustRes = await execFileSafe('rustc', ['--version']);
    const rustOut = rustRes ? (rustRes.stdout || rustRes.stderr || '') : '';
    const rustVersion = rustOut ? parseRustVersion(rustOut) : null;
    const rustPath = rustVersion ? await getCommandPath('rustc') : null;
    environments.push({
      name: 'Rust',
      command: 'rustc',
      version: rustVersion,
      path: rustPath,
      installed: !!rustVersion,
      icon: 'codicon-symbol-struct',
      color: '#ce422b'
    });

    return environments;
  });
}