import type { NextRequest } from "next/server";

/**
 * Defensa adicional contra CSRF para rutas que mutan datos autenticadas por
 * cookie de sesión. Las cookies de Supabase ya usan SameSite=Lax (mitiga la
 * mayoría de los casos), esto es una capa extra: rechaza si el Origin (o
 * Referer como respaldo) no coincide con el host de la request.
 */
export function verifySameOrigin(request: NextRequest): boolean {
  const source = request.headers.get("origin") ?? request.headers.get("referer");
  if (!source) return false;

  try {
    return new URL(source).host === request.headers.get("host");
  } catch {
    return false;
  }
}
