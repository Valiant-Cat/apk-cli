import { describe, expect, it } from 'vitest';
import { runEditScenario } from '../helpers/run-edit-scenario.js';

describe('aab edit integration', () => {
  it('edits and rebuilds an aab bundle', async () => {
    const result = await runEditScenario('tests/fixtures/minimal-aab/app.aab', {
      appName: 'Bundle 新名',
      packageName: 'com.example.bundle.changed'
    });

    try {
      expect(result.outputFile).toMatch(/\.aab$/);
      expect(result.verify.packageName).toBe('com.example.bundle.changed');
    } finally {
      await result.cleanup();
    }
  });
});
