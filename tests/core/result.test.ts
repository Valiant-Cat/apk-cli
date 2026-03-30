import { describe, expect, expectTypeOf, it } from 'vitest';
import { err, isErr, isOk, ok, type Result } from '../../src/core/result';

describe('Result helpers', () => {
  it('preserves the success type without binding the error type', () => {
    expectTypeOf(ok(123)).toEqualTypeOf<Result<number, never>>();
    const result: Result<number, string> = ok(123);

    expect(isOk(result)).toBe(true);
    if (isOk(result)) {
      expect(result.value).toBe(123);
    }
  });

  it('wraps failures with the provided error type', () => {
    expectTypeOf(err('bad input')).toEqualTypeOf<Result<never, string>>();
    const result = err('bad input');

    expect(isErr(result)).toBe(true);
    if (isErr(result)) {
      expect(result.error).toBe('bad input');
    }
  });
});
