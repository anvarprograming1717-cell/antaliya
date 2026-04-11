import * as esbuild from "esbuild";
import { readdirSync, mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });

// Keep all runtime packages external
const externalModules = [
  "node:*",
  "mysql2",
  "drizzle-orm",
  "express", "cors", "multer",
  "zod",
];

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: "dist/index.cjs",
  external: externalModules,
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

console.log("✅ Server built successfully");
