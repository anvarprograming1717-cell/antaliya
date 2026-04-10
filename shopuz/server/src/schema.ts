import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const categoriesTable = sqliteTable("categories", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  imageUrl: text("image_url"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const customersTable = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  phone: text("phone").notNull().unique(),
  name: text("name"),
  avatarUrl: text("avatar_url"),
  language: text("language").default("uz"),
  telegramId: text("telegram_id"),
  savedAddress: text("saved_address"),
  lastNotificationReadAt: text("last_notification_read_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const couriersTable = sqliteTable("couriers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone").notNull(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  lat: real("lat"),
  lng: real("lng"),
  locationUpdatedAt: text("location_updated_at"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const productsTable = sqliteTable("products", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  description: text("description"),
  price: real("price").notNull(),
  oldPrice: real("old_price"),
  images: text("images").notNull().default("[]"),
  categoryId: integer("category_id").references(() => categoriesTable.id),
  inStock: integer("in_stock", { mode: "boolean" }).notNull().default(true),
  unit: text("unit").notNull().default("dona"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const cartTable = sqliteTable("cart", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  quantity: integer("quantity").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const likedTable = sqliteTable("liked", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  productId: integer("product_id").notNull().references(() => productsTable.id),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const ordersTable = sqliteTable("orders", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  courierId: integer("courier_id").references(() => couriersTable.id),
  status: text("status").notNull().default("new"),
  deliveryMethod: text("delivery_method").notNull(),
  paymentMethod: text("payment_method").notNull(),
  address: text("address"),
  note: text("note"),
  promoCode: text("promo_code"),
  discountAmount: real("discount_amount").notNull().default(0),
  totalPrice: real("total_price").notNull(),
  deliveryFee: real("delivery_fee").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const orderItemsTable = sqliteTable("order_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  orderId: integer("order_id").notNull().references(() => ordersTable.id),
  productId: integer("product_id").notNull(),
  productName: text("product_name").notNull(),
  productImage: text("product_image"),
  quantity: integer("quantity").notNull(),
  price: real("price").notNull(),
});

export const messagesTable = sqliteTable("messages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  senderType: text("sender_type").notNull(),
  text: text("text").notNull().default(""),
  mediaUrl: text("media_url"),
  mediaType: text("media_type"),
  isRead: integer("is_read", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const bannersTable = sqliteTable("banners", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  imageUrl: text("image_url").notNull(),
  title: text("title"),
  link: text("link"),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  key: text("key").notNull().unique(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const promoCodesTable = sqliteTable("promo_codes", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  code: text("code").notNull().unique(),
  discountType: text("discount_type").notNull().default("fixed"),
  discountAmount: real("discount_amount").notNull(),
  maxUses: integer("max_uses"),
  usedCount: integer("used_count").notNull().default(0),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});

export const promoCodeUsagesTable = sqliteTable("promo_code_usages", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  promoCodeId: integer("promo_code_id").notNull().references(() => promoCodesTable.id),
  customerId: integer("customer_id").notNull().references(() => customersTable.id),
  orderId: integer("order_id"),
  usedAt: text("used_at").notNull().default(sql`(datetime('now'))`),
});

export const notificationsTable = sqliteTable("notifications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  message: text("message").notNull(),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
});
