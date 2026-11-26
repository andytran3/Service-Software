const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
});

/** Formats an ISO 8601 timestamp for display in the user's locale. */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? iso : dateTimeFormat.format(date);
}

const dateFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' });
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

/**
 * How long ago a timestamp was, in the user's language: "now", "5 minutes ago", "2 hours ago",
 * "yesterday", "3 days ago". From a week on, the date instead (e.g. "Nov 18, 2026"). Times less
 * than a minute away, including slightly in the future (clock differences), read as "now".
 */
export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const time = new Date(iso).getTime();
  if (Number.isNaN(time)) return iso;

  const elapsed = now - time;
  const distance = Math.abs(elapsed);
  if (distance < MINUTE) return relativeFormat.format(0, 'second');
  if (distance >= WEEK) return dateFormat.format(time);

  const sign = elapsed > 0 ? -1 : 1;
  if (distance < HOUR) return relativeFormat.format(sign * Math.floor(distance / MINUTE), 'minute');
  if (distance < DAY) return relativeFormat.format(sign * Math.floor(distance / HOUR), 'hour');
  return relativeFormat.format(sign * Math.floor(distance / DAY), 'day');
}
