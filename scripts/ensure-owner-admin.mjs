#!/usr/bin/env node
/**
 * Garante role admin para o dono da plataforma (leandromajr@gmail.com).
 * Uso: npm run ensure:owner-admin
 *
 * Requer OFFICIAL_SUPABASE_URL e OFFICIAL_SERVICE_ROLE_KEY no .env
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

const OWNER_EMAIL = "leandromajr@gmail.com";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  const raw = fs.readFileSync(filePath, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

const root = process.cwd();
loadEnvFile(path.join(root, ".env"));

const url = process.env.OFFICIAL_SUPABASE_URL;
const serviceRole = process.env.OFFICIAL_SERVICE_ROLE_KEY;

if (!url || !serviceRole) {
  console.error("❌ Defina OFFICIAL_SUPABASE_URL e OFFICIAL_SERVICE_ROLE_KEY no .env");
  process.exit(1);
}

const admin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const { data: list, error: listError } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});

if (listError) {
  console.error("❌ Falha ao listar usuários:", listError.message);
  process.exit(1);
}

const owner = list.users.find((u) => u.email?.toLowerCase() === OWNER_EMAIL.toLowerCase());

if (!owner) {
  console.error(`❌ Usuário ${OWNER_EMAIL} não encontrado em auth.users.`);
  console.error("   Crie a conta em /auth (signup) e rode este script novamente.");
  process.exit(1);
}

const { error: roleError } = await admin.from("user_roles").insert({
  user_id: owner.id,
  role: "admin",
});

if (roleError && !/duplicate key|unique constraint/i.test(roleError.message)) {
  console.error("❌ Falha ao conceder admin:", roleError.message);
  process.exit(1);
}

const { data: roles } = await admin.from("user_roles").select("role").eq("user_id", owner.id);
const isAdmin = (roles ?? []).some((r) => r.role === "admin");

console.log("✅ Dono da plataforma configurado");
console.log(`   Email: ${OWNER_EMAIL}`);
console.log(`   User ID: ${owner.id}`);
console.log(`   Admin: ${isAdmin ? "sim" : "não (verifique user_roles)"}`);
