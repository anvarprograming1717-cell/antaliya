import { Router, type IRouter } from "express";
import { eq, desc } from "drizzle-orm";
import { db, customersTable, notificationsTable } from "@workspace/db";
import { getBotToken, handleTelegramWebhook } from "../telegram.js";
import multer from "multer";

const router: IRouter = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

async function sendTelegramPhoto(token: string, chatId: string, photoBuffer: Buffer, caption: string): Promise<void> {
  try {
    const form = new FormData();
    form.append("chat_id", chatId);
    form.append("caption", `🔔 <b>Xabarnoma</b>\n\n${caption}`);
    form.append("parse_mode", "HTML");
    form.append("photo", new Blob([photoBuffer], { type: "image/jpeg" }), "photo.jpg");
    await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: "POST",
      body: form,
    });
  } catch (_) {}
}

async function sendTelegramText(token: string, chatId: string, text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: chatId, text: `🔔 <b>Xabarnoma</b>\n\n${text}`, parse_mode: "HTML" }),
    });
  } catch (_) {}
}

router.get("/notifications", async (req, res): Promise<void> => {
  const list = await db.select().from(notificationsTable).orderBy(desc(notificationsTable.createdAt)).limit(50);
  res.json(list.map(n => ({
    ...n,
    createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
  })));
});

router.post("/notifications/read", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (customerId) {
    await db.update(customersTable)
      .set({ lastNotificationReadAt: new Date() })
      .where(eq(customersTable.id, customerId));
  }
  res.json({ success: true });
});

router.delete("/notifications/:id", async (req, res): Promise<void> => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }
  await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
  res.json({ success: true });
});

router.post("/notifications/send", upload.single("image"), async (req, res): Promise<void> => {
  const message = req.body?.message;
  if (!message?.trim()) {
    res.status(400).json({ error: "Message required" });
    return;
  }

  const imageBuffer: Buffer | undefined = (req as any).file?.buffer;

  // Save only text to DB (image only goes to Telegram)
  await db.insert(notificationsTable).values({ message: message.trim() });

  const token = await getBotToken();
  if (token) {
    const customers = await db.select().from(customersTable);
    const linked = customers.filter(c => c.telegramId);
    await Promise.allSettled(
      linked.map(c => {
        if (imageBuffer) {
          return sendTelegramPhoto(token, c.telegramId!, imageBuffer, message.trim());
        } else {
          return sendTelegramText(token, c.telegramId!, message.trim());
        }
      })
    );
  }

  res.json({ success: true, message: "Xabarnoma yuborildi" });
});

router.post("/telegram-webhook", async (req, res): Promise<void> => {
  res.json({ success: true });
  try {
    await handleTelegramWebhook(req.body);
  } catch (_) {}
});

export default router;
