import { describe, expect, it } from 'vitest';
import { formatRelativeTime } from './format';

// Expected text is built with the same Intl formatter (the browser's language), so these tests
// check which unit and number are chosen, not one language's wording.
const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
const date = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });

const NOW = Date.parse('2026-11-26T12:00:00.000Z');
const ago = (ms: number) => new Date(NOW - ms).toISOString();

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

describe('formatRelativeTime', () => {
  it.each([
    ['0 seconds', 0, rtf.format(0, 'second')],
    ['59 seconds', 59 * SECOND, rtf.format(0, 'second')],
    ['1 minute', MINUTE, rtf.format(-1, 'minute')],
    ['59 minutes 59 seconds', HOUR - SECOND, rtf.format(-59, 'minute')],
    ['1 hour', HOUR, rtf.format(-1, 'hour')],
    ['23 hours 59 minutes', DAY - MINUTE, rtf.format(-23, 'hour')],
    ['1 day', DAY, rtf.format(-1, 'day')],
    ['6 days 23 hours', 7 * DAY - HOUR, rtf.format(-6, 'day')],
  ])('describes %s ago', (_label, elapsed, expected) => {
    expect(formatRelativeTime(ago(elapsed), NOW)).toBe(expected);
  });

  it('shows the date from a week on', () => {
    const iso = ago(7 * DAY);
    expect(formatRelativeTime(iso, NOW)).toBe(date.format(new Date(iso)));
  });

  it('reads times slightly in the future (clock differences) as now', () => {
    expect(formatRelativeTime(ago(-30 * SECOND), NOW)).toBe(rtf.format(0, 'second'));
  });

  it('describes times further in the future', () => {
    expect(formatRelativeTime(ago(-2 * HOUR), NOW)).toBe(rtf.format(2, 'hour'));
  });

  it('returns invalid input unchanged', () => {
    expect(formatRelativeTime('not a date', NOW)).toBe('not a date');
  });

  it('uses the current time by default', () => {
    expect(formatRelativeTime(new Date().toISOString())).toBe(rtf.format(0, 'second'));
  });

  it('gives English wording in an English locale', () => {
    // A readable check of the actual text, when the test runs in English.
    if (!rtf.resolvedOptions().locale.startsWith('en')) return;
    expect(formatRelativeTime(ago(2 * HOUR), NOW)).toBe('2 hours ago');
    expect(formatRelativeTime(ago(DAY), NOW)).toBe('yesterday');
    expect(formatRelativeTime(ago(0), NOW)).toBe('now');
  });
});
