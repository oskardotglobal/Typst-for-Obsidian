import { execSync } from "child_process";
import { rmSync, cpSync, existsSync } from "fs";
import { join } from "path";
import dotenv from "dotenv";

dotenv.config();

const { SOURCE_DIR, TARGET_DIR } = process.env;

if (!SOURCE_DIR || !TARGET_DIR) {
  throw new Error("SOURCE_DIR and TARGET_DIR not defined.");
}

const FILES_TO_COPY = ["pkg", "main.js", "manifest.json", "styles.css"];

const FILES_TO_DELETE = [
  "pkg",
  "main.js",
  "manifest.json",
  "styles.css",
  "obsidian_typst_bg.wasm",
  "onig.wasm",
  "vscode-oniguruma",
];

try {
  FILES_TO_DELETE.forEach((file) => {
    const filePath = join(TARGET_DIR, file);
    if (existsSync(filePath)) {
      rmSync(filePath, { recursive: true, force: true });
    }
  });

  execSync("tsc -noEmit -skipLibCheck && node esbuild.config.mjs production", {
    stdio: "inherit",
    cwd: SOURCE_DIR,
  });

  FILES_TO_COPY.forEach((item) => {
    const sourcePath = join(SOURCE_DIR, item);
    const targetPath = join(TARGET_DIR, item);

    if (existsSync(sourcePath)) {
      cpSync(sourcePath, targetPath, { recursive: true });
    }
  });

  const onigSourcePath = join(SOURCE_DIR, "node_modules", "vscode-oniguruma");
  const onigTargetPath = join(TARGET_DIR, "vscode-oniguruma");
  if (existsSync(onigSourcePath)) {
    cpSync(onigSourcePath, onigTargetPath, { recursive: true });
  }

  console.log("\nBuild completed");
} catch (error) {
  console.error("\nBuild failed:", error.message);
  process.exit(1);
}
