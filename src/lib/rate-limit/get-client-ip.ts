import type { NextRequest } from "next/server";

/**
 * Vercel inyecta x-forwarded-for con la cadena de IPs (cliente primero).
 * Fallback a "unknown" en local/dev donde el header puede no venir.
 */
export function getClientIp(request: NextRequest): string {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0].trim();
  }
  return "unknown";
}
