import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyNameMutation } from '../../src/mutations/name.js';

async function createDecodedDir() {
  const decodedDir = await mkdtemp(join(tmpdir(), 'apk-cli-name-mutation-'));
  await mkdir(join(decodedDir, 'res', 'values'), { recursive: true });
  await mkdir(join(decodedDir, 'res', 'values-zh'), { recursive: true });

  await writeFile(
    join(decodedDir, 'AndroidManifest.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.demo"
    android:versionCode="42"
    android:versionName="1.2.3">
    <application android:label="@string/app_name" />
</manifest>`,
    'utf8'
  );

  await writeFile(
    join(decodedDir, 'res', 'values', 'strings.xml'),
    `<resources>
  <string name="app_name">Demo App</string>
</resources>`,
    'utf8'
  );

  await writeFile(
    join(decodedDir, 'res', 'values-zh', 'strings.xml'),
    `<resources>
  <string name="app_name">演示应用</string>
</resources>`,
    'utf8'
  );

  return decodedDir;
}

describe('applyNameMutation', () => {
  it('updates matched string resources across locales', async () => {
    const decodedDir = await createDecodedDir();

    try {
      const report = await applyNameMutation({
        decodedDir,
        value: '新应用名'
      });

      expect(report.changedFiles).toContain('res/values/strings.xml');
      expect(report.changedFiles).toContain('res/values-zh/strings.xml');

      await expect(readFile(join(decodedDir, 'res', 'values', 'strings.xml'), 'utf8')).resolves.toContain('新应用名');
      await expect(readFile(join(decodedDir, 'res', 'values-zh', 'strings.xml'), 'utf8')).resolves.toContain('新应用名');
    } finally {
      await rm(decodedDir, { recursive: true, force: true });
    }
  });
});
