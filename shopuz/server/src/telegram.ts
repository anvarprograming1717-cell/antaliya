import { db, settingsTable } from "@workspace/db";

export async function getAdminIds(): Promise<string[]> {
  const rows = await db.select().from(settingsTable);
  const map: Record<string, string> = {};
  rows.forEach(r => { map[r.key] = r.value; });
  const raw = map.telegramAdminIds;
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

export async function sendTelegramToAdmins(text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) return;
  const ids = await getAdminIds();
  if (ids.length === 0) return;
  await Promise.allSettled(
    ids.map(id =>
      fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chat_id: id, text, parse_mode: "HTML" }),
      })
    )
  );
}
