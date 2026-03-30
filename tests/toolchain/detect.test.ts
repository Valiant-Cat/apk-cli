import { describe, expect, it } from 'vitest';
import { chmod, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { detectTool } from '../../src/toolchain/detect';

async function createProbeScript() {
  const dir = await mkdtemp(join(tmpdir(), 'apk-cli-probe-'));
  const scriptPath = join(dir, 'probe-tool.js');
  const markerPath = join(dir, 'probe-hit.txt');

  await writeFile(
    scriptPath,
    `#!/usr/bin/env node
const { appendFileSync } = require('node:fs');
if (process.argv.includes('--probe-ok')) {
  appendFileSync(${JSON.stringify(markerPath)}, 'hit');
  process.exit(0);
}
process.exit(1);
`
  );
  await chmod(scriptPath, 0o755);

  return {
    dir,
    markerPath,
    scriptPath,
    cleanup: async () => {
      await rm(dir, { recursive: true, force: true });
    }
  };
}

describe('detectTool', () => {
  it('returns available when the command can be probed', async () => {
    const result = await detectTool({ name: 'node', command: process.execPath });
    expect(result).toEqual({ name: 'node', status: 'available' });
  });

  it('returns missing when command is unavailable', async () => {
    const result = await detectTool({ name: 'apktool', command: 'missing-apktool' });
    expect(result).toEqual({ name: 'apktool', status: 'missing' });
  });

  it('uses custom probe args', async () => {
    const fixture = await createProbeScript();

    try {
      const result = await detectTool({ name: 'probe-tool', command: fixture.scriptPath, probeArgs: ['--probe-ok'] });
      expect(result).toEqual({ name: 'probe-tool', status: 'available' });
      expect(await readFile(fixture.markerPath, 'utf8')).toBe('hit');
    } finally {
      await fixture.cleanup();
    }
  });
});
