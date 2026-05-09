import { pgTable, serial, text, numeric, timestamp, boolean } from "drizzle-orm/pg-core";

export const couriersTable = pgTable("couriers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  telegramId: text("telegram_id"),
  lat: numeric("lat", { precision: 10, scale: 7 }),
  lng: numeric("lng", { precision: 10, scale: 7 }),
  locationUpdatedAt: timestamp("location_updated_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Courier = typeof couriersTable.$inferSelect;
