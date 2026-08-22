import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { installPackage, type CommandRunner } from '../../src/package/install';
import type { ManagedToolchain } from '../../src/toolchain/download';

function createRunner(options?: {
  devices?: string;
  zipEntries?: string[];
  onExtract?: (destination: string) => Promise<void>;
}) {
  const calls: Array<{ command: string; args: string[] }> = [];

  const runner: CommandRunner = async (command, args = []) => {
    calls.push({ command, args });

    if (args[0] === 'devices') {
      return {
        stdout: options?.devices ?? 'List of devices attached\nemulator-5554\tdevice\n',
        stderr: ''
      };
    }

    if (command === 'unzip' && args[0] === '-Z1') {
      return {
        stdout: `${(options?.zipEntries ?? []).join('\n')}\n`,
        stderr: ''
      };
    }

    if (command === 'unzip' && args[0] === '-q') {
      const destination = args[3];
      if (!destination) {
        throw new Error('missing unzip destination');
      }
      await options?.onExtract?.(destination);
      return { stdout: '', stderr: '' };
    }

    return { stdout: '', stderr: '' };
  };

  return { runner, calls };
}

function createToolchain(): ManagedToolchain {
  return {
    cacheDir: '/tmp/apk-cli-tools',
    apktoolJar: '/tmp/apktool.jar',
    bundletoolJar: '/tmp/bundletool.jar',
    buildToolsDir: '/tmp/build-tools',
    aapt2Path: '/tmp/aapt2',
    zipalignPath: '/tmp/zipalign',
    apksignerPath: '/tmp/apksigner',
    androidJar: '/tmp/android.jar',
    javaCommand: 'java',
    jarsignerCommand: 'jarsigner'
  };
}

describe('installPackage', () => {
  it('使用 adb install 安装单个 APK，默认覆盖安装并支持授权', async () => {
    const { runner, calls } = createRunner();

    const report = await installPackage('app.APK', { grant: true }, runner);

    expect(report.packageType).toBe('apk');
    expect(report.method).toBe('adb install');
    expect(calls).toContainEqual({
      command: 'adb',
      args: ['install', '-r', '-g', 'app.APK']
    });
  });

  it('多设备时要求显式指定 serial', async () => {
    const { runner } = createRunner({
      devices: 'List of devices attached\nemulator-5554\tdevice\n0123456789\tdevice\n'
    });

    await expect(installPackage('app.apk', {}, runner)).rejects.toThrow('发现多个 Android 设备');
  });

  it('指定设备不可用时给出明确错误', async () => {
    const { runner } = createRunner({
      devices: 'List of devices attached\nemulator-5554\tunauthorized\n'
    });

    await expect(installPackage('app.apk', { serial: 'emulator-5554' }, runner))
      .rejects.toThrow('指定设备不可用: emulator-5554 (unauthorized)');
  });

  it('解包 XAPK 后使用 install-multiple，并推送 OBB', async () => {
    const { runner, calls } = createRunner({
      zipEntries: [
        'manifest.json',
        'base.apk',
        'config.arm64_v8a.apk',
        'Android/obb/com.example.app/main.1.com.example.app.obb'
      ],
      onExtract: async (destination) => {
        await mkdir(join(destination, 'Android', 'obb', 'com.example.app'), { recursive: true });
        await writeFile(join(destination, 'manifest.json'), JSON.stringify({
          package_name: 'com.example.app',
          split_apks: ['base.apk', 'config.arm64_v8a.apk']
        }));
        await writeFile(join(destination, 'base.apk'), '');
        await writeFile(join(destination, 'config.arm64_v8a.apk'), '');
        await writeFile(join(destination, 'Android', 'obb', 'com.example.app', 'main.1.com.example.app.obb'), '');
      }
    });

    const report = await installPackage('app.xapk', { serial: 'emulator-5554' }, runner);

    expect(report.packageType).toBe('xapk');
    expect(report.method).toBe('adb install-multiple');
    expect(calls.some((call) => (
      call.command === 'adb' &&
      call.args[0] === '-s' &&
      call.args[2] === 'install-multiple' &&
      call.args.includes('-r') &&
      call.args.some((arg) => arg.endsWith('base.apk')) &&
      call.args.some((arg) => arg.endsWith('config.arm64_v8a.apk'))
    ))).toBe(true);
    expect(calls.some((call) => call.command === 'adb' && call.args.includes('push'))).toBe(true);
  });

  it('拒绝 XAPK 中的路径穿越条目', async () => {
    const { runner } = createRunner({
      zipEntries: ['../evil.apk']
    });

    await expect(installPackage('app.xapk', {}, runner)).rejects.toThrow('XAPK 包含不安全路径');
  });

  it('AAB 通过 bundletool 为连接设备构建并安装 apks', async () => {
    const tempDir = await mkdtemp(join(tmpdir(), 'apk-cli-install-test-'));
    const { runner, calls } = createRunner();
    const toolchain = createToolchain();

    try {
      const report = await installPackage('app.aab', {
        serial: 'emulator-5554',
        adbPath: '/opt/android/adb',
        getToolchain: async () => ({
          ...toolchain,
          bundletoolJar: join(tempDir, 'bundletool.jar')
        })
      }, runner);

      expect(report.packageType).toBe('aab');
      expect(report.method).toBe('bundletool install-apks');
      expect(calls).toContainEqual({
        command: 'java',
        args: expect.arrayContaining([
          '-jar',
          join(tempDir, 'bundletool.jar'),
          'build-apks',
          '--bundle=app.aab',
          '--connected-device',
          '--adb=/opt/android/adb',
          '--device-id=emulator-5554'
        ])
      });
      expect(calls).toContainEqual({
        command: 'java',
        args: expect.arrayContaining([
          '-jar',
          join(tempDir, 'bundletool.jar'),
          'install-apks',
          '--adb=/opt/android/adb',
          '--device-id=emulator-5554'
        ])
      });
    } finally {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('拒绝未知安装文件类型', async () => {
    const { runner } = createRunner();

    await expect(installPackage('app.zip', {}, runner)).rejects.toThrow('不支持的安装文件类型: .zip');
  });
});
