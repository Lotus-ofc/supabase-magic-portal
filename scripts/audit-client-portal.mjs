#!/usr/bin/env node
/**
 * Auditoria real do Portal do Cliente — somente leitura.
 * Uso: node scripts/audit-client-portal.mjs [email-do-cliente]
 */
import fs from "node:fs";
import path from "node:path";
import { createClient } from "@supabase/supabase-js";

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
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
const anonKey =
  process.env.OFFICIAL_SUPABASE_ANON_KEY || process.env.VITE_OFFICIAL_SUPABASE_ANON_KEY;

if (!url || !serviceRole || !anonKey) {
  console.error("❌ .env precisa de OFFICIAL_SUPABASE_URL, OFFICIAL_SERVICE_ROLE_KEY e anon key");
  process.exit(1);
}

const targetEmail = process.argv[2]?.toLowerCase();

const admin = createClient(url, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

function section(title) {
  console.log("\n" + "=".repeat(72));
  console.log(title);
  console.log("=".repeat(72));
}

async function checkMigration23() {
  const { error } = await admin.rpc("current_user_cadastro_cliente_ids");
  return !error;
}

async function repositoryQueryAsUser(userJwt, cadastroClienteIds) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });

  let query = client
    .from("content_cards")
    .select("id,cadastro_cliente_id,cliente_nome,status,kanban_ordem,data_publicacao")
    .in("cadastro_cliente_id", cadastroClienteIds)
    .neq("status", "arquivado")
    .order("data_publicacao", { ascending: true })
    .order("kanban_ordem", { ascending: true });

  const { data, error, status, statusText } = await query;
  return {
    equivalent:
      "GET /rest/v1/content_cards?select=id,cadastro_cliente_id,cliente_nome,status,kanban_ordem,data_publicacao" +
      `&cadastro_cliente_id=in.(${cadastroClienteIds.join(",")})` +
      "&status=neq.arquivado" +
      "&order=data_publicacao.asc,kanban_ordem.asc",
    params: { cadastroClienteIds, excludeArchived: true },
    httpStatus: `${status} ${statusText}`,
    error: error?.message ?? null,
    count: data?.length ?? 0,
    rows: data ?? [],
  };
}

async function getClientAccessScopeAsUser(userJwt, userId) {
  const client = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${userJwt}` } },
  });

  const { data: rows, error } = await client
    .from("client_access")
    .select("cliente_nome, cadastro_cliente_id")
    .eq("user_id", userId);

  if (error) return { error: error.message, cadastroClienteIds: [], clientNames: [] };

  const clientNames = [...new Set((rows ?? []).map((r) => String(r.cliente_nome)).filter(Boolean))];
  const idSet = new Set();
  for (const row of rows ?? []) {
    if (row.cadastro_cliente_id != null) idSet.add(Number(row.cadastro_cliente_id));
  }

  const missingNames = (rows ?? [])
    .filter((r) => r.cadastro_cliente_id == null && r.cliente_nome)
    .map((r) => String(r.cliente_nome));

  if (missingNames.length > 0) {
    const { data: clientes, error: ce } = await client
      .from("cadastro_clientes")
      .select("id, nome_cliente")
      .in("nome_cliente", missingNames);
    if (ce) return { error: ce.message, cadastroClienteIds: [...idSet], clientNames };
    for (const c of clientes ?? []) idSet.add(Number(c.id));
  }

  return { error: null, cadastroClienteIds: [...idSet], clientNames, rawRows: rows };
}

async function simulateKanbanServerFn(userJwt, userId) {
  const scope = await getClientAccessScopeAsUser(userJwt, userId);
  if (scope.error) return { scope, board: null };

  const repo = await repositoryQueryAsUser(userJwt, scope.cadastroClienteIds);
  const columns = {};
  for (const row of repo.rows) {
    columns[row.status] = (columns[row.status] ?? 0) + 1;
  }
  return {
    scope,
    repository: repo,
    serverFnEquivalent: {
      totalCards: repo.count,
      cardsByStatus: columns,
    },
  };
}

async function createUserSession(email) {
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
  });
  if (error) return { error: error.message };

  const token = data?.properties?.hashed_token;
  if (!token) return { error: "generateLink não retornou hashed_token" };

  const anon = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: sessionData, error: verifyError } = await anon.auth.verifyOtp({
    type: "magiclink",
    token_hash: token,
  });

  if (verifyError) return { error: verifyError.message };
  return { session: sessionData.session, user: sessionData.user };
}

section("AMBIENTE");
console.log(
  JSON.stringify({ supabase_url: url, migration_23_applied: await checkMigration23() }, null, 2),
);

const { data: allAccess, error: accessErr } = await admin
  .from("client_access")
  .select("id,user_id,cliente_nome,cadastro_cliente_id,created_at");
if (accessErr) {
  console.error(accessErr);
  process.exit(1);
}

const { data: allRoles } = await admin.from("user_roles").select("user_id,role");
const roleMap = new Map();
for (const r of allRoles ?? []) {
  const arr = roleMap.get(r.user_id) ?? [];
  arr.push(r.role);
  roleMap.set(r.user_id, arr);
}

const { data: userList } = await admin.auth.admin.listUsers({ perPage: 200 });
const userMap = new Map((userList?.users ?? []).map((u) => [u.id, u]));

const { data: allCards } = await admin
  .from("content_cards")
  .select("id,cadastro_cliente_id,cliente_nome,status");

const accessRows = targetEmail
  ? (allAccess ?? []).filter((a) => userMap.get(a.user_id)?.email?.toLowerCase() === targetEmail)
  : (allAccess ?? []);

if (accessRows.length === 0) {
  console.error(
    targetEmail
      ? `Nenhum client_access para email ${targetEmail}`
      : "Nenhum registro em client_access",
  );
  process.exit(1);
}

for (const row of accessRows) {
  const user = userMap.get(row.user_id);
  const roles = roleMap.get(row.user_id) ?? [];

  section(`USUÁRIO: ${user?.email ?? row.user_id}`);

  console.log("\n[1] AUTENTICAÇÃO (auth.users + user_roles)");
  console.log(
    JSON.stringify(
      {
        user_id: row.user_id,
        email: user?.email ?? null,
        roles,
        is_staff: roles.includes("admin") || roles.includes("social_media"),
      },
      null,
      2,
    ),
  );

  console.log("\n[2] client_access (service_role)");
  console.log(JSON.stringify(row, null, 2));

  const cardsById = (allCards ?? []).filter(
    (c) => c.cadastro_cliente_id === row.cadastro_cliente_id,
  );
  const cardsByName = (allCards ?? []).filter((c) => c.cliente_nome === row.cliente_nome);

  console.log("\n[3] content_cards por cadastro_cliente_id (service_role — sem RLS)");
  console.log(
    JSON.stringify(
      {
        cadastro_cliente_id: row.cadastro_cliente_id,
        count: cardsById.length,
        ids: cardsById.map((c) => c.id),
        statuses: [...new Set(cardsById.map((c) => c.status))],
      },
      null,
      2,
    ),
  );

  if (cardsById.length !== cardsByName.length) {
    console.log("\n[3b] ALERTA: mismatch cliente_nome vs cadastro_cliente_id");
    console.log(
      JSON.stringify(
        {
          cliente_nome_in_access: row.cliente_nome,
          count_by_nome: cardsByName.length,
          sample_card_nomes: [...new Set(cardsById.map((c) => c.cliente_nome))],
        },
        null,
        2,
      ),
    );
  }

  if (!user?.email) {
    console.log("\n⚠️ Usuário auth não encontrado — pulando testes com JWT");
    continue;
  }

  section(`SESSÃO JWT: ${user.email}`);
  const sessionResult = await createUserSession(user.email);
  if (sessionResult.error) {
    console.log(JSON.stringify({ session_error: sessionResult.error }, null, 2));
    continue;
  }

  const jwt = sessionResult.session.access_token;

  console.log("\n[4] Repository query (JWT do cliente — com RLS)");
  const scope = await getClientAccessScopeAsUser(jwt, row.user_id);
  console.log("[4a] getClientAccessScope equivalente:");
  console.log(JSON.stringify(scope, null, 2));

  const repo =
    scope.cadastroClienteIds.length > 0
      ? await repositoryQueryAsUser(jwt, scope.cadastroClienteIds)
      : { count: 0, rows: [], error: "cadastroClienteIds vazio" };

  console.log("\n[4b] contentCardRepository.listForCadastroClienteIds equivalente:");
  console.log(JSON.stringify(repo, null, 2));

  console.log("\n[5] Server Function getClientKanbanBoardFn equivalente:");
  const board = await simulateKanbanServerFn(jwt, row.user_id);
  console.log(JSON.stringify(board, null, 2));

  console.log("\n[6] COMPARATIVO RLS");
  console.log(
    JSON.stringify(
      {
        service_role_count: cardsById.length,
        authenticated_jwt_count: repo.count ?? 0,
        rls_blocks: cardsById.length > 0 && (repo.count ?? 0) === 0,
        scope_empty: scope.cadastroClienteIds.length === 0,
        repository_filter_empty:
          scope.cadastroClienteIds.length > 0 && cardsById.length > 0 && (repo.count ?? 0) === 0,
      },
      null,
      2,
    ),
  );
}

section("FIM DA AUDITORIA");
