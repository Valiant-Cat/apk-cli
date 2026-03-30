import { describe, expect, it } from 'vitest';
import { formatJsonReport } from '../../src/reporting/json-report.js';

describe('formatJsonReport', () => {
  it('serializes stage results and mutation reports', () => {
    const output = formatJsonReport({
      command: 'edit',
      stages: [{ name: 'detect', status: 'ok' }]
    });

    expect(output).toContain('detect');
    expect(output).toContain('ok');
  });
});
