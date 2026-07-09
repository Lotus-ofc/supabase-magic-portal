import fs from "node:fs";
import path from "node:path";

export function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      walk(full, files);
    } else {
      files.push(full);
    }
  }
  return files;
}

export function rel(cwd, file) {
  return path.relative(cwd, file).replace(/\\/g, "/");
}

export function readText(file) {
  return fs.readFileSync(file, "utf8");
}

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}
