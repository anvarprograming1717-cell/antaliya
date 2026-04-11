import { mysqlTable, varchar, text, int, double, tinyint, datetime } from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

export const categoriesTable = mysqlTable("categories", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  imageUrl: text("image_url"),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});

export const customersTable = mysqlTable("customers", {
  id: int("id").primaryKey().autoincrement(),
  phone: varchar("phone", { length: 20 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  avatarUrl: text("avatar_url"),
  language: varchar("language", { length: 10 }).default("uz"),
  telegramId: varchar("telegram_id", { length: 100 }),
  savedAddress: text("saved_address"),
  lastNotificationReadAt: datetime("last_notification_read_at"),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});

export const couriersTable = mysqlTable("couriers", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  isActive: tinyint("is_active").notNull().default(1),
  lat: double("lat"),
  lng: double("lng"),
  locationUpdatedAt: datetime("location_updated_at"),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});

export const productsTable = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: double("price").notNull(),
  oldPrice: double("old_price"),
  images: text("images").notNull().default("[]"),
  categoryId: int("category_id"),
  inStock: tinyint("in_stock").notNull().default(1),
  unit: varchar("unit", { length: 50 }).notNull().default("dona"),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});

export const cartTable = mysqlTable("cart", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id").notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").notNull().default(1),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});

export const likedTable = mysqlTable("liked", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id").notNull(),
  productId: int("product_id").notNull(),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});

export const ordersTable = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id").notNull(),
  courierId: int("courier_id"),
  status: varchar("status", { length: 50 }).notNull().default("new"),
  deliveryMethod: varchar("delivery_method", { length: 50 }).notNull(),
  paymentMethod: varchar("payment_method", { length: 50 }).notNull(),
  address: text("address"),
  note: text("note"),
  promoCode: varchar("promo_code", { length: 100 }),
  discountAmount: double("discount_amount").notNull().default(0),
  totalPrice: double("total_price").notNull(),
  deliveryFee: double("delivery_fee").notNull().default(0),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});

export const orderItemsTable = mysqlTable("order_items", {
  id: int("id").primaryKey().autoincrement(),
  orderId: int("order_id").notNull(),
  productId: int("product_id").notNull(),
  productName: varchar("product_name", { length: 255 }).notNull(),
  productImage: text("product_image"),
  quantity: int("quantity").notNull(),
  price: double("price").notNull(),
});

export const messagesTable = mysqlTable("messages", {
  id: int("id").primaryKey().autoincrement(),
  customerId: int("customer_id").notNull(),
  senderType: varchar("sender_type", { length: 20 }).notNull(),
  text: text("text").notNull().default(""),
  mediaUrl: text("media_url"),
  mediaType: varchar("media_type", { length: 50 }),
  isRead: tinyint("is_read").notNull().default(0),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});

export const bannersTable = mysqlTable("banners", {
  id: int("id").primaryKey().autoincrement(),
  imageUrl: text("image_url").notNull(),
  title: varchar("title", { length: 255 }),
  link: text("link"),
  isActive: tinyint("is_active").notNull().default(1),
  sortOrder: int("sort_order").notNull().default(0),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});

export const settingsTable = mysqlTable("settings", {
  id: int("id").primaryKey().autoincrement(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: datetime("updated_at").notNull().default(sql`NOW()`),
});

export const promoCodesTable = mysqlTable("promo_codes", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  discountType: varchar("discount_type", { length: 20 }).notNull().default("fixed"),
  discountAmount: double("discount_amount").notNull(),
  maxUses: int("max_uses"),
  usedCount: int("used_count").notNull().default(0),
  isActive: tinyint("is_active").notNull().default(1),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});

export const promoCodeUsagesTable = mysqlTable("promo_code_usages", {
  id: int("id").primaryKey().autoincrement(),
  promoCodeId: int("promo_code_id").notNull(),
  customerId: int("customer_id").notNull(),
  orderId: int("order_id"),
  usedAt: datetime("used_at").notNull().default(sql`NOW()`),
});

export const notificationsTable = mysqlTable("notifications", {
  id: int("id").primaryKey().autoincrement(),
  message: text("message").notNull(),
  createdAt: datetime("created_at").notNull().default(sql`NOW()`),
});
