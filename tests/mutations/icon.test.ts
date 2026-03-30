import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { applyIconMutation } from '../../src/mutations/icon.js';

async function createDecodedDir() {
  const decodedDir = await mkdtemp(join(tmpdir(), 'apk-cli-icon-mutation-'));
  await mkdir(join(decodedDir, 'res', 'mipmap-hdpi'), { recursive: true });
  await mkdir(join(decodedDir, 'res', 'mipmap-anydpi-v26'), { recursive: true });
  await mkdir(join(decodedDir, 'res', 'drawable'), { recursive: true });

  await writeFile(
    join(decodedDir, 'AndroidManifest.xml'),
    `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android"
    package="com.example.demo"
    android:versionCode="42"
    android:versionName="1.2.3">
    <application
        android:label="@string/app_name"
        android:icon="@mipmap/ic_launcher"
        android:roundIcon="@mipmap/ic_launcher_round" />
</manifest>`,
    'utf8'
  );

  await writeFile(join(decodedDir, 'res', 'mipmap-hdpi', 'ic_launcher.png'), 'old-launcher', 'utf8');
  await writeFile(join(decodedDir, 'res', 'mipmap-hdpi', 'ic_launcher_round.png'), 'old-round', 'utf8');
  await writeFile(
    join(decodedDir, 'res', 'mipmap-anydpi-v26', 'ic_launcher.xml'),
    `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@drawable/ic_launcher_background" />
  <foreground android:drawable="@drawable/ic_launcher_foreground" />
</adaptive-icon>`,
    'utf8'
  );
  await writeFile(join(decodedDir, 'res', 'drawable', 'ic_launcher_background.png'), 'old-bg', 'utf8');
  await writeFile(join(decodedDir, 'res', 'drawable', 'ic_launcher_foreground.png'), 'old-fg', 'utf8');

  return decodedDir;
}

describe('applyIconMutation', () => {
  it('replaces launcher, roundIcon, and adaptive icon assets', async () => {
    const decodedDir = await createDecodedDir();
    const iconPath = join(decodedDir, 'replacement.png');
    await writeFile(iconPath, 'new-icon-data', 'utf8');

    try {
      const report = await applyIconMutation({
        decodedDir,
        iconPath
      });

      expect(report.replacedResources).toContain('@mipmap/ic_launcher');
      expect(report.replacedResources).toContain('@mipmap/ic_launcher_round');
      expect(report.replacedResources).toContain('@mipmap-anydpi-v26/ic_launcher');

      await expect(readFile(join(decodedDir, 'res', 'mipmap-hdpi', 'ic_launcher.png'), 'utf8')).resolves.toBe('new-icon-data');
      await expect(readFile(join(decodedDir, 'res', 'mipmap-hdpi', 'ic_launcher_round.png'), 'utf8')).resolves.toBe('new-icon-data');
      await expect(readFile(join(decodedDir, 'res', 'drawable', 'ic_launcher_background.png'), 'utf8')).resolves.toBe('new-icon-data');
      await expect(readFile(join(decodedDir, 'res', 'drawable', 'ic_launcher_foreground.png'), 'utf8')).resolves.toBe('new-icon-data');
    } finally {
      await rm(decodedDir, { recursive: true, force: true });
    }
  });
});
