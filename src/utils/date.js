/** ISO 周一为一周起点，所有周计算都走这里，避免各地自己算出现「同一周两份周报」。 */
export function mondayOf(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export function toISODate(date) {
  const d = new Date(date);
  const m = `${d.getMonth() + 1}`.padStart(2, "0");
  const day = `${d.getDate()}`.padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function isoWeekNumber(date) {
  const d = new Date(Date.UTC(new Date(date).getFullYear(), new Date(date).getMonth(), new Date(date).getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

/** 「2026 第 43 周」 */
export function weekLabel(weekStart) {
  const d = new Date(`${weekStart}T00:00:00`);
  return `${d.getFullYear()} 第 ${isoWeekNumber(d)} 周`;
}

/** 「10.19 - 10.25」 */
export function weekRange(weekStart) {
  const start = new Date(`${weekStart}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (d) => `${`${d.getMonth() + 1}`.padStart(2, "0")}.${`${d.getDate()}`.padStart(2, "0")}`;
  return `${fmt(start)} - ${fmt(end)}`;
}

export function formatDateTime(value) {
  if (!value) return "—";
  const d = new Date(value.replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return value;
  const p = (n) => `${n}`.padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export function shiftWeeks(weekStart, delta) {
  const d = new Date(`${weekStart}T00:00:00`);
  d.setDate(d.getDate() + delta * 7);
  return toISODate(d);
}

/** 次周一 10:00 为截止时间 */
export function deadlineOf(weekStart) {
  const d = new Date(`${weekStart}T00:00:00`);
  d.setDate(d.getDate() + 7);
  d.setHours(10, 0, 0, 0);
  return d;
}
