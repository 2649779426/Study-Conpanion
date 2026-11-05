/** 所有业务日期都以北京时间为准，时间戳仍可保存 ISO UTC。 */
export function todayKey(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  return ["year", "month", "day"].map(type => parts.find(p => p.type === type)!.value).join("-");
}

export function beijingTime(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Shanghai", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(now);
}

export function shiftDay(day: string, offset: number): string {
  const date = new Date(`${day}T12:00:00+08:00`);
  date.setTime(date.getTime() + offset * 86400000);
  return todayKey(date);
}
