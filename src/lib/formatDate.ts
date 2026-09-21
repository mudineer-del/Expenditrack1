/** Date plus time — for upload/save timestamps, where the time of day is part of the answer. */
export function fmtDateTime(d: string | undefined | null): string {
  if (!d) return ""
  const parsed = new Date(d)
  if (isNaN(parsed.getTime())) return d
  return parsed.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })
}
