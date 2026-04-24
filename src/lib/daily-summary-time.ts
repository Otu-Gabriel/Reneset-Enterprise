const HM_RE = /^([01]?\d|2[0-3]):([0-5]\d)$/;

/**
 * True when HH:MM is 00:00. The "sales today" window would be from midnight
 * through the same instant — use any other time (e.g. 00:01) instead.
 */
export function isMidnightEndWindowTime(hm: string): boolean {
  const m = HM_RE.exec(hm?.trim() || "");
  if (!m) return false;
  return parseInt(m[1], 10) === 0 && parseInt(m[2], 10) === 0;
}
