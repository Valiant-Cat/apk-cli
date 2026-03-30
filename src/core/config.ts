import { CliError } from './errors.js';

export function normalizeOutputPath(input: string, output?: string) {
  if (output && input === output) {
    throw new CliError('INVALID_OUTPUT', 'output path must differ from input');
  }

  return output;
}
