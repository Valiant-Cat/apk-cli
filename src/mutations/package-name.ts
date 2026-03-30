import { readdir, readFile, writeFile } from 'node:fs/promises';
import { join, relative, sep } from 'node:path';
import { buildResourceIndex, readDecodedManifest } from '../package/resource-index.js';
import type { MutationReport } from './apply.js';

export type PackageNameMutationInput = {
  decodedDir: string;
  nextPackageName: string;
};

export type PackageNameMutationReport = MutationReport & {
  risks: string[];
};

function toRelativePath(decodedDir: string, filePath: string): string {
  return relative(decodedDir, filePath).split(sep).join('/');
}

async function listFiles(rootDir: string): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await listFiles(entryPath));
      continue;
    }

    if (entry.isFile()) {
      files.push(entryPath);
    }
  }

  return files;
}

export async function applyPackageNameMutation(
  input: PackageNameMutationInput
): Promise<PackageNameMutationReport> {
  const resourceIndex = await buildResourceIndex(input.decodedDir);
  const currentPackageName = resourceIndex.packageName;

  if (!currentPackageName || currentPackageName === input.nextPackageName) {
    return {
      changedFiles: [],
      risks: []
    };
  }

  const manifestPath = join(input.decodedDir, 'AndroidManifest.xml');
  const manifestOriginal = await readDecodedManifest(input.decodedDir);
  const manifestUpdated = manifestOriginal.replaceAll(currentPackageName, input.nextPackageName);

  if (manifestUpdated !== manifestOriginal) {
    await writeFile(manifestPath, manifestUpdated, 'utf8');
  }

  const risks: string[] = [];

  for (const filePath of await listFiles(input.decodedDir)) {
    if (filePath === manifestPath) {
      continue;
    }

    try {
      const content = await readFile(filePath, 'utf8');

      if (content.includes(currentPackageName)) {
        risks.push(`unresolved reference: ${toRelativePath(input.decodedDir, filePath)}`);
      }
    } catch {
      // ignore files that cannot be interpreted as text
    }
  }

  return {
    changedFiles: manifestUpdated === manifestOriginal ? [] : ['AndroidManifest.xml'],
    risks
  };
}
