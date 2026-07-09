import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { walk } from "./lib/fs-utils.mjs";

const cwd = process.cwd();
const contractsRoot = path.join(cwd, "contracts");
const snapshotPath = path.join(cwd, "scripts/generated/contract-snapshots.v1.json");
const updateMode = process.argv.includes("--update");

function hashFile(file) {
  const content = fs.readFileSync(file);
  return crypto.createHash("sha256").update(content).digest("hex");
}

function collectContractArtifacts() {
  const files = walk(contractsRoot).filter((f) => f.endsWith(".ts") || f.endsWith(".json"));
  const entries = files
    .map((file) => ({
      path: path.relative(cwd, file).replace(/\\/g, "/"),
      hash: hashFile(file),
    }))
    .sort((a, b) => a.path.localeCompare(b.path));
  return entries;
}

function loadMetaVersions() {
  const metaFiles = walk(contractsRoot).filter((f) => f.endsWith("contract.meta.json"));
  const versions = {};
  for (const file of metaFiles) {
    const rel = path.relative(cwd, file).replace(/\\/g, "/");
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    versions[rel] = data;
  }
  return versions;
}

const current = {
  generatedAt: new Date().toISOString(),
  contractBundleVersion: "1.0.0",
  files: collectContractArtifacts(),
  meta: loadMetaVersions(),
};

if (!fs.existsSync(snapshotPath)) {
  if (updateMode) {
    fs.mkdirSync(path.dirname(snapshotPath), { recursive: true });
    fs.writeFileSync(snapshotPath, JSON.stringify(current, null, 2) + "\n");
    console.log("✅ Contract snapshot criado:", path.relative(cwd, snapshotPath));
    process.exit(0);
  }
  console.error(
    "❌ Snapshot de contratos ausente. Execute: node scripts/architecture-validation/contract-compat.mjs --update",
  );
  process.exit(1);
}

const previous = JSON.parse(fs.readFileSync(snapshotPath, "utf8"));
const errors = [];

const prevMap = new Map(previous.files.map((f) => [f.path, f.hash]));
const currMap = new Map(current.files.map((f) => [f.path, f.hash]));

for (const [filePath, hash] of currMap) {
  const prev = prevMap.get(filePath);
  if (prev && prev !== hash) {
    errors.push(`contrato alterado sem snapshot atualizado: ${filePath}`);
  }
}
for (const filePath of prevMap.keys()) {
  if (!currMap.has(filePath)) {
    errors.push(`contrato removido: ${filePath}`);
  }
}

if (updateMode) {
  fs.writeFileSync(snapshotPath, JSON.stringify(current, null, 2) + "\n");
  console.log("✅ Contract snapshot atualizado");
  process.exit(0);
}

if (errors.length > 0) {
  console.error("❌ Contract compatibility falhou:\n");
  for (const e of errors) console.error(`  - ${e}`);
  console.error("\nSe a mudança é intencional, atualize contract.meta.json e rode com --update");
  process.exit(1);
}

console.log("✅ Contract compatibility — OK");
