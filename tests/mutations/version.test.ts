import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyVersionMutation } from '../../src/mutations/version.js';

async function createDecodedDir() {
  const decodedDir = await mkdtemp(join(tmpdir(), 'apk-cli-version-mutation-'));

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

  return decodedDir;
}

describe('applyVersionMutation', () => {
  it('updates version fields in AndroidManifest.xml', async () => {
    const decodedDir = await createDecodedDir();

    try {
      const report = await applyVersionMutation({
        decodedDir,
        versionName: '2.0.0',
        versionCode: '200'
      });

      expect(report.changedFiles).toEqual(['AndroidManifest.xml']);

      const manifest = await readFile(join(decodedDir, 'AndroidManifest.xml'), 'utf8');
      expect(manifest).toContain('android:versionName="2.0.0"');
      expect(manifest).toContain('android:versionCode="200"');
    } finally {
      await rm(decodedDir, { recursive: true, force: true });
    }
  });
});
