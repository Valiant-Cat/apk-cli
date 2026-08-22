import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, extname, join, relative } from 'node:path';
import { getManagedToolchain } from '../toolchain/android-tools.js';
import type { ManagedToolchain } from '../toolchain/download.js';
import { type CommandResult, runCommand } from '../toolchain/runner.js';

export type InstallPackageType = 'apk' | 'xapk' | 'aab';

export type InstallOptions = {
  serial?: string;
  replace?: boolean;
  grant?: boolean;
  adbPath?: string;
  getToolchain?: () => Promise<ManagedToolchain>;
};

export type InstallStage = {
  name: string;
  status: 'ok' | 'skipped';
  message?: string;
};

export type InstallReport = {
  command: 'install';
  inputFile: string;
  packageType: InstallPackageType;
  targetDevice: string;
  method: 'adb install' | 'adb install-multiple' | 'bundletool install-apks';
  apkFiles: string[];
  obbFiles: string[];
  stages: InstallStage[];
};

export type CommandRunner = (command: string, args?: string[]) => Promise<CommandResult>;

type Device = {
  serial: string;
  status: string;
};

type XapkManifest = {
  package_name?: string;
  split_apks?: Array<string | { file?: string; path?: string; name?: string }>;
};

function detectPackageType(input: string): InstallPackageType {
  const extension = extname(input).toLowerCase();

  if (extension === '.apk') {
    return 'apk';
  }

  if (extension === '.xapk') {
    return 'xapk';
  }

  if (extension === '.aab') {
    return 'aab';
  }

  throw new Error(`不支持的安装文件类型: ${extension || '无扩展名'}`);
}

function adbArgs(options: InstallOptions, args: string[]): string[] {
  return options.serial ? ['-s', options.serial, ...args] : args;
}

function installFlags(options: InstallOptions): string[] {
  const flags: string[] = [];

  if (options.replace !== false) {
    flags.push('-r');
  }

  if (options.grant === true) {
    flags.push('-g');
  }

  return flags;
}

function parseDevices(output: string): Device[] {
  return output
    .split(/\r?\n/)
    .slice(1)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [serial = '', status = ''] = line.split(/\s+/);
      return { serial, status };
    })
    .filter((device) => device.serial.length > 0);
}

async function resolveDevice(adbPath: string, options: InstallOptions, runner: CommandRunner): Promise<string> {
  const devices = parseDevices((await runner(adbPath, ['devices'])).stdout);

  if (options.serial) {
    const selected = devices.find((device) => device.serial === options.serial);

    if (!selected) {
      throw new Error(`未找到指定设备: ${options.serial}`);
    }

    if (selected.status !== 'device') {
      throw new Error(`指定设备不可用: ${options.serial} (${selected.status})`);
    }

    return selected.serial;
  }

  const readyDevices = devices.filter((device) => device.status === 'device');
  const unavailableDevices = devices.filter((device) => device.status !== 'device');

  if (readyDevices.length === 1) {
    return readyDevices[0].serial;
  }

  if (readyDevices.length === 0) {
    const suffix = unavailableDevices.length > 0
      ? `；不可用设备: ${unavailableDevices.map((device) => `${device.serial}(${device.status})`).join(', ')}`
      : '';
    throw new Error(`未发现可用 Android 设备${suffix}`);
  }

  throw new Error(`发现多个 Android 设备，请使用 --serial 指定: ${readyDevices.map((device) => device.serial).join(', ')}`);
}

function validateZipEntry(entry: string): void {
  const parts = entry.split(/[\\/]+/).filter(Boolean);

  if (
    entry.startsWith('/') ||
    entry.startsWith('\\') ||
    /^[a-zA-Z]:/.test(entry) ||
    parts.includes('..')
  ) {
    throw new Error(`XAPK 包含不安全路径: ${entry}`);
  }
}

async function listZipEntries(input: string, runner: CommandRunner): Promise<string[]> {
  const result = await runner('unzip', ['-Z1', input]);
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

async function findFiles(rootDir: string, predicate: (path: string) => boolean): Promise<string[]> {
  const entries = await readdir(rootDir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(rootDir, entry.name);

    if (entry.isDirectory()) {
      files.push(...await findFiles(fullPath, predicate));
    } else if (entry.isFile() && predicate(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function readXapkManifest(rootDir: string): Promise<XapkManifest | undefined> {
  try {
    return JSON.parse(await readFile(join(rootDir, 'manifest.json'), 'utf8')) as XapkManifest;
  } catch {
    return undefined;
  }
}

function normalizeRelativePath(path: string): string {
  return path.split(/[\\/]+/).join('/');
}

function orderXapkApks(apkFiles: string[], rootDir: string, manifest?: XapkManifest): string[] {
  const manifestOrder = manifest?.split_apks
    ?.map((entry) => typeof entry === 'string' ? entry : entry.file ?? entry.path ?? entry.name)
    .filter((entry): entry is string => Boolean(entry))
    .map(normalizeRelativePath);

  const byRelativePath = new Map<string, string>();

  for (const apkFile of apkFiles) {
    byRelativePath.set(normalizeRelativePath(relative(rootDir, apkFile)), apkFile);
    byRelativePath.set(basename(apkFile), apkFile);
  }

  if (manifestOrder && manifestOrder.length > 0) {
    const ordered = manifestOrder
      .map((entry) => byRelativePath.get(entry) ?? byRelativePath.get(basename(entry)))
      .filter((apkFile): apkFile is string => Boolean(apkFile));
    const remaining = apkFiles.filter((apkFile) => !ordered.includes(apkFile));
    return [...ordered, ...remaining];
  }

  return [...apkFiles].sort((left, right) => {
    const leftBase = basename(left).toLowerCase() === 'base.apk' ? -1 : 0;
    const rightBase = basename(right).toLowerCase() === 'base.apk' ? -1 : 0;
    return leftBase - rightBase || left.localeCompare(right);
  });
}

function getObbPackageName(obbFile: string): string | undefined {
  const normalized = normalizeRelativePath(obbFile);
  const match = normalized.match(/(?:^|\/)Android\/obb\/([^/]+)\//);
  return match?.[1];
}

async function pushObbFiles(
  adbPath: string,
  obbFiles: string[],
  options: InstallOptions,
  manifest: XapkManifest | undefined,
  runner: CommandRunner
): Promise<void> {
  for (const obbFile of obbFiles) {
    const packageName = getObbPackageName(obbFile) ?? manifest?.package_name;

    if (!packageName) {
      throw new Error(`无法确定 OBB 目标包名: ${obbFile}`);
    }

    const remoteDir = `/sdcard/Android/obb/${packageName}`;
    await runner(adbPath, adbArgs(options, ['shell', 'mkdir', '-p', remoteDir]));
    await runner(adbPath, adbArgs(options, ['push', obbFile, `${remoteDir}/`]));
  }
}

async function installApks(
  adbPath: string,
  apkFiles: string[],
  options: InstallOptions,
  runner: CommandRunner
): Promise<'adb install' | 'adb install-multiple'> {
  if (apkFiles.length === 1) {
    await runner(adbPath, adbArgs(options, ['install', ...installFlags(options), apkFiles[0]]));
    return 'adb install';
  }

  await runner(adbPath, adbArgs(options, ['install-multiple', ...installFlags(options), ...apkFiles]));
  return 'adb install-multiple';
}

async function installAab(input: string, targetDevice: string, options: InstallOptions, runner: CommandRunner): Promise<InstallReport> {
  const workspace = await mkdtemp(join(tmpdir(), 'apk-cli-install-'));

  try {
    const tools = await (options.getToolchain ?? getManagedToolchain)();
    const outputApks = join(workspace, 'device.apks');
    const adbPath = options.adbPath ?? 'adb';
    const deviceArgs = options.serial ? [`--device-id=${targetDevice}`] : [];

    await runner(tools.javaCommand, [
      '-jar',
      tools.bundletoolJar,
      'build-apks',
      `--bundle=${input}`,
      `--output=${outputApks}`,
      '--connected-device',
      `--adb=${adbPath}`,
      ...deviceArgs
    ]);
    await runner(tools.javaCommand, [
      '-jar',
      tools.bundletoolJar,
      'install-apks',
      `--apks=${outputApks}`,
      `--adb=${adbPath}`,
      ...deviceArgs
    ]);

    return {
      command: 'install',
      inputFile: input,
      packageType: 'aab',
      targetDevice,
      method: 'bundletool install-apks',
      apkFiles: [],
      obbFiles: [],
      stages: [
        { name: 'detect', status: 'ok', message: 'aab' },
        { name: 'device', status: 'ok', message: targetDevice },
        { name: 'build-apks', status: 'ok' },
        { name: 'install-apks', status: 'ok' }
      ]
    };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

async function installXapk(input: string, targetDevice: string, options: InstallOptions, runner: CommandRunner): Promise<InstallReport> {
  const workspace = await mkdtemp(join(tmpdir(), 'apk-cli-install-'));
  const adbPath = options.adbPath ?? 'adb';

  try {
    const entries = await listZipEntries(input, runner);
    entries.forEach(validateZipEntry);
    await runner('unzip', ['-q', input, '-d', workspace]);

    const manifest = await readXapkManifest(workspace);
    const apkFiles = orderXapkApks(
      await findFiles(workspace, (path) => extname(path).toLowerCase() === '.apk'),
      workspace,
      manifest
    );

    if (apkFiles.length === 0) {
      throw new Error('XAPK 中未找到 APK 文件');
    }

    const obbFiles = await findFiles(workspace, (path) => extname(path).toLowerCase() === '.obb');
    const method = await installApks(adbPath, apkFiles, options, runner);

    if (obbFiles.length > 0) {
      await pushObbFiles(adbPath, obbFiles, options, manifest, runner);
    }

    return {
      command: 'install',
      inputFile: input,
      packageType: 'xapk',
      targetDevice,
      method,
      apkFiles,
      obbFiles,
      stages: [
        { name: 'detect', status: 'ok', message: 'xapk' },
        { name: 'device', status: 'ok', message: targetDevice },
        { name: 'extract', status: 'ok' },
        { name: 'install', status: 'ok', message: method },
        { name: 'obb', status: obbFiles.length > 0 ? 'ok' : 'skipped' }
      ]
    };
  } finally {
    await rm(workspace, { recursive: true, force: true });
  }
}

export async function installPackage(
  input: string,
  options: InstallOptions = {},
  runner: CommandRunner = runCommand
): Promise<InstallReport> {
  const packageType = detectPackageType(input);
  const adbPath = options.adbPath ?? 'adb';
  const targetDevice = await resolveDevice(adbPath, options, runner);

  if (packageType === 'apk') {
    const method = await installApks(adbPath, [input], options, runner);
    return {
      command: 'install',
      inputFile: input,
      packageType,
      targetDevice,
      method,
      apkFiles: [input],
      obbFiles: [],
      stages: [
        { name: 'detect', status: 'ok', message: 'apk' },
        { name: 'device', status: 'ok', message: targetDevice },
        { name: 'install', status: 'ok', message: method }
      ]
    };
  }

  if (packageType === 'xapk') {
    return await installXapk(input, targetDevice, options, runner);
  }

  return await installAab(input, targetDevice, options, runner);
}
