/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

declare global {
  // System stats shape used by the renderer (English-only comments)
  type SystemStats = {
    os: { platform: string; release: string; arch: string };
    cpu: { percent: number | null };
    memory: { usedBytes: number; totalBytes: number; percent: number };
  };

  type FileMeta = {
    name: string;
    relativePath: string;
    absolutePath: string;
    isDirectory: boolean;
    size?: number;
  };

  interface Window {
    m2: {
      listFiles: () => Promise<FileMeta[]>;
      readFile: (relativePath: string) => Promise<string>;
      createFile: (fileName: string, content?: string) => Promise<boolean>;
    };
    system: {
      getStats: () => Promise<SystemStats>;
      getEnvVersions: () => Promise<{ java: string | null; python: string | null; mvn: string | null }>;
    };
  }
}

export {};

declare global {
  // System stats shape used by the renderer (English-only comments)
  type SystemStats = {
    os: { platform: string; release: string; arch: string };
    cpu: { percent: number | null };
    memory: { usedBytes: number; totalBytes: number; percent: number };
  };

  type FileMeta = {
    name: string;
    relativePath: string;
    absolutePath: string;
    isDirectory: boolean;
    size?: number;
  };

  interface Window {
    m2: {
      listFiles: () => Promise<FileMeta[]>;
      readFile: (relativePath: string) => Promise<string>;
    };
    system: {
      getStats: () => Promise<SystemStats>;
      getEnvVersions: () => Promise<{ java: string | null; python: string | null; mvn: string | null }>;
    };
  }
}

export {};