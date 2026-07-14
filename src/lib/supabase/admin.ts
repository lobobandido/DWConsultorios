import "server-only";
import "./websocket-polyfill";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabaseServiceRoleKey, supabaseUrl } from "./env";

/**
 * Cliente con service role: bypasa RLS. Solo para código que corre en el
 * servidor (Route Handlers, scripts) y que ya validó autorización por su cuenta.
 * Nunca importar desde un Client Component.
 */
export function createAdminClient() {
  return createSupabaseClient(supabaseUrl(), supabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
