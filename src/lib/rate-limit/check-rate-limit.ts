import type { SupabaseClient } from "@supabase/supabase-js";

export type RateLimitConfig = {
  limit: number;
  windowSeconds: number;
};

/**
 * Ventana fija por (key, balde de tiempo). "key" ya debe incluir el
 * endpoint (ej. "public-appointments:1.2.3.4") para que límites de rutas
 * distintas no se mezclen entre sí.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  key: string,
  { limit, windowSeconds }: RateLimitConfig,
): Promise<{ allowed: boolean }> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs).toISOString();

  const { data: count, error } = await supabase.rpc("increment_rate_limit", {
    p_key: key,
    p_window_start: windowStart,
  });

  if (error) {
    // Si falla el conteo (ej. tabla no migrada todavía), no bloqueamos al
    // usuario real por un problema de infraestructura — se prioriza
    // disponibilidad sobre el rate limit en ese caso excepcional.
    return { allowed: true };
  }

  return { allowed: (count as number) <= limit };
}
