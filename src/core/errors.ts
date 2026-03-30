export const CLI_ERROR_CODES = {
  INVALID_OUTPUT: 'INVALID_OUTPUT'
} as const;

export type CliErrorCode = typeof CLI_ERROR_CODES[keyof typeof CLI_ERROR_CODES];

export class CliError extends Error {
  constructor(public readonly code: CliErrorCode, message: string) {
    super(message);
    this.name = 'CliError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
