import { chmod, mkdir, readdir, stat, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);
const GOOGLE_REPOSITORY = 'https://dl.google.com/android/repository';
const GOOGLE_MAVEN = 'https://dl.google.com/android/maven2';
const APKTOOL_VERSION = '3.0.1';
const BUNDLETOOL_VERSION = '1.18.3';
const BUILD_TOOLS_VERSION = '35.0.1';
const AAPT2_VERSION = '9.1.0-14792394';
const PLATFORM_ARCHIVE = 'platform-34-ext8_r01.zip';

export type DownloadRequest = {
  url: string;
  destination: string;
};

export type DownloadResult = {
  path: string;
};

export type ManagedToolchain = {
  cacheDir: string;
  apktoolJar: string;
  bundletoolJar: string;
  buildToolsDir: string;
  aapt2Path: string;
  zipalignPath: string;
  apksignerPath: string;
  androidJar: string;
  javaCommand: string;
  jarsignerCommand: string;
};

function getBuildToolsArchiveName(): string {
  switch (process.platform) {
    case 'darwin':
      return 'build-tools_r35.0.1_macosx.zip';
    case 'linux':
      return 'build-tools_r35.0.1_linux.zip';
    case 'win32':
      return 'build-tools_r35.0.1_windows.zip';
    default:
      throw new Error(`unsupported host platform: ${process.platform}`);
  }
}

function getAapt2Classifier(): string {
  switch (process.platform) {
    case 'darwin':
      return 'osx';
    case 'linux':
      return 'linux';
    case 'win32':
      return 'windows';
    default:
      throw new Error(`unsupported host platform: ${process.platform}`);
  }
}

async function pathExists(path: string): Promise<boolean> {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function ensureDir(path: string): Promise<void> {
  await mkdir(path, { recursive: true });
}

async function downloadFile(request: DownloadRequest): Promise<DownloadResult> {
  if (await pathExists(request.destination)) {
    return { path: request.destination };
  }

  await ensureDir(dirname(request.destination));
  const response = await fetch(request.url);
  if (!response.ok) {
    throw new Error(`failed to download ${request.url}: ${response.status} ${response.statusText}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  await writeFile(request.destination, buffer);
  return { path: request.destination };
}

async function extractZip(zipPath: string, destination: string): Promise<void> {
  await ensureDir(destination);
  await execFileAsync('unzip', ['-oq', zipPath, '-d', destination], { encoding: 'utf8' });
}

async function findFile(rootDir: string, targetName: string): Promise<string | undefined> {
  const entries = await readdir(rootDir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name);

    if (entry.isFile() && entry.name === targetName) {
      return fullPath;
    }

    if (entry.isDirectory()) {
      const nested = await findFile(fullPath, targetName);
      if (nested) {
        return nested;
      }
    }
  }

  return undefined;
}

async function ensureExecutable(path: string): Promise<void> {
  if (process.platform !== 'win32') {
    await chmod(path, 0o755);
  }
}

function getDefaultCacheDir(): string {
  return join(homedir(), '.apk-cli', 'tools');
}

export async function ensureManagedToolchain(cacheDir = getDefaultCacheDir()): Promise<ManagedToolchain> {
  await ensureDir(cacheDir);

  const apktoolJar = join(cacheDir, `apktool_${APKTOOL_VERSION}.jar`);
  const bundletoolJar = join(cacheDir, `bundletool-all-${BUNDLETOOL_VERSION}.jar`);
  const aapt2Archive = join(cacheDir, `aapt2-${AAPT2_VERSION}-${getAapt2Classifier()}.jar`);
  const buildToolsArchive = join(cacheDir, `${BUILD_TOOLS_VERSION}-${process.platform}-build-tools.zip`);
  const platformArchive = join(cacheDir, PLATFORM_ARCHIVE);
  const buildToolsDir = join(cacheDir, `build-tools-${BUILD_TOOLS_VERSION}`);
  const platformDir = join(cacheDir, 'platform-34');
  const aapt2Dir = join(cacheDir, `aapt2-${AAPT2_VERSION}`);

  await downloadFile({
    url: `https://github.com/iBotPeaches/Apktool/releases/download/v${APKTOOL_VERSION}/apktool_${APKTOOL_VERSION}.jar`,
    destination: apktoolJar
  });
  await downloadFile({
    url: `https://github.com/google/bundletool/releases/download/${BUNDLETOOL_VERSION}/bundletool-all-${BUNDLETOOL_VERSION}.jar`,
    destination: bundletoolJar
  });

  if (!await pathExists(buildToolsDir)) {
    await downloadFile({
      url: `${GOOGLE_REPOSITORY}/${getBuildToolsArchiveName()}`,
      destination: buildToolsArchive
    });
    await extractZip(buildToolsArchive, buildToolsDir);
  }

  if (!await pathExists(platformDir)) {
    await downloadFile({
      url: `${GOOGLE_REPOSITORY}/${PLATFORM_ARCHIVE}`,
      destination: platformArchive
    });
    await extractZip(platformArchive, platformDir);
  }

  if (!await pathExists(aapt2Dir)) {
    await downloadFile({
      url: `${GOOGLE_MAVEN}/com/android/tools/build/aapt2/${AAPT2_VERSION}/aapt2-${AAPT2_VERSION}-${getAapt2Classifier()}.jar`,
      destination: aapt2Archive
    });
    await extractZip(aapt2Archive, aapt2Dir);
  }

  const zipalignPath = await findFile(buildToolsDir, process.platform === 'win32' ? 'zipalign.exe' : 'zipalign');
  const apksignerPath = await findFile(buildToolsDir, process.platform === 'win32' ? 'apksigner.bat' : 'apksigner');
  const androidJar = await findFile(platformDir, 'android.jar');
  const aapt2Path = await findFile(aapt2Dir, process.platform === 'win32' ? 'aapt2.exe' : 'aapt2');

  if (!zipalignPath || !apksignerPath || !androidJar || !aapt2Path) {
    throw new Error('managed Android toolchain is incomplete after download');
  }

  await ensureExecutable(zipalignPath);
  await ensureExecutable(apksignerPath);
  await ensureExecutable(aapt2Path);

  return {
    cacheDir,
    apktoolJar,
    bundletoolJar,
    buildToolsDir,
    aapt2Path,
    zipalignPath,
    apksignerPath,
    androidJar,
    javaCommand: 'java',
    jarsignerCommand: 'jarsigner'
  };
}
