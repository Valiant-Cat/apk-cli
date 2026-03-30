import { CliError } from './errors.js';
import { normalize as normalizePath, resolve } from 'node:path';

function normalizeForComparison(pathValue: string) {
  const normalized = normalizePath(resolve(pathValue));
  return process.platform === 'win32' ? normalized.toLowerCase() : normalized;
}

export function normalizeOutputPath(input: string, output?: string) {
  if (output) {
    const normalizedInput = normalizeForComparison(input);
    const normalizedOutput = normalizeForComparison(output);

    if (normalizedInput === normalizedOutput) {
      throw new CliError('INVALID_OUTPUT', 'output path must differ from input');
    }
  }

  return output;
}
