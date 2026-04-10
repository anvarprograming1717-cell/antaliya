import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import "./db.js";
import authRouter from "./routes/auth.js";
import productsRouter from "./routes/products.js";
import categoriesRouter from "./routes/categories.js";
import cartRouter from "./routes/cart.js";
import ordersRouter from "./routes/orders.js";
import likedRouter from "./routes/liked.js";
import messagesRouter from "./routes/messages.js";
import bannersRouter from "./routes/banners.js";
import settingsRouter from "./routes/settings.js";
import couriersRouter from "./routes/couriers.js";
import promoCodesRouter from "./routes/promoCodes.js";
import notificationsRouter from "./routes/notifications.js";
import uploadRouter from "./routes/upload.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Inject customer/courier id from headers
app.use((req, res, next) => {
  const cid = req.headers["x-customer-id"];
  if (cid) (req as any).customerId = parseInt(Array.isArray(cid) ? cid[0] : cid, 10);
  const rid = req.headers["x-courier-id"];
  if (rid) (req as any).courierId = parseInt(Array.isArray(rid) ? rid[0] : rid, 10);
  next();
});

// Static files (uploaded images)
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

// API routes
app.use("/api", authRouter);
app.use("/api", productsRouter);
app.use("/api", categoriesRouter);
app.use("/api", cartRouter);
app.use("/api", ordersRouter);
app.use("/api", likedRouter);
app.use("/api", messagesRouter);
app.use("/api", bannersRouter);
app.use("/api", settingsRouter);
app.use("/api", couriersRouter);
app.use("/api", promoCodesRouter);
app.use("/api", notificationsRouter);
app.use("/api", uploadRouter);

// Serve built frontend (production)
// Check for public/ inside dist (bundled deployment) or client/dist (dev build)
const publicDir = path.join(__dirname, "public");
const clientDist = existsSync(publicDir)
  ? publicDir
  : path.join(__dirname, "../../client/dist");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(clientDist));
  app.get("*", (req, res) => {
    if (!req.path.startsWith("/api") && !req.path.startsWith("/uploads")) {
      res.sendFile(path.join(clientDist, "index.html"));
    }
  });
}

const PORT = Number(process.env.PORT) || 3000;
app.listen(PORT, () => {
  console.log(`✅ ShopUz server running on port ${PORT}`);
  console.log(`   API: http://localhost:${PORT}/api`);
  if (process.env.NODE_ENV === "production") {
    console.log(`   App: http://localhost:${PORT}`);
  }
});
