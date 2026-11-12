import { counts } from "./inspection.ts";
import type { InspectionDraft } from "./inspection.ts";
export function score(draft: InspectionDraft) {
  const c = counts(draft);
  const applicable = c.pass + c.fail;
  return {
    ...c,
    applicable,
    percentage: applicable ? Math.round((100 * c.pass) / applicable) : null,
  };
}
export function validDueDate(value: string) {
  if (
    !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
    !Number.isFinite(Date.parse(value + "T12:00:00Z")) ||
    new Date(value + "T12:00:00Z").toISOString().slice(0, 10) !== value
  )
    throw Error("Enter a valid due date as YYYY-MM-DD.");
  return value;
}
export function displayDate(value: string, timeZone = "Europe/London") {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
      timeZone,
    }).format(new Date(value.length === 10 ? value + "T12:00:00Z" : value));
  } catch {
    return value;
  }
}
export function dueToday(timeZone = "Europe/London", now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function requiredText(value: string, label: string, max = 2000) {
  const v = value.trim();
  if (!v || v.length > max) throw Error(`${label}: enter 1–${max} characters.`);
  return v;
}
