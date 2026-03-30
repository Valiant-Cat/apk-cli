import { describe, expect, it } from 'vitest';
import { createLogger } from '../../src/core/logger';

describe('createLogger', () => {
  it('routes text logs to stdout and errors to stderr', () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const logger = createLogger({
      stdout: (line) => stdout.push(line),
      stderr: (line) => stderr.push(line)
    });

    logger.info('ready');
    logger.warn('careful');
    logger.error('boom');

    expect(stdout).toHaveLength(1);
    expect(stderr).toHaveLength(2);
    expect(stdout[0]).toContain('[INFO] ready');
    expect(stderr[0]).toContain('[WARN] careful');
    expect(stderr[1]).toContain('[ERROR] boom');
  });

  it('formats json logs and keeps error logs off stdout', () => {
    const stdout: string[] = [];
    const stderr: string[] = [];
    const logger = createLogger({
      format: 'json',
      stdout: (line) => stdout.push(line),
      stderr: (line) => stderr.push(line)
    });

    logger.info('ready', { tool: 'apk-cli' });
    logger.error('boom');

    expect(stdout).toHaveLength(1);
    expect(stderr).toHaveLength(1);
    expect(JSON.parse(stdout[0])).toMatchObject({
      level: 'info',
      message: 'ready',
      meta: { tool: 'apk-cli' }
    });
    expect(JSON.parse(stderr[0])).toMatchObject({
      level: 'error',
      message: 'boom'
    });
  });
});
