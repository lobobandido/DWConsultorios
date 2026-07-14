/**
 * Alta manual de un doctor (Fase 1: sin self-registro).
 *
 * Uso:
 *   npm run create-doctor -- --email doctor@ejemplo.com --password "algo-seguro" \
 *     --name "Dra. Ana Pérez" --slug ana-perez
 */
import { config } from "dotenv";
import WebSocket from "ws";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

// Node 18/20 no traen WebSocket nativo; realtime-js lo exige al construir el
// cliente aunque no se use Realtime aquí.
if (typeof globalThis.WebSocket === "undefined") {
  (globalThis as { WebSocket?: unknown }).WebSocket = WebSocket;
}

const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/;

function parseArgs(argv: string[]) {
  const args: Record<string, string> = {};
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith("--")) {
      const key = token.slice(2);
      const value = argv[i + 1];
      args[key] = value;
      i += 1;
    }
  }
  return args;
}

async function main() {
  const { email, password, name, slug } = parseArgs(process.argv.slice(2));

  if (!email || !password || !name || !slug) {
    console.error(
      "Uso: npm run create-doctor -- --email <email> --password <password> --name <nombre> --slug <slug>",
    );
    process.exit(1);
  }

  if (!SLUG_PATTERN.test(slug)) {
    console.error(
      `Slug inválido: "${slug}". Solo minúsculas, números y guiones (ej. "ana-perez").`,
    );
    process.exit(1);
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL y/o SUPABASE_SERVICE_ROLE_KEY en .env.local",
    );
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: created, error: createUserError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createUserError || !created.user) {
    console.error("No se pudo crear el usuario:", createUserError?.message);
    process.exit(1);
  }

  const { error: insertError } = await supabase.from("doctors").insert({
    id: created.user.id,
    name,
    slug,
  });

  if (insertError) {
    console.error(
      "Usuario creado pero falló el insert en doctors:",
      insertError.message,
    );
    console.error(
      `Revertí manualmente el usuario auth (id: ${created.user.id}) si es necesario.`,
    );
    process.exit(1);
  }

  console.log("Doctor creado:");
  console.log(`  id:    ${created.user.id}`);
  console.log(`  email: ${email}`);
  console.log(`  name:  ${name}`);
  console.log(`  slug:  ${slug}`);
}

main();
