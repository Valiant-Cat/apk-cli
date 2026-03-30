import { describe, expect, it } from 'vitest';
import { runEditScenario } from '../helpers/run-edit-scenario.js';

const EDIT_TIMEOUT_MS = 60000;

describe('apk edit integration', () => {
  it('rebuilds, signs, and verifies an edited apk', async () => {
    const result = await runEditScenario('tests/fixtures/minimal-apk/app.apk', {
      appName: '新应用名',
      versionName: '2.0.0',
      versionCode: 200,
      packageName: 'com.example.changed',
      icon: 'tests/fixtures/icon-png/icon.png'
    });

    try {
      expect(result.outputFile).toMatch(/\.apk$/);
      expect(result.verify.packageName).toBe('com.example.changed');
      expect(result.verify.versionName).toBe('2.0.0');
      expect(result.verify.versionCode).toBe('200');
    } finally {
      await result.cleanup();
    }
  }, EDIT_TIMEOUT_MS);
});
