import "server-only";
import { headers } from "next/headers";

/**
 * Origen absoluto de la request actual (protocolo + host), para construir
 * links públicos completos (ej. el de reservas por doctor) sin necesitar una
 * variable de entorno de dominio que haya que mantener sincronizada.
 */
export async function getBaseUrl(): Promise<string> {
  const headersList = await headers();
  const host = headersList.get("host") ?? "localhost:3000";
  const protocol =
    headersList.get("x-forwarded-proto") ??
    (host.startsWith("localhost") ? "http" : "https");
  return `${protocol}://${host}`;
}
