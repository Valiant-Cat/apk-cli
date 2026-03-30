import { copyFile, readdir, readFile } from 'node:fs/promises';
import { basename, extname, join, relative, sep } from 'node:path';
import { buildResourceIndex, collectXmlResourceRefs } from '../package/resource-index.js';

export type IconMutationInput = {
  decodedDir: string;
  iconPath: string;
};

export type IconMutationReport = {
  changedFiles: string[];
  replacedResources: string[];
};

type LauncherIconRefs = {
  rasterTargets: string[];
  adaptiveTargets: string[];
  resourceNames: string[];
};

type ResourceRef = {
  type: string;
  name: string;
};

function parseResourceRef(value: string): ResourceRef | undefined {
  const match = value.match(/^@([^/]+)\/(.+)$/);

  if (!match) {
    return undefined;
  }

  return {
    type: match[1],
    name: match[2]
  };
}

function toRelativePath(decodedDir: string, filePath: string): string {
  return relative(decodedDir, filePath).split(sep).join('/');
}

async function collectResourceFiles(decodedDir: string, ref: string): Promise<string[]> {
  const parsed = parseResourceRef(ref);
  if (!parsed) {
    return [];
  }

  const resDir = join(decodedDir, 'res');
  const entries = await readdir(resDir, { withFileTypes: true }).catch(() => []);
  const matches: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    if (!(entry.name === parsed.type || entry.name.startsWith(`${parsed.type}-`))) {
      continue;
    }

    const directoryPath = join(resDir, entry.name);
    const files = await readdir(directoryPath, { withFileTypes: true }).catch(() => []);

    for (const file of files) {
      if (!file.isFile()) {
        continue;
      }

      if (basename(file.name, extname(file.name)) === parsed.name) {
        matches.push(join(directoryPath, file.name));
      }
    }
  }

  return matches;
}

function isRasterTarget(filePath: string): boolean {
  return extname(filePath).toLowerCase() !== '.xml';
}

async function collectAdaptiveLayerRefs(adaptiveIconPath: string): Promise<string[]> {
  const xml = await readFile(adaptiveIconPath, 'utf8');
  return collectXmlResourceRefs(xml, ['android:drawable']);
}

async function collectLauncherIconRefs(decodedDir: string): Promise<LauncherIconRefs> {
  const resourceIndex = await buildResourceIndex(decodedDir);
  const rasterTargets = new Set<string>();
  const adaptiveTargets = new Set<string>();
  const resourceNames = new Set<string>(resourceIndex.iconRefs);

  for (const iconRef of resourceIndex.iconRefs) {
    const files = await collectResourceFiles(decodedDir, iconRef);

    for (const filePath of files) {
      if (extname(filePath).toLowerCase() === '.xml') {
        adaptiveTargets.add(filePath);
        resourceNames.add(`@mipmap-anydpi-v26/${basename(filePath, '.xml')}`);

        for (const layerRef of await collectAdaptiveLayerRefs(filePath)) {
          resourceNames.add(layerRef);

          for (const layerFile of await collectResourceFiles(decodedDir, layerRef)) {
            if (isRasterTarget(layerFile)) {
              rasterTargets.add(layerFile);
            }
          }
        }

        continue;
      }

      rasterTargets.add(filePath);
    }
  }

  return {
    rasterTargets: [...rasterTargets],
    adaptiveTargets: [...adaptiveTargets],
    resourceNames: [...resourceNames]
  };
}

async function replaceRasterTargets(targets: string[], iconPath: string): Promise<void> {
  await Promise.all(targets.map(async (target) => {
    await copyFile(iconPath, target);
  }));
}

export async function applyIconMutation(input: IconMutationInput): Promise<IconMutationReport> {
  const refs = await collectLauncherIconRefs(input.decodedDir);
  await replaceRasterTargets(refs.rasterTargets, input.iconPath);

  return {
    changedFiles: refs.rasterTargets.map((filePath) => toRelativePath(input.decodedDir, filePath)),
    replacedResources: refs.resourceNames
  };
}
