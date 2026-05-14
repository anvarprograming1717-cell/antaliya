import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, customersTable } from "@workspace/db";
import {
  SearchCustomerBody,
  LoginCustomerBody,
  UpdateMeBody,
} from "@workspace/api-zod";
import crypto from "crypto";
import { getBotToken } from "../telegram.js";

function serializeCustomer(c: any) {
  return {
    id: c.id,
    phone: c.phone,
    name: c.name ?? null,
    avatarUrl: c.avatarUrl ?? null,
    language: c.language ?? null,
    telegramId: c.telegramId ?? null,
    coins: c.coins ?? 0,
    createdAt: c.createdAt instanceof Date ? c.createdAt.toISOString() : c.createdAt,
  };
}

function validateTelegramInitData(
  initData: string,
  botToken: string
): { valid: boolean; userId?: string; firstName?: string; username?: string } {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get("hash");
    if (!hash) return { valid: false };

    params.delete("hash");
    const entries = [...params.entries()].sort(([a], [b]) => a.localeCompare(b));
    const dataCheckString = entries.map(([k, v]) => `${k}=${v}`).join("\n");

    const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
    const computedHash = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");

    if (computedHash !== hash) return { valid: false };

    const userParam = params.get("user");
    if (!userParam) return { valid: true };

    const user = JSON.parse(userParam);
    return {
      valid: true,
      userId: String(user.id),
      firstName: user.first_name ?? undefined,
      username: user.username ?? undefined,
    };
  } catch {
    return { valid: false };
  }
}

const router: IRouter = Router();

router.post("/customers/telegram-auth", async (req, res): Promise<void> => {
  const { initData } = req.body;
  if (!initData) {
    res.status(400).json({ error: "initData required" });
    return;
  }

  const token = await getBotToken();
  if (!token) {
    res.status(400).json({ error: "Bot token not configured" });
    return;
  }

  const { valid, userId, firstName } = validateTelegramInitData(initData, token);
  if (!valid || !userId) {
    res.status(401).json({ error: "Invalid initData" });
    return;
  }

  // Find existing customer by telegramId
  const existing = await db.select().from(customersTable)
    .where(eq(customersTable.telegramId, userId))
    .limit(1);

  if (existing.length > 0) {
    res.json({ customer: serializeCustomer(existing[0]), telegramId: userId });
    return;
  }

  // Not registered yet — return suggestedName so frontend can pre-fill
  res.json({ customer: null, suggestedName: firstName ?? null, telegramId: userId });
});

router.post("/customers/search", async (req, res): Promise<void> => {
  const parsed = SearchCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const customer = await db.select().from(customersTable).where(eq(customersTable.phone, parsed.data.phone)).limit(1);
  if (customer.length === 0) {
    res.json({ exists: false, customer: null });
    return;
  }
  res.json({ exists: true, customer: serializeCustomer(customer[0]) });
});

router.post("/customers/login", async (req, res): Promise<void> => {
  const parsed = LoginCustomerBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const existing = await db.select().from(customersTable).where(eq(customersTable.phone, parsed.data.phone)).limit(1);
  let customer = existing[0];
  if (!customer) {
    const [created] = await db.insert(customersTable).values({
      phone: parsed.data.phone,
      name: parsed.data.name ?? null,
    }).returning();
    customer = created;
  } else if (parsed.data.name && !customer.name) {
    const [updated] = await db.update(customersTable)
      .set({ name: parsed.data.name })
      .where(eq(customersTable.id, customer.id))
      .returning();
    customer = updated;
  }
  res.json(serializeCustomer(customer));
});

router.get("/customers/me", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, customerId));
  if (!customer) {
    res.status(404).json({ error: "Customer not found" });
    return;
  }
  res.json(serializeCustomer(customer));
});

router.patch("/customers/me", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const parsed = UpdateMeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [customer] = await db.update(customersTable)
    .set(parsed.data)
    .where(eq(customersTable.id, customerId))
    .returning();
  res.json(serializeCustomer(customer));
});

router.post("/customers/link-telegram", async (req, res): Promise<void> => {
  const customerId = (req as any).customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { telegramId } = req.body;
  if (!telegramId) {
    res.status(400).json({ error: "telegramId required" });
    return;
  }
  const tid = String(telegramId);
  // Remove this telegramId from any other customer who currently has it
  await db.update(customersTable)
    .set({ telegramId: null })
    .where(eq(customersTable.telegramId, tid));
  // Link to current customer
  const [customer] = await db.update(customersTable)
    .set({ telegramId: tid })
    .where(eq(customersTable.id, customerId))
    .returning();
  res.json(serializeCustomer(customer));
});

router.post("/customers/logout", async (req, res): Promise<void> => {
  res.json({ success: true });
});

// Normalize Telegram phone_number to +998XXXXXXXXX format
function normalizePhone(raw: string): string {
  const digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("998") && digits.length === 12) return "+" + digits;
  if (digits.startsWith("8") && digits.length === 11) return "+7" + digits.slice(1);
  if (digits.length === 9) return "+998" + digits;
  return "+" + digits;
}

// Register/link customer via Telegram contact (called from Mini App after requestContact)
router.post("/telegram/register-contact", async (req, res): Promise<void> => {
  const { phone, firstName, lastName, telegramId, initData } = req.body;

  if (!telegramId) {
    res.status(400).json({ error: "telegramId required" });
    return;
  }

  // Optional: validate initData if provided
  let validatedTelegramId: string = String(telegramId);
  if (initData) {
    const token = await getBotToken();
    if (token) {
      const { valid, userId } = validateTelegramInitData(initData, token);
      if (valid && userId) validatedTelegramId = userId;
    }
  }

  const tid = validatedTelegramId;

  // 1. Check if already linked by telegramId
  const byTelegram = await db.select().from(customersTable)
    .where(eq(customersTable.telegramId, tid)).limit(1);
  if (byTelegram.length > 0) {
    // Already registered & linked
    res.json({ customer: serializeCustomer(byTelegram[0]), isNew: false });
    return;
  }

  // 2. Find by phone if provided
  if (phone) {
    const normalizedPhone = normalizePhone(phone);
    const suffix = normalizedPhone.replace(/[^\d]/g, "").slice(-9);

    // Search all customers for suffix match
    const allCustomers = await db.select().from(customersTable);
    const matched = allCustomers.find(c => {
      if (!c.phone) return false;
      const cd = c.phone.replace(/[^\d]/g, "");
      return cd === normalizedPhone.replace(/[^\d]/g, "") || cd.endsWith(suffix);
    });

    if (matched) {
      // Link telegramId to existing customer
      const [updated] = await db.update(customersTable)
        .set({ telegramId: tid, name: matched.name || (firstName ?? null) })
        .where(eq(customersTable.id, matched.id))
        .returning();
      res.json({ customer: serializeCustomer(updated), isNew: false });
      return;
    }

    // 3. Create new customer with phone from Telegram
    const fullName = [firstName, lastName].filter(Boolean).join(" ") || "Telegram foydalanuvchi";
    const [created] = await db.insert(customersTable).values({
      phone: normalizedPhone,
      name: fullName,
      telegramId: tid,
    }).returning();
    res.json({ customer: serializeCustomer(created), isNew: true });
    return;
  }

  // No phone provided and not linked yet
  res.status(400).json({ error: "phone required for new registration" });
});

// Check if telegramId is linked (for polling after bot contact flow)
router.get("/telegram/check-link", async (req, res): Promise<void> => {
  const telegramId = req.query.telegramId as string;
  if (!telegramId) {
    res.status(400).json({ error: "telegramId required" });
    return;
  }
  const [customer] = await db.select().from(customersTable)
    .where(eq(customersTable.telegramId, telegramId)).limit(1);
  if (customer) {
    res.json({ linked: true, customer: serializeCustomer(customer) });
  } else {
    res.json({ linked: false });
  }
});

export default router;
