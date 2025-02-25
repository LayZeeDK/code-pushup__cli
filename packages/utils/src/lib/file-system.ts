import { type Options, bundleRequire } from 'bundle-require';
import chalk from 'chalk';
import { mkdir, readFile, readdir, stat } from 'node:fs/promises';
import { join } from 'node:path';
import { formatBytes } from './formatting';
import { logMultipleResults } from './log-results';

export async function readTextFile(path: string): Promise<string> {
  const buffer = await readFile(path);
  return buffer.toString();
}

export async function readJsonFile<T = unknown>(path: string): Promise<T> {
  const text = await readTextFile(path);
  return JSON.parse(text);
}

export async function fileExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isFile();
  } catch {
    return false;
  }
}

export async function directoryExists(path: string): Promise<boolean> {
  try {
    const stats = await stat(path);
    return stats.isDirectory();
  } catch {
    return false;
  }
}

export async function ensureDirectoryExists(baseDir: string) {
  try {
    await mkdir(baseDir, { recursive: true });
    return;
  } catch (error) {
    console.error((error as { code: string; message: string }).message);
    if ((error as { code: string }).code !== 'EEXIST') {
      throw error;
    }
  }
}

export type FileResult = readonly [string] | readonly [string, number];
export type MultipleFileResults = PromiseSettledResult<FileResult>[];

export function logMultipleFileResults(
  fileResults: MultipleFileResults,
  messagePrefix: string,
): void {
  const succeededCallback = (result: PromiseFulfilledResult<FileResult>) => {
    const [fileName, size] = result.value;
    const formattedSize = size ? ` (${chalk.gray(formatBytes(size))})` : '';
    console.info(`- ${chalk.bold(fileName)}${formattedSize}`);
  };
  const failedCallback = (result: PromiseRejectedResult) => {
    console.warn(`- ${chalk.bold(result.reason)}`);
  };

  logMultipleResults<FileResult>(
    fileResults,
    messagePrefix,
    succeededCallback,
    failedCallback,
  );
}

export class NoExportError extends Error {
  constructor(filepath: string) {
    super(`No default export found in ${filepath}`);
  }
}

export async function importEsmModule(options: Options): Promise<unknown> {
  const { mod } = await bundleRequire({
    format: 'esm',
    ...options,
  });

  if (!('default' in mod)) {
    throw new NoExportError(options.filepath);
  }

  return mod.default;
}

export function pluginWorkDir(slug: string): string {
  return join('node_modules', '.code-pushup', slug);
}
export type CrawlFileSystemOptions<T> = {
  directory: string;
  pattern?: string | RegExp;
  fileTransform?: (filePath: string) => Promise<T> | T;
};
export async function crawlFileSystem<T = string>(
  options: CrawlFileSystemOptions<T>,
): Promise<T[]> {
  const {
    directory,
    pattern,
    fileTransform = (filePath: string) => filePath as T,
  } = options;

  const files = await readdir(directory);
  const promises = files.map(async (file): Promise<T | T[]> => {
    const filePath = join(directory, file);
    const stats = await stat(filePath);

    if (stats.isDirectory()) {
      return crawlFileSystem({ directory: filePath, pattern, fileTransform });
    }
    if (stats.isFile() && (!pattern || new RegExp(pattern).test(file))) {
      return fileTransform(filePath);
    }
    return [];
  });

  const resultsNestedArray = await Promise.all(promises);
  return resultsNestedArray.flat() as T[];
}

export function findLineNumberInText(
  content: string,
  pattern: string,
): number | null {
  const lines = content.split(/\r?\n/); // Split lines, handle both Windows and UNIX line endings

  const lineNumber = lines.findIndex(line => line.includes(pattern)) + 1; // +1 because line numbers are 1-based
  return lineNumber === 0 ? null : lineNumber; // If the package isn't found, return null
}
