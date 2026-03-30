import { describe, expect, it } from 'vitest';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { tmpdir } from 'node:os';
import { normalizeOutputPath } from '../../src/core/config';
import { runCli } from '../helpers/run-cli';

const apkFixtureDir = resolve('tests/fixtures/minimal-apk/decoded');
const aabFixtureDir = resolve('tests/fixtures/minimal-aab/decoded');

async function createDecodedDir(directoryName: string, manifest: string) {
  const rootDir = await mkdtemp(join(tmpdir(), 'apk-cli-decoded-'));
  const decodedDir = join(rootDir, directoryName);
  await mkdir(decodedDir);
  await writeFile(join(decodedDir, 'AndroidManifest.xml'), manifest);
  return { rootDir, decodedDir };
}

describe('normalizeOutputPath', () => {
  it('rejects using the same file as input and output', () => {
    expect(() => normalizeOutputPath('app.apk', 'app.apk')).toThrow('output path must differ from input');
  });

  it('rejects equivalent relative paths', () => {
    expect(() => normalizeOutputPath('app.apk', './app.apk')).toThrow('output path must differ from input');
  });

  it('rejects equivalent traversed paths', () => {
    expect(() => normalizeOutputPath('app.apk', 'a/../app.apk')).toThrow('output path must differ from input');
  });

  it('rejects equivalent absolute and relative paths', () => {
    const absolute = resolve(process.cwd(), 'app.apk');
    expect(() => normalizeOutputPath('app.apk', absolute)).toThrow('output path must differ from input');
  });

  it('returns output unchanged when output is empty', () => {
    expect(normalizeOutputPath('app.apk')).toBeUndefined();
    expect(normalizeOutputPath('app.apk', '')).toBe('');
  });

  it('returns different output paths unchanged', () => {
    expect(normalizeOutputPath('app.apk', 'dist/app.apk')).toBe('dist/app.apk');
  });
});

describe('inspect command', () => {
  it('prints decoded directory metadata as locked json', async () => {
    const result = await runCli(['inspect', apkFixtureDir, '--json']);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe(
      `${JSON.stringify({
        packageName: 'com.example.demo',
        versionName: '1.2.3',
        versionCode: '42',
        labelRefs: ['@string/app_name'],
        iconRefs: ['@mipmap/ic_launcher', '@mipmap/ic_launcher_round']
      }, null, 2)}\n`
    );
  });

  it('prints decoded directory metadata as locked text', async () => {
    const result = await runCli(['inspect', aabFixtureDir]);

    expect(result.exitCode).toBe(0);
    expect(result.stderr).toBe('');
    expect(result.stdout).toBe([
      'package: com.example.bundle',
      'version name: 2.0.0',
      'version code: 7',
      'label refs: @string/app_name',
      'icon refs: @mipmap/ic_launcher',
      ''
    ].join('\n'));
  });

  it('fails clearly for an invalid apk archive', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'apk-cli-inspect-file-'));
    const apkPath = join(dir, 'app.apk');
    await writeFile(apkPath, 'not-a-real-apk');

    try {
      const result = await runCli(['inspect', apkPath]);
      expect(result.exitCode).toBe(1);
      expect(result.stdout).toBe('');
      expect(result.stderr).toBe('invalid apk archive\n');
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });

  it('routes .aab-suffixed decoded directories through the aab placeholder path', async () => {
    const fixture = await createDecodedDir(
      'decoded.aab',
      `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android" package="com.example.temp" android:versionCode="9" android:versionName="9.9.9">
  <application android:label="@string/temp_name" android:icon="@mipmap/temp_icon" />
</manifest>`
    );

    try {
      const result = await runCli(['inspect', fixture.decodedDir, '--json']);
      expect(result.exitCode).toBe(0);
      expect(result.stderr).toBe('');
      expect(result.stdout).toBe(
        `${JSON.stringify({
          packageName: 'com.example.temp',
          versionName: '9.9.9',
          versionCode: '9',
          labelRefs: ['@string/temp_name'],
          iconRefs: ['@mipmap/temp_icon']
        }, null, 2)}\n`
      );
    } finally {
      await rm(fixture.rootDir, { recursive: true, force: true });
    }
  });
});
