import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyPackageNameMutation } from '../../src/mutations/package-name.js';

async function createDecodedDir() {
  const decodedDir = await mkdtemp(join(tmpdir(), 'apk-cli-package-mutation-'));
  await mkdir(join(decodedDir, 'smali'), { recursive: true });

  await writeFile(
    join(decodedDir, 'AndroidManifest.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.demo"
    android:versionCode="42"
    android:versionName="1.2.3">
    <application android:label="@string/app_name">
        <provider
            android:name=".DemoProvider"
            android:authorities="com.example.demo.provider" />
    </application>
</manifest>`,
    'utf8'
  );

  await writeFile(
    join(decodedDir, 'smali', 'Example.smali'),
    'const-string v0, "com.example.demo.unresolved"',
    'utf8'
  );

  return decodedDir;
}

describe('applyPackageNameMutation', () => {
  it('updates manifest package and reports unresolved string references', async () => {
    const decodedDir = await createDecodedDir();

    try {
      const report = await applyPackageNameMutation({
        decodedDir,
        nextPackageName: 'com.example.renamed'
      });

      expect(report.changedFiles).toContain('AndroidManifest.xml');
      expect(report.risks).toEqual(['unresolved reference: smali/Example.smali']);

      const manifest = await readFile(join(decodedDir, 'AndroidManifest.xml'), 'utf8');
      expect(manifest).toContain('package="com.example.renamed"');
      expect(manifest).toContain('android:authorities="com.example.renamed.provider"');
    } finally {
      await rm(decodedDir, { recursive: true, force: true });
    }
  });
});
