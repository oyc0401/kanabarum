import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: ["src/index.ts"],
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    target: "es2020",
    platform: "node",
    treeshake: true,
    tsconfig: "./tsconfig.json",
  },
  {
    entry: { "index.browser": "src/index.browser.ts" },
    format: ["esm"],
    dts: true,
    sourcemap: true,
    target: "es2020",
    platform: "browser",
    treeshake: true,
    tsconfig: "./tsconfig.json",
  },
]);
