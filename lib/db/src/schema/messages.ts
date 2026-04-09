import { pgTable, serial, integer, text, boolean, timestamp } from "drizzle-orm/pg-core";
import { customersTable } from "./customers";

export const messagesTable = pgTable("messages", {
  id: serial("id").primaryKey(),
  customerId: integer("customer_id").notNull().references(() => customersTable.id, { onDelete: "cascade" }),
  senderType: text("sender_type", { enum: ["customer", "admin"] }).notNull(),
  text: text("text").notNull().default(""),
  mediaUrl: text("media_url"),
  mediaType: text("media_type", { enum: ["image", "video"] }),
  isRead: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type Message = typeof messagesTable.$inferSelect;
