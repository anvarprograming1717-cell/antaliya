# ShopUz - Uzbek E-commerce Platform

## Overview

Full-featured e-commerce platform for Uzbekistan with an iOS 26-inspired design (glassmorphism, fluid animations, ultra-rounded corners, frosted glass panels).

pnpm workspace monorepo using TypeScript.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + TailwindCSS v4 + Framer Motion + Wouter

## Architecture

```
artifacts/
  api-server/         — Express API server (port 8080, preview at /api)
  shop/               — React+Vite customer & admin frontend (port 24349, preview at /)
lib/
  api-client-react/   — Auto-generated React Query hooks from OpenAPI spec
  api-zod/            — Auto-generated Zod schemas from OpenAPI spec
  db/                 — Drizzle ORM schema, migrations, db client
  api-spec/           — OpenAPI spec (openapi.yaml)
```

## Key Info

- **Test customer**: phone `+998901234567` (pre-seeded)
- **Admin password**: `admin123`
- **API base URL**: `/api` (relative, proxied from Vite dev server)
- **Customer auth**: `x-customer-id` HTTP header (set via globalThis.fetch patch in App.tsx)
- **Customer session**: localStorage keys `customerId`, `customerPhone`, `customerName`
- **Admin session**: localStorage `isAdmin = "true"`

## Pages

### Customer Pages
- `/` — Catalog/Home (product grid, categories, banners, search)
- `/product/:id` — Product detail (images, add to cart, like)
- `/cart` — Shopping cart with order summary
- `/checkout` — Checkout (delivery method, payment, address)
- `/orders` — My orders
- `/liked` — Liked/favorited products
- `/chat` — Support chat with admin
- `/profile` — User profile, settings, logout

### Admin Pages
- `/admin/login` — Admin login (password: admin123)
- `/admin/dashboard` — Stats dashboard with charts
- `/admin/products` — Product CRUD
- `/admin/categories` — Category CRUD
- `/admin/banners` — Banner management
- `/admin/delivery` — Delivery settings
- `/admin/orders` — Order management with status updates
- `/admin/customers` — Customer list
- `/admin/chat` — Chat with customers
- `/admin/notifications` — Send push notifications
- `/admin/settings` — Contact info and admin password

## Database Schema

Tables: `customers`, `categories`, `products`, `liked`, `cart`, `orders`, `order_items`, `messages`, `banners`, `settings`

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)

## Important Notes

- Date fields from DB are `Date` objects — must call `.toISOString()` before passing to Zod schemas
- Product prices stored as strings in DB (Drizzle decimal), parse with `parseFloat()`
- Vite dev server proxies `/api/*` requests to the API server at port 8080
- Recharts is installed in the shop artifact for dashboard charts
