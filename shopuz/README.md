# ShopUz - cPanel Deployment Guide

## Tuzilma
```
shopuz/
├── client/     # React frontend (development source)
├── server/     # Node.js backend
│   ├── src/    # TypeScript source
│   └── dist/   # Built output
└── .env.example
```

## cPanel'ga Deploy Qilish

### 1. Barcha dasturlarni o'rnating (local kompyuterda)
```bash
cd server && npm install
cd ../client && npm install
```

### 2. Frontend'ni build qiling
```bash
cd client
npm run build
# dist/ papka yaratiladi
```

### 3. Server'ni build qiling
```bash
cd server
npm run build
# dist/index.mjs yaratiladi
```

### 4. cPanel'ga yuklash

**Yuklanadigan fayllar:**
```
server/dist/index.mjs      → app.mjs (kirish nuqtasi)
server/uploads/            → uploads/ (rasm papkasi)
client/dist/               → public/ (frontend)
.env                       → .env
```

**package.json (cPanel uchun):**
```json
{
  "name": "shopuz",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "start": "node app.mjs"
  },
  "dependencies": {
    "better-sqlite3": "^9.4.3"
  }
}
```

### 5. cPanel Node.js App sozlash
- **cPanel** → **Setup Node.js App**
- Application root: `/home/username/shopuz`
- Application startup file: `app.mjs`
- Node.js version: 18+ (yoki 20)
- Environment variables:
  - `PORT` = cPanel tayin qilgan port
  - `NODE_ENV` = production
  - `DB_PATH` = `/home/username/shopuz/shopuz.db`

### 6. Dependencies o'rnatish
cPanel'da "Run NPM Install" tugmasini bosing.

## Local Development

```bash
# Barcha dependencies o'rnatish
cd server && npm install
cd ../client && npm install

# Har ikki serverni ishga tushirish
cd .. && npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3000/api

## Ma'lumotlar bazasi
SQLite ishlatiladi - alohida server kerak emas.
`shopuz.db` fayli avtomatik yaratiladi.

## Admin kirish
- URL: http://yoursite.com/admin
- Parol: `admin123` (o'zgartirishni unutmang!)
