/// <reference types="@electron-forge/plugin-vite/forge-vite-env" />

declare global {
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
  }
}

export {};

declare global {
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
  }
}

export {};