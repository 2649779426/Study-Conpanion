import "server-only";

import { appendFileSync, mkdirSync } from "fs";
import path from "path";

export type SmsPayload = {
  phone: string;
  content: string;
  userId: string;
};

function dataRoot() {
  return process.env.DATA_DIR || path.join(process.cwd(), "data");
}

function appendOutbox(entry: Record<string, unknown>) {
  mkdirSync(dataRoot(), { recursive: true });
  const line = `${JSON.stringify({ ...entry, at: new Date().toISOString() })}\n`;
  appendFileSync(path.join(dataRoot(), "sms-outbox.jsonl"), line, "utf8");
}

/**
 * 发送短信：
 * 1) 若配置 SMS_WEBHOOK_URL，则 POST { phone, content }
 * 2) 始终写入本地 outbox，便于验收
 */
export async function sendSms(payload: SmsPayload) {
  const webhook = process.env.SMS_WEBHOOK_URL?.trim();
  let channel: "webhook" | "outbox" = "outbox";
  let ok = true;
  let detail = "written to outbox";

  if (webhook) {
    channel = "webhook";
    try {
      const res = await fetch(webhook, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.SMS_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${process.env.SMS_WEBHOOK_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({
          phone: payload.phone,
          content: payload.content,
          userId: payload.userId,
        }),
      });
      ok = res.ok;
      detail = `webhook status ${res.status}`;
    } catch (error) {
      ok = false;
      detail = error instanceof Error ? error.message : "webhook failed";
    }
  }

  appendOutbox({
    phone: payload.phone,
    content: payload.content,
    userId: payload.userId,
    channel,
    ok,
    detail,
  });

  return { ok, channel, detail };
}
