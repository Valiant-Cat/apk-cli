import { describe, expect, it } from 'vitest';
import { CLI_ERROR_CODES, CliError } from '../../src/core/errors';

describe('CliError', () => {
  it('exposes a readonly code from the shared set', () => {
    const error = new CliError(CLI_ERROR_CODES.INVALID_OUTPUT, 'output path must differ from input');

    expect(error.code).toBe(CLI_ERROR_CODES.INVALID_OUTPUT);
    expect(error.message).toBe('output path must differ from input');
    expect(error.name).toBe('CliError');
  });
});
