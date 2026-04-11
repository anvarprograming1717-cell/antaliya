"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_express14 = __toESM(require("express"), 1);
var import_cors = __toESM(require("cors"), 1);
var import_path2 = __toESM(require("path"), 1);
var import_fs2 = require("fs");

// src/db.ts
var import_promise = __toESM(require("mysql2/promise"), 1);
var import_mysql2 = require("drizzle-orm/mysql2");

// src/schema.ts
var schema_exports = {};
__export(schema_exports, {
  bannersTable: () => bannersTable,
  cartTable: () => cartTable,
  categoriesTable: () => categoriesTable,
  couriersTable: () => couriersTable,
  customersTable: () => customersTable,
  likedTable: () => likedTable,
  messagesTable: () => messagesTable,
  notificationsTable: () => notificationsTable,
  orderItemsTable: () => orderItemsTable,
  ordersTable: () => ordersTable,
  productsTable: () => productsTable,
  promoCodeUsagesTable: () => promoCodeUsagesTable,
  promoCodesTable: () => promoCodesTable,
  settingsTable: () => settingsTable
});
var import_mysql_core = require("drizzle-orm/mysql-core");
var import_drizzle_orm = require("drizzle-orm");
var categoriesTable = (0, import_mysql_core.mysqlTable)("categories", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  name: (0, import_mysql_core.varchar)("name", { length: 255 }).notNull(),
  imageUrl: (0, import_mysql_core.text)("image_url"),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var customersTable = (0, import_mysql_core.mysqlTable)("customers", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  phone: (0, import_mysql_core.varchar)("phone", { length: 20 }).notNull().unique(),
  name: (0, import_mysql_core.varchar)("name", { length: 255 }),
  avatarUrl: (0, import_mysql_core.text)("avatar_url"),
  language: (0, import_mysql_core.varchar)("language", { length: 10 }).default("uz"),
  telegramId: (0, import_mysql_core.varchar)("telegram_id", { length: 100 }),
  savedAddress: (0, import_mysql_core.text)("saved_address"),
  lastNotificationReadAt: (0, import_mysql_core.datetime)("last_notification_read_at"),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var couriersTable = (0, import_mysql_core.mysqlTable)("couriers", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  name: (0, import_mysql_core.varchar)("name", { length: 255 }).notNull(),
  phone: (0, import_mysql_core.varchar)("phone", { length: 20 }).notNull(),
  username: (0, import_mysql_core.varchar)("username", { length: 100 }).notNull().unique(),
  password: (0, import_mysql_core.varchar)("password", { length: 255 }).notNull(),
  isActive: (0, import_mysql_core.tinyint)("is_active").notNull().default(1),
  lat: (0, import_mysql_core.double)("lat"),
  lng: (0, import_mysql_core.double)("lng"),
  locationUpdatedAt: (0, import_mysql_core.datetime)("location_updated_at"),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var productsTable = (0, import_mysql_core.mysqlTable)("products", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  name: (0, import_mysql_core.varchar)("name", { length: 255 }).notNull(),
  description: (0, import_mysql_core.text)("description"),
  price: (0, import_mysql_core.double)("price").notNull(),
  oldPrice: (0, import_mysql_core.double)("old_price"),
  images: (0, import_mysql_core.text)("images").notNull().default("[]"),
  categoryId: (0, import_mysql_core.int)("category_id"),
  inStock: (0, import_mysql_core.tinyint)("in_stock").notNull().default(1),
  unit: (0, import_mysql_core.varchar)("unit", { length: 50 }).notNull().default("dona"),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var cartTable = (0, import_mysql_core.mysqlTable)("cart", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  customerId: (0, import_mysql_core.int)("customer_id").notNull(),
  productId: (0, import_mysql_core.int)("product_id").notNull(),
  quantity: (0, import_mysql_core.int)("quantity").notNull().default(1),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var likedTable = (0, import_mysql_core.mysqlTable)("liked", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  customerId: (0, import_mysql_core.int)("customer_id").notNull(),
  productId: (0, import_mysql_core.int)("product_id").notNull(),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var ordersTable = (0, import_mysql_core.mysqlTable)("orders", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  customerId: (0, import_mysql_core.int)("customer_id").notNull(),
  courierId: (0, import_mysql_core.int)("courier_id"),
  status: (0, import_mysql_core.varchar)("status", { length: 50 }).notNull().default("new"),
  deliveryMethod: (0, import_mysql_core.varchar)("delivery_method", { length: 50 }).notNull(),
  paymentMethod: (0, import_mysql_core.varchar)("payment_method", { length: 50 }).notNull(),
  address: (0, import_mysql_core.text)("address"),
  note: (0, import_mysql_core.text)("note"),
  promoCode: (0, import_mysql_core.varchar)("promo_code", { length: 100 }),
  discountAmount: (0, import_mysql_core.double)("discount_amount").notNull().default(0),
  totalPrice: (0, import_mysql_core.double)("total_price").notNull(),
  deliveryFee: (0, import_mysql_core.double)("delivery_fee").notNull().default(0),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var orderItemsTable = (0, import_mysql_core.mysqlTable)("order_items", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  orderId: (0, import_mysql_core.int)("order_id").notNull(),
  productId: (0, import_mysql_core.int)("product_id").notNull(),
  productName: (0, import_mysql_core.varchar)("product_name", { length: 255 }).notNull(),
  productImage: (0, import_mysql_core.text)("product_image"),
  quantity: (0, import_mysql_core.int)("quantity").notNull(),
  price: (0, import_mysql_core.double)("price").notNull()
});
var messagesTable = (0, import_mysql_core.mysqlTable)("messages", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  customerId: (0, import_mysql_core.int)("customer_id").notNull(),
  senderType: (0, import_mysql_core.varchar)("sender_type", { length: 20 }).notNull(),
  text: (0, import_mysql_core.text)("text").notNull().default(""),
  mediaUrl: (0, import_mysql_core.text)("media_url"),
  mediaType: (0, import_mysql_core.varchar)("media_type", { length: 50 }),
  isRead: (0, import_mysql_core.tinyint)("is_read").notNull().default(0),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var bannersTable = (0, import_mysql_core.mysqlTable)("banners", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  imageUrl: (0, import_mysql_core.text)("image_url").notNull(),
  title: (0, import_mysql_core.varchar)("title", { length: 255 }),
  link: (0, import_mysql_core.text)("link"),
  isActive: (0, import_mysql_core.tinyint)("is_active").notNull().default(1),
  sortOrder: (0, import_mysql_core.int)("sort_order").notNull().default(0),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var settingsTable = (0, import_mysql_core.mysqlTable)("settings", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  key: (0, import_mysql_core.varchar)("key", { length: 100 }).notNull().unique(),
  value: (0, import_mysql_core.text)("value").notNull(),
  updatedAt: (0, import_mysql_core.datetime)("updated_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var promoCodesTable = (0, import_mysql_core.mysqlTable)("promo_codes", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  code: (0, import_mysql_core.varchar)("code", { length: 100 }).notNull().unique(),
  discountType: (0, import_mysql_core.varchar)("discount_type", { length: 20 }).notNull().default("fixed"),
  discountAmount: (0, import_mysql_core.double)("discount_amount").notNull(),
  maxUses: (0, import_mysql_core.int)("max_uses"),
  usedCount: (0, import_mysql_core.int)("used_count").notNull().default(0),
  isActive: (0, import_mysql_core.tinyint)("is_active").notNull().default(1),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var promoCodeUsagesTable = (0, import_mysql_core.mysqlTable)("promo_code_usages", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  promoCodeId: (0, import_mysql_core.int)("promo_code_id").notNull(),
  customerId: (0, import_mysql_core.int)("customer_id").notNull(),
  orderId: (0, import_mysql_core.int)("order_id"),
  usedAt: (0, import_mysql_core.datetime)("used_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});
var notificationsTable = (0, import_mysql_core.mysqlTable)("notifications", {
  id: (0, import_mysql_core.int)("id").primaryKey().autoincrement(),
  message: (0, import_mysql_core.text)("message").notNull(),
  createdAt: (0, import_mysql_core.datetime)("created_at").notNull().default(import_drizzle_orm.sql`NOW()`)
});

// src/db.ts
var pool = import_promise.default.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "shopuz",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  multipleStatements: true
});
var db = (0, import_mysql2.drizzle)(pool, { schema: schema_exports, mode: "default" });
async function initDb() {
  const conn = await pool.getConnection();
  try {
    await conn.query(`
      CREATE TABLE IF NOT EXISTS categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        image_url TEXT,
        created_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS customers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        phone VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(255),
        avatar_url TEXT,
        language VARCHAR(10) DEFAULT 'uz',
        telegram_id VARCHAR(100),
        saved_address TEXT,
        last_notification_read_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS couriers (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        phone VARCHAR(20) NOT NULL,
        username VARCHAR(100) NOT NULL UNIQUE,
        password VARCHAR(255) NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        lat DOUBLE,
        lng DOUBLE,
        location_updated_at DATETIME,
        created_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS products (
        id INT AUTO_INCREMENT PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        price DOUBLE NOT NULL,
        old_price DOUBLE,
        images TEXT NOT NULL DEFAULT '[]',
        category_id INT,
        in_stock TINYINT(1) NOT NULL DEFAULT 1,
        unit VARCHAR(50) NOT NULL DEFAULT 'dona',
        created_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS cart (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        product_id INT NOT NULL,
        quantity INT NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS liked (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        product_id INT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        courier_id INT,
        status VARCHAR(50) NOT NULL DEFAULT 'new',
        delivery_method VARCHAR(50) NOT NULL,
        payment_method VARCHAR(50) NOT NULL,
        address TEXT,
        note TEXT,
        promo_code VARCHAR(100),
        discount_amount DOUBLE NOT NULL DEFAULT 0,
        total_price DOUBLE NOT NULL,
        delivery_fee DOUBLE NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_items (
        id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        product_id INT NOT NULL,
        product_name VARCHAR(255) NOT NULL,
        product_image TEXT,
        quantity INT NOT NULL,
        price DOUBLE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS messages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        sender_type VARCHAR(20) NOT NULL,
        text TEXT NOT NULL DEFAULT '',
        media_url TEXT,
        media_type VARCHAR(50),
        is_read TINYINT(1) NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS banners (
        id INT AUTO_INCREMENT PRIMARY KEY,
        image_url TEXT NOT NULL,
        title VARCHAR(255),
        link TEXT,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        sort_order INT NOT NULL DEFAULT 0,
        created_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS settings (
        id INT AUTO_INCREMENT PRIMARY KEY,
        \`key\` VARCHAR(100) NOT NULL UNIQUE,
        value TEXT NOT NULL,
        updated_at DATETIME NOT NULL DEFAULT NOW() ON UPDATE NOW()
      );

      CREATE TABLE IF NOT EXISTS promo_codes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        code VARCHAR(100) NOT NULL UNIQUE,
        discount_type VARCHAR(20) NOT NULL DEFAULT 'fixed',
        discount_amount DOUBLE NOT NULL,
        max_uses INT,
        used_count INT NOT NULL DEFAULT 0,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS promo_code_usages (
        id INT AUTO_INCREMENT PRIMARY KEY,
        promo_code_id INT NOT NULL,
        customer_id INT NOT NULL,
        order_id INT,
        used_at DATETIME NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notifications (
        id INT AUTO_INCREMENT PRIMARY KEY,
        message TEXT NOT NULL,
        created_at DATETIME NOT NULL DEFAULT NOW()
      );
    `);
    await conn.query(`
      INSERT IGNORE INTO settings (\`key\`, value) VALUES
        ('siteName', 'ShopUz'),
        ('adminPassword', 'admin123'),
        ('deliveryFee', '15000'),
        ('freeDeliveryThreshold', '300000'),
        ('supportPhone', '+998901234567'),
        ('supportTelegram', '@shopuz');
    `);
    console.log("\u2705 MySQL database ready");
  } finally {
    conn.release();
  }
}
initDb().catch((err) => {
  console.error("\u274C Database init error:", err.message);
  process.exit(1);
});

// src/routes/auth.ts
var import_express = require("express");
var import_drizzle_orm2 = require("drizzle-orm");
var router = (0, import_express.Router)();
function serializeCustomer(c) {
  return {
    id: c.id,
    phone: c.phone,
    name: c.name ?? null,
    avatarUrl: c.avatarUrl ?? null,
    language: c.language ?? "uz",
    savedAddress: c.savedAddress ?? null,
    lastNotificationReadAt: c.lastNotificationReadAt ?? null,
    createdAt: c.createdAt
  };
}
router.post("/customers/search", async (req, res) => {
  const { phone } = req.body;
  if (!phone) {
    res.status(400).json({ error: "phone required" });
    return;
  }
  const [customer] = await db.select().from(customersTable).where((0, import_drizzle_orm2.eq)(customersTable.phone, phone)).limit(1);
  if (!customer) {
    res.json({ exists: false, customer: null });
    return;
  }
  res.json({ exists: true, customer: serializeCustomer(customer) });
});
router.post("/customers/login", async (req, res) => {
  const { phone, name } = req.body;
  if (!phone) {
    res.status(400).json({ error: "phone required" });
    return;
  }
  const existing = await db.select().from(customersTable).where((0, import_drizzle_orm2.eq)(customersTable.phone, phone)).limit(1);
  let customer = existing[0];
  if (!customer) {
    const [created] = await db.insert(customersTable).values({ phone, name: name ?? null }).returning();
    customer = created;
  } else if (name && !customer.name) {
    const [updated] = await db.update(customersTable).set({ name }).where((0, import_drizzle_orm2.eq)(customersTable.id, customer.id)).returning();
    customer = updated;
  }
  res.json(serializeCustomer(customer));
});
router.get("/customers/me", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const [customer] = await db.select().from(customersTable).where((0, import_drizzle_orm2.eq)(customersTable.id, customerId));
  if (!customer) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(serializeCustomer(customer));
});
router.patch("/customers/me", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { name, language } = req.body;
  const updates = {};
  if (name !== void 0) updates.name = name;
  if (language !== void 0) updates.language = language;
  const [customer] = await db.update(customersTable).set(updates).where((0, import_drizzle_orm2.eq)(customersTable.id, customerId)).returning();
  res.json(serializeCustomer(customer));
});
router.post("/customers/logout", async (_req, res) => {
  res.json({ success: true });
});
var auth_default = router;

// src/routes/products.ts
var import_express2 = require("express");
var import_drizzle_orm3 = require("drizzle-orm");
var router2 = (0, import_express2.Router)();
router2.get("/products", async (req, res) => {
  const customerId = req.customerId;
  const categoryId = req.query.categoryId ? parseInt(req.query.categoryId) : void 0;
  const search = req.query.search;
  const page = parseInt(req.query.page || "1");
  const limit = parseInt(req.query.limit || "20");
  const offset = (page - 1) * limit;
  const conditions = [];
  if (categoryId) conditions.push((0, import_drizzle_orm3.eq)(productsTable.categoryId, categoryId));
  if (search) conditions.push((0, import_drizzle_orm3.like)(productsTable.name, `%${search}%`));
  const where = conditions.length > 0 ? (0, import_drizzle_orm3.and)(...conditions) : void 0;
  const [products, countResult] = await Promise.all([
    db.select({
      id: productsTable.id,
      name: productsTable.name,
      description: productsTable.description,
      price: productsTable.price,
      oldPrice: productsTable.oldPrice,
      images: productsTable.images,
      categoryId: productsTable.categoryId,
      categoryName: categoriesTable.name,
      inStock: productsTable.inStock,
      unit: productsTable.unit,
      createdAt: productsTable.createdAt
    }).from(productsTable).leftJoin(categoriesTable, (0, import_drizzle_orm3.eq)(productsTable.categoryId, categoriesTable.id)).where(where).limit(limit).offset(offset),
    db.select({ count: import_drizzle_orm3.sql`count(*)` }).from(productsTable).where(where)
  ]);
  let likedIds = /* @__PURE__ */ new Set();
  if (customerId) {
    const liked = await db.select({ productId: likedTable.productId }).from(likedTable).where((0, import_drizzle_orm3.eq)(likedTable.customerId, customerId));
    likedIds = new Set(liked.map((l) => l.productId));
  }
  res.json({
    products: products.map((p) => ({
      ...p,
      images: typeof p.images === "string" ? JSON.parse(p.images) : p.images,
      isLiked: likedIds.has(p.id)
    })),
    total: Number(countResult[0].count),
    page,
    limit
  });
});
router2.post("/products", async (req, res) => {
  const { name, description, price, oldPrice, images, categoryId, inStock, unit } = req.body;
  if (!name || price === void 0) {
    res.status(400).json({ error: "name and price required" });
    return;
  }
  const [product] = await db.insert(productsTable).values({
    name,
    description: description ?? null,
    price,
    oldPrice: oldPrice ?? null,
    images: JSON.stringify(images ?? []),
    categoryId: categoryId ?? null,
    inStock: inStock !== false,
    unit: unit ?? "dona"
  }).returning();
  res.status(201).json({ ...product, images: JSON.parse(product.images), isLiked: false });
});
router2.get("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const customerId = req.customerId;
  const [product] = await db.select({
    id: productsTable.id,
    name: productsTable.name,
    description: productsTable.description,
    price: productsTable.price,
    oldPrice: productsTable.oldPrice,
    images: productsTable.images,
    categoryId: productsTable.categoryId,
    categoryName: categoriesTable.name,
    inStock: productsTable.inStock,
    unit: productsTable.unit,
    createdAt: productsTable.createdAt
  }).from(productsTable).leftJoin(categoriesTable, (0, import_drizzle_orm3.eq)(productsTable.categoryId, categoriesTable.id)).where((0, import_drizzle_orm3.eq)(productsTable.id, id));
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  let isLiked = false;
  if (customerId) {
    const liked = await db.select().from(likedTable).where((0, import_drizzle_orm3.and)((0, import_drizzle_orm3.eq)(likedTable.customerId, customerId), (0, import_drizzle_orm3.eq)(likedTable.productId, id)));
    isLiked = liked.length > 0;
  }
  res.json({ ...product, images: typeof product.images === "string" ? JSON.parse(product.images) : product.images, isLiked });
});
router2.patch("/products/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const updates = {};
  const { name, description, price, oldPrice, images, categoryId, inStock, unit } = req.body;
  if (name !== void 0) updates.name = name;
  if (description !== void 0) updates.description = description;
  if (price !== void 0) updates.price = price;
  if (oldPrice !== void 0) updates.oldPrice = oldPrice;
  if (images !== void 0) updates.images = JSON.stringify(images);
  if (categoryId !== void 0) updates.categoryId = categoryId;
  if (inStock !== void 0) updates.inStock = inStock;
  if (unit !== void 0) updates.unit = unit;
  const [product] = await db.update(productsTable).set(updates).where((0, import_drizzle_orm3.eq)(productsTable.id, id)).returning();
  if (!product) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json({ ...product, images: typeof product.images === "string" ? JSON.parse(product.images) : product.images });
});
router2.delete("/products/:id", async (req, res) => {
  await db.delete(productsTable).where((0, import_drizzle_orm3.eq)(productsTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});
var products_default = router2;

// src/routes/categories.ts
var import_express3 = require("express");
var import_drizzle_orm4 = require("drizzle-orm");
var router3 = (0, import_express3.Router)();
router3.get("/categories", async (_req, res) => {
  const cats = await db.select().from(categoriesTable);
  res.json(cats);
});
router3.post("/categories", async (req, res) => {
  const { name, imageUrl } = req.body;
  if (!name) {
    res.status(400).json({ error: "name required" });
    return;
  }
  const [cat] = await db.insert(categoriesTable).values({ name, imageUrl: imageUrl ?? null }).returning();
  res.status(201).json(cat);
});
router3.patch("/categories/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, imageUrl } = req.body;
  const updates = {};
  if (name !== void 0) updates.name = name;
  if (imageUrl !== void 0) updates.imageUrl = imageUrl;
  const [cat] = await db.update(categoriesTable).set(updates).where((0, import_drizzle_orm4.eq)(categoriesTable.id, id)).returning();
  if (!cat) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(cat);
});
router3.delete("/categories/:id", async (req, res) => {
  await db.delete(categoriesTable).where((0, import_drizzle_orm4.eq)(categoriesTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});
var categories_default = router3;

// src/routes/cart.ts
var import_express4 = require("express");
var import_drizzle_orm5 = require("drizzle-orm");
var router4 = (0, import_express4.Router)();
router4.get("/cart", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.json([]);
    return;
  }
  const items = await db.select({
    id: cartTable.id,
    quantity: cartTable.quantity,
    product: {
      id: productsTable.id,
      name: productsTable.name,
      price: productsTable.price,
      oldPrice: productsTable.oldPrice,
      images: productsTable.images,
      unit: productsTable.unit,
      inStock: productsTable.inStock,
      categoryName: categoriesTable.name
    }
  }).from(cartTable).innerJoin(productsTable, (0, import_drizzle_orm5.eq)(cartTable.productId, productsTable.id)).leftJoin(categoriesTable, (0, import_drizzle_orm5.eq)(productsTable.categoryId, categoriesTable.id)).where((0, import_drizzle_orm5.eq)(cartTable.customerId, customerId));
  res.json(items.map((i) => ({
    ...i,
    product: {
      ...i.product,
      images: typeof i.product.images === "string" ? JSON.parse(i.product.images) : i.product.images
    }
  })));
});
router4.post("/cart", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { productId, quantity = 1 } = req.body;
  if (!productId) {
    res.status(400).json({ error: "productId required" });
    return;
  }
  const existing = await db.select().from(cartTable).where((0, import_drizzle_orm5.and)((0, import_drizzle_orm5.eq)(cartTable.customerId, customerId), (0, import_drizzle_orm5.eq)(cartTable.productId, productId))).limit(1);
  if (existing.length > 0) {
    await db.update(cartTable).set({ quantity: existing[0].quantity + quantity }).where((0, import_drizzle_orm5.eq)(cartTable.id, existing[0].id));
  } else {
    await db.insert(cartTable).values({ customerId, productId, quantity });
  }
  res.json({ success: true });
});
router4.patch("/cart/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { quantity } = req.body;
  if (!quantity || quantity < 1) {
    await db.delete(cartTable).where((0, import_drizzle_orm5.eq)(cartTable.id, id));
  } else {
    await db.update(cartTable).set({ quantity }).where((0, import_drizzle_orm5.eq)(cartTable.id, id));
  }
  res.json({ success: true });
});
router4.delete("/cart/:id", async (req, res) => {
  await db.delete(cartTable).where((0, import_drizzle_orm5.eq)(cartTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});
router4.delete("/cart", async (req, res) => {
  const customerId = req.customerId;
  if (customerId) await db.delete(cartTable).where((0, import_drizzle_orm5.eq)(cartTable.customerId, customerId));
  res.json({ success: true });
});
var cart_default = router4;

// src/routes/orders.ts
var import_express5 = require("express");
var import_drizzle_orm6 = require("drizzle-orm");
var router5 = (0, import_express5.Router)();
async function enrichOrder(order) {
  const items = await db.select().from(orderItemsTable).where((0, import_drizzle_orm6.eq)(orderItemsTable.orderId, order.id));
  const [customer] = await db.select().from(customersTable).where((0, import_drizzle_orm6.eq)(customersTable.id, order.customerId));
  let courierData = {};
  if (order.courierId) {
    const [courier] = await db.select().from(couriersTable).where((0, import_drizzle_orm6.eq)(couriersTable.id, order.courierId));
    if (courier) courierData = { name: courier.name, phone: courier.phone, lat: courier.lat, lng: courier.lng };
  }
  return {
    ...order,
    customerName: customer?.name ?? null,
    customerPhone: customer?.phone ?? null,
    courierName: courierData.name ?? null,
    courierPhone: courierData.phone ?? null,
    courierLat: courierData.lat ?? null,
    courierLng: courierData.lng ?? null,
    items
  };
}
router5.get("/orders", async (req, res) => {
  const customerId = req.customerId;
  const conditions = [];
  if (req.query.status) conditions.push((0, import_drizzle_orm6.eq)(ordersTable.status, req.query.status));
  if (req.query.customerId) {
    conditions.push((0, import_drizzle_orm6.eq)(ordersTable.customerId, parseInt(req.query.customerId)));
  } else if (customerId) {
    conditions.push((0, import_drizzle_orm6.eq)(ordersTable.customerId, customerId));
  }
  const orders = await db.select().from(ordersTable).where(conditions.length ? (0, import_drizzle_orm6.and)(...conditions) : void 0);
  const enriched = await Promise.all(orders.map(enrichOrder));
  res.json(enriched);
});
router5.post("/orders", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { deliveryMethod, paymentMethod, address, note, promoCode: promoCodeInput } = req.body;
  if (!deliveryMethod || !paymentMethod) {
    res.status(400).json({ error: "deliveryMethod and paymentMethod required" });
    return;
  }
  const cartItems = await db.select({ id: cartTable.id, productId: cartTable.productId, quantity: cartTable.quantity, product: productsTable }).from(cartTable).innerJoin(productsTable, (0, import_drizzle_orm6.eq)(cartTable.productId, productsTable.id)).where((0, import_drizzle_orm6.eq)(cartTable.customerId, customerId));
  if (cartItems.length === 0) {
    res.status(400).json({ error: "Cart is empty" });
    return;
  }
  const allSettings = await db.select().from(settingsTable);
  const settingsMap = {};
  allSettings.forEach((s) => {
    settingsMap[s.key] = s.value;
  });
  const fee = parseFloat(settingsMap.deliveryFee ?? "15000");
  const threshold = parseFloat(settingsMap.freeDeliveryThreshold ?? "300000");
  const subtotal = cartItems.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const deliveryFee = deliveryMethod === "delivery" && subtotal < threshold ? fee : 0;
  let discountAmount = 0;
  let appliedPromoCode = null;
  if (promoCodeInput) {
    const [promo] = await db.select().from(promoCodesTable).where((0, import_drizzle_orm6.and)((0, import_drizzle_orm6.eq)(promoCodesTable.code, promoCodeInput.toUpperCase()), (0, import_drizzle_orm6.eq)(promoCodesTable.isActive, true))).limit(1);
    if (promo) {
      const alreadyUsed = await db.select().from(promoCodeUsagesTable).where((0, import_drizzle_orm6.and)((0, import_drizzle_orm6.eq)(promoCodeUsagesTable.promoCodeId, promo.id), (0, import_drizzle_orm6.eq)(promoCodeUsagesTable.customerId, customerId))).limit(1);
      if (alreadyUsed.length === 0 && (!promo.maxUses || promo.usedCount < promo.maxUses)) {
        discountAmount = promo.discountType === "percent" ? subtotal * promo.discountAmount / 100 : promo.discountAmount;
        appliedPromoCode = promo.code;
        await db.update(promoCodesTable).set({ usedCount: promo.usedCount + 1 }).where((0, import_drizzle_orm6.eq)(promoCodesTable.id, promo.id));
      }
    }
  }
  const totalPrice = Math.max(0, subtotal + deliveryFee - discountAmount);
  const [order] = await db.insert(ordersTable).values({
    customerId,
    status: "new",
    deliveryMethod,
    paymentMethod,
    address: address ?? null,
    note: note ?? null,
    promoCode: appliedPromoCode,
    discountAmount,
    totalPrice,
    deliveryFee
  }).returning();
  await db.insert(orderItemsTable).values(cartItems.map((item) => ({
    orderId: order.id,
    productId: item.productId,
    productName: item.product.name,
    productImage: typeof item.product.images === "string" ? JSON.parse(item.product.images)[0] ?? null : item.product.images[0] ?? null,
    quantity: item.quantity,
    price: item.product.price
  })));
  if (appliedPromoCode) {
    const [promo] = await db.select().from(promoCodesTable).where((0, import_drizzle_orm6.eq)(promoCodesTable.code, appliedPromoCode)).limit(1);
    if (promo) await db.insert(promoCodeUsagesTable).values({ promoCodeId: promo.id, customerId, orderId: order.id });
  }
  await db.delete(cartTable).where((0, import_drizzle_orm6.eq)(cartTable.customerId, customerId));
  if (address) await db.update(customersTable).set({ savedAddress: address }).where((0, import_drizzle_orm6.eq)(customersTable.id, customerId));
  const enriched = await enrichOrder(order);
  res.status(201).json(enriched);
});
router5.patch("/orders/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { status } = req.body;
  const [order] = await db.update(ordersTable).set({ status }).where((0, import_drizzle_orm6.eq)(ordersTable.id, id)).returning();
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await enrichOrder(order));
});
router5.patch("/orders/:id/assign-courier", async (req, res) => {
  const id = parseInt(req.params.id);
  const { courierId } = req.body;
  const [order] = await db.update(ordersTable).set({ courierId: courierId ?? null }).where((0, import_drizzle_orm6.eq)(ordersTable.id, id)).returning();
  if (!order) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(await enrichOrder(order));
});
router5.delete("/orders/:id/delete", async (req, res) => {
  const id = parseInt(req.params.id);
  const customerId = req.customerId;
  if (customerId) {
    const [order] = await db.select().from(ordersTable).where((0, import_drizzle_orm6.eq)(ordersTable.id, id));
    if (!order || order.customerId !== customerId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
  }
  await db.delete(ordersTable).where((0, import_drizzle_orm6.eq)(ordersTable.id, id));
  res.json({ success: true });
});
var orders_default = router5;

// src/routes/liked.ts
var import_express6 = require("express");
var import_drizzle_orm7 = require("drizzle-orm");
var router6 = (0, import_express6.Router)();
router6.get("/liked", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.json([]);
    return;
  }
  const items = await db.select({
    id: likedTable.id,
    product: {
      id: productsTable.id,
      name: productsTable.name,
      price: productsTable.price,
      oldPrice: productsTable.oldPrice,
      images: productsTable.images,
      unit: productsTable.unit,
      inStock: productsTable.inStock,
      categoryName: categoriesTable.name
    }
  }).from(likedTable).innerJoin(productsTable, (0, import_drizzle_orm7.eq)(likedTable.productId, productsTable.id)).leftJoin(categoriesTable, (0, import_drizzle_orm7.eq)(productsTable.categoryId, categoriesTable.id)).where((0, import_drizzle_orm7.eq)(likedTable.customerId, customerId));
  res.json(items.map((i) => ({ ...i, product: { ...i.product, images: typeof i.product.images === "string" ? JSON.parse(i.product.images) : i.product.images, isLiked: true } })));
});
router6.post("/liked", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { productId } = req.body;
  const existing = await db.select().from(likedTable).where((0, import_drizzle_orm7.and)((0, import_drizzle_orm7.eq)(likedTable.customerId, customerId), (0, import_drizzle_orm7.eq)(likedTable.productId, productId))).limit(1);
  if (existing.length > 0) {
    res.json({ success: true });
    return;
  }
  await db.insert(likedTable).values({ customerId, productId });
  res.json({ success: true });
});
router6.delete("/liked/:productId", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  await db.delete(likedTable).where((0, import_drizzle_orm7.and)((0, import_drizzle_orm7.eq)(likedTable.customerId, customerId), (0, import_drizzle_orm7.eq)(likedTable.productId, parseInt(req.params.productId))));
  res.json({ success: true });
});
var liked_default = router6;

// src/routes/messages.ts
var import_express7 = require("express");
var import_drizzle_orm8 = require("drizzle-orm");
var router7 = (0, import_express7.Router)();
router7.get("/messages", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const msgs = await db.select().from(messagesTable).where((0, import_drizzle_orm8.eq)(messagesTable.customerId, customerId));
  await db.update(messagesTable).set({ isRead: true }).where((0, import_drizzle_orm8.and)((0, import_drizzle_orm8.eq)(messagesTable.customerId, customerId), (0, import_drizzle_orm8.eq)(messagesTable.senderType, "admin")));
  res.json(msgs);
});
router7.post("/messages", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { text: text2, mediaUrl, mediaType } = req.body;
  const [msg] = await db.insert(messagesTable).values({ customerId, senderType: "customer", text: text2 ?? "", mediaUrl: mediaUrl ?? null, mediaType: mediaType ?? null }).returning();
  res.status(201).json(msg);
});
router7.get("/admin/messages", async (_req, res) => {
  const customers = await db.select().from(customersTable);
  const result = await Promise.all(customers.map(async (c) => {
    const msgs = await db.select().from(messagesTable).where((0, import_drizzle_orm8.eq)(messagesTable.customerId, c.id));
    const unread = msgs.filter((m) => m.senderType === "customer" && !m.isRead).length;
    const last = msgs[msgs.length - 1];
    return { customerId: c.id, customerName: c.name, customerPhone: c.phone, unreadCount: unread, lastMessage: last ?? null, messages: msgs };
  }));
  res.json(result.filter((r) => r.messages.length > 0));
});
router7.post("/admin/messages/:customerId", async (req, res) => {
  const customerId = parseInt(req.params.customerId);
  const { text: text2, mediaUrl, mediaType } = req.body;
  const [msg] = await db.insert(messagesTable).values({ customerId, senderType: "admin", text: text2 ?? "", mediaUrl: mediaUrl ?? null, mediaType: mediaType ?? null }).returning();
  await db.update(messagesTable).set({ isRead: true }).where((0, import_drizzle_orm8.and)((0, import_drizzle_orm8.eq)(messagesTable.customerId, customerId), (0, import_drizzle_orm8.eq)(messagesTable.senderType, "customer")));
  res.status(201).json(msg);
});
router7.delete("/messages", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  await db.delete(messagesTable).where((0, import_drizzle_orm8.eq)(messagesTable.customerId, customerId));
  res.json({ success: true });
});
router7.delete("/admin/messages/:customerId", async (req, res) => {
  await db.delete(messagesTable).where((0, import_drizzle_orm8.eq)(messagesTable.customerId, parseInt(req.params.customerId)));
  res.json({ success: true });
});
var messages_default = router7;

// src/routes/banners.ts
var import_express8 = require("express");
var import_drizzle_orm9 = require("drizzle-orm");
var router8 = (0, import_express8.Router)();
router8.get("/banners", async (_req, res) => {
  const banners = await db.select().from(bannersTable).where((0, import_drizzle_orm9.eq)(bannersTable.isActive, true));
  res.json(banners);
});
router8.get("/admin/banners", async (_req, res) => {
  const banners = await db.select().from(bannersTable);
  res.json(banners);
});
router8.post("/banners", async (req, res) => {
  const { imageUrl, title, link, isActive, sortOrder } = req.body;
  if (!imageUrl) {
    res.status(400).json({ error: "imageUrl required" });
    return;
  }
  const [banner] = await db.insert(bannersTable).values({ imageUrl, title: title ?? null, link: link ?? null, isActive: isActive !== false, sortOrder: sortOrder ?? 0 }).returning();
  res.status(201).json(banner);
});
router8.patch("/banners/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { imageUrl, title, link, isActive, sortOrder } = req.body;
  const updates = {};
  if (imageUrl !== void 0) updates.imageUrl = imageUrl;
  if (title !== void 0) updates.title = title;
  if (link !== void 0) updates.link = link;
  if (isActive !== void 0) updates.isActive = isActive;
  if (sortOrder !== void 0) updates.sortOrder = sortOrder;
  const [banner] = await db.update(bannersTable).set(updates).where((0, import_drizzle_orm9.eq)(bannersTable.id, id)).returning();
  if (!banner) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(banner);
});
router8.delete("/banners/:id", async (req, res) => {
  await db.delete(bannersTable).where((0, import_drizzle_orm9.eq)(bannersTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});
var banners_default = router8;

// src/routes/settings.ts
var import_express9 = require("express");
var import_drizzle_orm10 = require("drizzle-orm");
var router9 = (0, import_express9.Router)();
async function upsert(key, value) {
  const [existing] = await db.select().from(settingsTable).where((0, import_drizzle_orm10.eq)(settingsTable.key, key)).limit(1);
  if (existing) {
    await db.update(settingsTable).set({ value }).where((0, import_drizzle_orm10.eq)(settingsTable.key, key));
  } else {
    await db.insert(settingsTable).values({ key, value });
  }
}
router9.get("/site-settings", async (_req, res) => {
  const all = await db.select().from(settingsTable);
  const m = {};
  all.forEach((s) => {
    m[s.key] = s.value;
  });
  res.json({ siteName: m.siteName ?? null, logoUrl: m.logoUrl ?? null });
});
router9.patch("/admin/site-settings", async (req, res) => {
  const { siteName, logoUrl } = req.body;
  if (siteName !== void 0) await upsert("siteName", siteName ?? "");
  if (logoUrl !== void 0) await upsert("logoUrl", logoUrl ?? "");
  const all = await db.select().from(settingsTable);
  const m = {};
  all.forEach((s) => {
    m[s.key] = s.value;
  });
  res.json({ siteName: m.siteName ?? null, logoUrl: m.logoUrl ?? null });
});
router9.get("/support-contact", async (_req, res) => {
  const all = await db.select().from(settingsTable);
  const m = {};
  all.forEach((s) => {
    m[s.key] = s.value;
  });
  res.json({ phone: m.supportPhone ?? null, telegram: m.supportTelegram ?? null });
});
router9.patch("/admin/support-contact", async (req, res) => {
  const { phone, telegram } = req.body;
  if (phone !== void 0) await upsert("supportPhone", phone ?? "");
  if (telegram !== void 0) await upsert("supportTelegram", telegram ?? "");
  const all = await db.select().from(settingsTable);
  const m = {};
  all.forEach((s) => {
    m[s.key] = s.value;
  });
  res.json({ phone: m.supportPhone ?? null, telegram: m.supportTelegram ?? null });
});
router9.post("/admin/login", async (req, res) => {
  const { password } = req.body;
  const [setting] = await db.select().from(settingsTable).where((0, import_drizzle_orm10.eq)(settingsTable.key, "adminPassword")).limit(1);
  const adminPass = setting?.value ?? "admin123";
  if (password !== adminPass) {
    res.status(401).json({ error: "Invalid password" });
    return;
  }
  res.json({ success: true });
});
router9.post("/admin/logout", async (_req, res) => {
  res.json({ success: true });
});
router9.patch("/admin/password", async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const [setting] = await db.select().from(settingsTable).where((0, import_drizzle_orm10.eq)(settingsTable.key, "adminPassword")).limit(1);
  const adminPass = setting?.value ?? "admin123";
  if (currentPassword !== adminPass) {
    res.status(400).json({ error: "Wrong current password" });
    return;
  }
  await upsert("adminPassword", newPassword);
  res.json({ success: true });
});
router9.get("/admin/delivery-settings", async (_req, res) => {
  const all = await db.select().from(settingsTable);
  const m = {};
  all.forEach((s) => {
    m[s.key] = s.value;
  });
  res.json({ deliveryFee: parseFloat(m.deliveryFee ?? "15000"), freeDeliveryThreshold: parseFloat(m.freeDeliveryThreshold ?? "300000") });
});
router9.patch("/admin/delivery-settings", async (req, res) => {
  const { deliveryFee, freeDeliveryThreshold } = req.body;
  if (deliveryFee !== void 0) await upsert("deliveryFee", String(deliveryFee));
  if (freeDeliveryThreshold !== void 0) await upsert("freeDeliveryThreshold", String(freeDeliveryThreshold));
  const all = await db.select().from(settingsTable);
  const m = {};
  all.forEach((s) => {
    m[s.key] = s.value;
  });
  res.json({ deliveryFee: parseFloat(m.deliveryFee ?? "15000"), freeDeliveryThreshold: parseFloat(m.freeDeliveryThreshold ?? "300000") });
});
var settings_default = router9;

// src/routes/couriers.ts
var import_express10 = require("express");
var import_drizzle_orm11 = require("drizzle-orm");
var router10 = (0, import_express10.Router)();
function safe(c) {
  const { password, ...rest } = c;
  return rest;
}
router10.get("/couriers", async (_req, res) => {
  const couriers = await db.select().from(couriersTable);
  res.json(couriers.map(safe));
});
router10.post("/couriers", async (req, res) => {
  const { name, phone, username, password, isActive } = req.body;
  if (!name || !phone || !username || !password) {
    res.status(400).json({ error: "All fields required" });
    return;
  }
  const [c] = await db.insert(couriersTable).values({ name, phone, username, password, isActive: isActive !== false }).returning();
  res.status(201).json(safe(c));
});
router10.patch("/couriers/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { name, phone, username, password, isActive } = req.body;
  const updates = {};
  if (name !== void 0) updates.name = name;
  if (phone !== void 0) updates.phone = phone;
  if (username !== void 0) updates.username = username;
  if (password !== void 0) updates.password = password;
  if (isActive !== void 0) updates.isActive = isActive;
  const [c] = await db.update(couriersTable).set(updates).where((0, import_drizzle_orm11.eq)(couriersTable.id, id)).returning();
  if (!c) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(safe(c));
});
router10.delete("/couriers/:id", async (req, res) => {
  await db.delete(couriersTable).where((0, import_drizzle_orm11.eq)(couriersTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});
router10.post("/courier/login", async (req, res) => {
  const { username, password } = req.body;
  const [c] = await db.select().from(couriersTable).where((0, import_drizzle_orm11.eq)(couriersTable.username, username)).limit(1);
  if (!c || c.password !== password) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  if (!c.isActive) {
    res.status(403).json({ error: "Account disabled" });
    return;
  }
  res.json({ id: c.id, name: c.name, phone: c.phone, username: c.username });
});
router10.get("/courier/orders", async (req, res) => {
  const courierId = req.courierId;
  if (!courierId) {
    res.json([]);
    return;
  }
  const orders = await db.select().from(ordersTable).where((0, import_drizzle_orm11.eq)(ordersTable.courierId, courierId));
  res.json(orders);
});
router10.patch("/courier/location", async (req, res) => {
  const courierId = req.courierId;
  if (!courierId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { lat, lng } = req.body;
  await db.update(couriersTable).set({ lat, lng, locationUpdatedAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm11.eq)(couriersTable.id, courierId));
  res.json({ success: true });
});
router10.patch("/courier/status", async (req, res) => {
  const courierId = req.courierId;
  if (!courierId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { isActive } = req.body;
  await db.update(couriersTable).set({ isActive }).where((0, import_drizzle_orm11.eq)(couriersTable.id, courierId));
  res.json({ success: true });
});
var couriers_default = router10;

// src/routes/promoCodes.ts
var import_express11 = require("express");
var import_drizzle_orm12 = require("drizzle-orm");
var router11 = (0, import_express11.Router)();
router11.get("/promo-codes", async (_req, res) => {
  const codes = await db.select().from(promoCodesTable);
  res.json(codes);
});
router11.post("/promo-codes", async (req, res) => {
  const { code, discountType, discountAmount, maxUses, isActive } = req.body;
  if (!code || discountAmount === void 0) {
    res.status(400).json({ error: "code and discountAmount required" });
    return;
  }
  const [pc] = await db.insert(promoCodesTable).values({
    code: code.toUpperCase(),
    discountType: discountType ?? "fixed",
    discountAmount,
    maxUses: maxUses ?? null,
    isActive: isActive !== false
  }).returning();
  res.status(201).json(pc);
});
router11.patch("/promo-codes/:id", async (req, res) => {
  const id = parseInt(req.params.id);
  const { code, discountType, discountAmount, maxUses, isActive } = req.body;
  const updates = {};
  if (code !== void 0) updates.code = code.toUpperCase();
  if (discountType !== void 0) updates.discountType = discountType;
  if (discountAmount !== void 0) updates.discountAmount = discountAmount;
  if (maxUses !== void 0) updates.maxUses = maxUses;
  if (isActive !== void 0) updates.isActive = isActive;
  const [pc] = await db.update(promoCodesTable).set(updates).where((0, import_drizzle_orm12.eq)(promoCodesTable.id, id)).returning();
  if (!pc) {
    res.status(404).json({ error: "Not found" });
    return;
  }
  res.json(pc);
});
router11.delete("/promo-codes/:id", async (req, res) => {
  await db.delete(promoCodesTable).where((0, import_drizzle_orm12.eq)(promoCodesTable.id, parseInt(req.params.id)));
  res.json({ success: true });
});
router11.post("/promo-codes/apply", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  const { code, subtotal } = req.body;
  if (!code) {
    res.status(400).json({ error: "code required" });
    return;
  }
  const [promo] = await db.select().from(promoCodesTable).where((0, import_drizzle_orm12.and)((0, import_drizzle_orm12.eq)(promoCodesTable.code, code.toUpperCase()), (0, import_drizzle_orm12.eq)(promoCodesTable.isActive, true))).limit(1);
  if (!promo) {
    res.status(404).json({ error: "Promokod topilmadi" });
    return;
  }
  if (promo.maxUses && promo.usedCount >= promo.maxUses) {
    res.status(400).json({ error: "Promokod limiti tugagan" });
    return;
  }
  const alreadyUsed = await db.select().from(promoCodeUsagesTable).where((0, import_drizzle_orm12.and)((0, import_drizzle_orm12.eq)(promoCodeUsagesTable.promoCodeId, promo.id), (0, import_drizzle_orm12.eq)(promoCodeUsagesTable.customerId, customerId))).limit(1);
  if (alreadyUsed.length > 0) {
    res.status(400).json({ error: "Bu promokodni allaqachon ishlatgansiz" });
    return;
  }
  const discountAmount = promo.discountType === "percent" ? (subtotal || 0) * promo.discountAmount / 100 : promo.discountAmount;
  res.json({ code: promo.code, discountAmount, discountType: promo.discountType });
});
var promoCodes_default = router11;

// src/routes/notifications.ts
var import_express12 = require("express");
var import_drizzle_orm13 = require("drizzle-orm");
var router12 = (0, import_express12.Router)();
router12.get("/notifications", async (_req, res) => {
  const notifications = await db.select().from(notificationsTable).orderBy(notificationsTable.id);
  res.json(notifications.reverse());
});
router12.post("/notifications/send", async (req, res) => {
  const { message } = req.body;
  if (!message) {
    res.status(400).json({ error: "message required" });
    return;
  }
  const [n] = await db.insert(notificationsTable).values({ message }).returning();
  res.status(201).json(n);
});
router12.post("/notifications/read", async (req, res) => {
  const customerId = req.customerId;
  if (!customerId) {
    res.status(401).json({ error: "Not authenticated" });
    return;
  }
  await db.update(customersTable).set({ lastNotificationReadAt: /* @__PURE__ */ new Date() }).where((0, import_drizzle_orm13.eq)(customersTable.id, customerId));
  res.json({ success: true });
});
var notifications_default = router12;

// src/routes/upload.ts
var import_express13 = require("express");
var import_multer = __toESM(require("multer"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_meta = {};
var _dirname = typeof __dirname !== "undefined" ? __dirname : import_path.default.dirname(new URL(import_meta.url).pathname);
var uploadDir = import_path.default.join(_dirname, "../../uploads");
if (!import_fs.default.existsSync(uploadDir)) import_fs.default.mkdirSync(uploadDir, { recursive: true });
var storage = import_multer.default.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = import_path.default.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});
var upload = (0, import_multer.default)({ storage, limits: { fileSize: 10 * 1024 * 1024 } });
var router13 = (0, import_express13.Router)();
router13.post("/upload", upload.single("file"), (req, res) => {
  if (!req.file) {
    res.status(400).json({ error: "No file uploaded" });
    return;
  }
  const url = `/uploads/${req.file.filename}`;
  res.json({ url });
});
var upload_default = router13;

// src/index.ts
var import_meta2 = {};
var _dirname2 = typeof __dirname !== "undefined" ? __dirname : import_path2.default.dirname(new URL(import_meta2.url).pathname);
var app = (0, import_express14.default)();
app.use((0, import_cors.default)());
app.use(import_express14.default.json({ limit: "10mb" }));
app.use(import_express14.default.urlencoded({ extended: true }));
app.use((req, res, next) => {
  const cid = req.headers["x-customer-id"];
  if (cid) req.customerId = parseInt(Array.isArray(cid) ? cid[0] : cid, 10);
  const rid = req.headers["x-courier-id"];
  if (rid) req.courierId = parseInt(Array.isArray(rid) ? rid[0] : rid, 10);
  next();
});
app.use("/uploads", import_express14.default.static(import_path2.default.join(_dirname2, "../uploads")));
app.use("/api", auth_default);
app.use("/api", products_default);
app.use("/api", categories_default);
app.use("/api", cart_default);
app.use("/api", orders_default);
app.use("/api", liked_default);
app.use("/api", messages_default);
app.use("/api", banners_default);
app.use("/api", settings_default);
app.use("/api", couriers_default);
app.use("/api", promoCodes_default);
app.use("/api", notifications_default);
app.use("/api", upload_default);
var publicDir = import_path2.default.join(_dirname2, "public");
var clientDist = (0, import_fs2.existsSync)(publicDir) ? publicDir : import_path2.default.join(_dirname2, "../../client/dist");
if (true) {
  app.use(import_express14.default.static(clientDist));
  app.get(/(.*)/, (req, res) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
      res.sendFile(import_path2.default.join(clientDist, "index.html"));
    }
  });
}
var PORT = Number(process.env.PORT) || 3e3;
app.listen(PORT, () => {
  console.log(`\u2705 ShopUz server running on port ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  if (true) {
    console.log(`   App: http://localhost:${PORT}`);
  }
});
