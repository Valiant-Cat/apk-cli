export class CliError extends Error {
  constructor(public code: string, message: string) {
    super(message);
    this.name = 'CliError';
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
