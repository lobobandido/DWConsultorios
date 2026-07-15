import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAvailability, getDayBoundsUTC } from "@/lib/availability/engine";
import { UUID_PATTERN } from "@/lib/validation/uuid";
import { checkRateLimit } from "@/lib/rate-limit/check-rate-limit";
import { getClientIp } from "@/lib/rate-limit/get-client-ip";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const doctorId = request.nextUrl.searchParams.get("doctor_id");
  const date = request.nextUrl.searchParams.get("date");

  const supabase = createAdminClient();

  const { allowed } = await checkRateLimit(
    supabase,
    `availability:${getClientIp(request)}`,
    { limit: 30, windowSeconds: 60 },
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes, intenta de nuevo en un momento." },
      { status: 429 },
    );
  }

  if (!doctorId || !UUID_PATTERN.test(doctorId)) {
    return NextResponse.json(
      { error: "doctor_id inválido o faltante" },
      { status: 400 },
    );
  }

  if (!date || !DATE_PATTERN.test(date)) {
    return NextResponse.json(
      { error: "date inválida o faltante (formato YYYY-MM-DD)" },
      { status: 400 },
    );
  }

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("id", doctorId)
    .maybeSingle();

  if (!doctor) {
    return NextResponse.json({ error: "Doctor no encontrado" }, { status: 404 });
  }

  let dayBounds: { start: string; end: string };
  try {
    dayBounds = getDayBoundsUTC(date);
  } catch {
    return NextResponse.json({ error: "date inválida" }, { status: 400 });
  }

  const { data: appointments, error } = await supabase
    .from("appointments")
    .select("start_time, end_time")
    .eq("doctor_id", doctorId)
    .gte("start_time", dayBounds.start)
    .lt("start_time", dayBounds.end);

  if (error) {
    return NextResponse.json(
      { error: "No se pudo consultar disponibilidad" },
      { status: 500 },
    );
  }

  const slots = getAvailability(
    date,
    (appointments ?? []).map((a) => ({
      startTime: a.start_time,
      endTime: a.end_time,
    })),
  );

  return NextResponse.json({ doctorId, date, slots });
}
