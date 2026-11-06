import "server-only";

import { listUsers, readUserStore, writeUserStore } from "@/lib/auth/db";
import { sendSms } from "@/lib/sms/send";

function shanghaiNow() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return {
    date: `${get("year")}-${get("month")}-${get("day")}`,
    time: `${get("hour")}:${get("minute")}`,
  };
}

function visitedToday(lastVisitAt: string | undefined, today: string) {
  if (!lastVisitAt) return false;
  // Compare by Shanghai calendar day of the visit timestamp
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date(lastVisitAt));
  const get = (type: string) =>
    parts.find((p) => p.type === type)?.value ?? "";
  const visitDate = `${get("year")}-${get("month")}-${get("day")}`;
  return visitDate === today;
}

export async function runSmsReminders() {
  const { date: today, time: nowHm } = shanghaiNow();
  const users = listUsers();
  const results: {
    userId: string;
    phone: string;
    status: string;
  }[] = [];

  for (const user of users) {
    const store = readUserStore(user.id);
    if (!store.smsReminderEnabled) {
      results.push({ userId: user.id, phone: user.phone, status: "disabled" });
      continue;
    }
    const remindAt = store.smsReminderTime || "14:00";
    if (nowHm < remindAt) {
      results.push({ userId: user.id, phone: user.phone, status: "too_early" });
      continue;
    }
    if (store.smsLastSentDate === today) {
      results.push({ userId: user.id, phone: user.phone, status: "already_sent" });
      continue;
    }
    if (visitedToday(store.lastVisitAt, today)) {
      results.push({ userId: user.id, phone: user.phone, status: "visited" });
      continue;
    }

    const name = store.userName || "同学";
    const content = `【考研督学】${name}，到点啦！今天还没打开督学页面，先来打个卡，别把节奏落下。`;
    const sent = await sendSms({
      phone: user.phone,
      content,
      userId: user.id,
    });

    if (sent.ok) {
      writeUserStore(user.id, { ...store, smsLastSentDate: today });
      results.push({
        userId: user.id,
        phone: user.phone,
        status: `sent:${sent.channel}`,
      });
    } else {
      results.push({
        userId: user.id,
        phone: user.phone,
        status: `fail:${sent.detail}`,
      });
    }
  }

  return { today, nowHm, results };
}
