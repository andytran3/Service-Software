import { describe, expect, it } from 'vitest';
import { parseEnv } from './env.js';

const validUrl = 'postgresql://user:pass@localhost:5432/requests_dev';

describe('parseEnv', () => {
  it('accepts a valid configuration', () => {
    expect(parseEnv({ DATABASE_URL: validUrl, PORT: '4000' })).toEqual({
      DATABASE_URL: validUrl,
      PORT: 4000,
    });
  });

  it('defaults PORT to 3000', () => {
    expect(parseEnv({ DATABASE_URL: validUrl }).PORT).toBe(3000);
  });

  it('rejects a missing DATABASE_URL', () => {
    expect(() => parseEnv({})).toThrow(/DATABASE_URL/);
  });

  it('rejects a non-PostgreSQL DATABASE_URL', () => {
    expect(() => parseEnv({ DATABASE_URL: 'mysql://localhost/db' })).toThrow(
      /postgresql:\/\/ connection URL/,
    );
  });

  it('rejects a non-numeric PORT', () => {
    expect(() => parseEnv({ DATABASE_URL: validUrl, PORT: 'abc' })).toThrow(/PORT/);
  });

  it('rejects an out-of-range PORT', () => {
    expect(() => parseEnv({ DATABASE_URL: validUrl, PORT: '70000' })).toThrow(/PORT/);
  });
});
