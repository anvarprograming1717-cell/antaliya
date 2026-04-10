import * as esbuild from "esbuild";
import { readdirSync, mkdirSync } from "fs";

mkdirSync("dist", { recursive: true });

// Mark all node_modules as external to avoid CJS/ESM bundling issues
const nodeModules = readdirSync("node_modules").filter(
  (name) => !name.startsWith(".")
);

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "esm",
  outfile: "dist/index.mjs",
  external: ["node:*", ...nodeModules],
  sourcemap: false,
  define: {
    "process.env.NODE_ENV": '"production"',
  },
});

console.log("✅ Server built successfully");
