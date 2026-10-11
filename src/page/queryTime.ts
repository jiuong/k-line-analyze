/**
 * `datetime-local` value (no offset) as the machine's local wall time,
 * returned as UTC Unix seconds. Empty input stays omitted.
 */
export function datetimeLocalToUnix(value: string): number | undefined {
  const trimmed = value.trim();
  if (!trimmed) {
    return undefined;
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(
    trimmed,
  );
  if (!match) {
    throw new Error(
      `Invalid local time "${value}"; use the calendar control`,
    );
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  const second = match[6] ? Number(match[6]) : 0;
  const ms = new Date(year, month - 1, day, hour, minute, second).getTime();
  if (Number.isNaN(ms)) {
    throw new Error(`Invalid local time "${value}"`);
  }
  return Math.floor(ms / 1000);
}
