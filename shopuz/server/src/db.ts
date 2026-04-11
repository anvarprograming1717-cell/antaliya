import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema.js";

const pool = mysql.createPool({
  host: process.env.DB_HOST || "localhost",
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "shopuz",
  port: Number(process.env.DB_PORT) || 3306,
  waitForConnections: true,
  connectionLimit: 5,
  multipleStatements: true,
});

export const db = drizzle(pool, { schema, mode: "default" });

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

    console.log("✅ MySQL database ready");
  } finally {
    conn.release();
  }
}

initDb().catch(err => {
  console.error("❌ Database init error:", err.message);
  process.exit(1);
});
