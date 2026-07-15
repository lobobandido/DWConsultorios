import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createAppointment } from "@/lib/appointments/create-appointment";
import { UUID_PATTERN } from "@/lib/validation/uuid";
import { checkRateLimit } from "@/lib/rate-limit/check-rate-limit";
import { getClientIp } from "@/lib/rate-limit/get-client-ip";

type PublicCreateAppointmentBody = {
  doctorId?: string;
  start?: string;
  patientName?: string;
  patientPhone?: string;
  reason?: string;
};

/**
 * Reservas del formulario público (RF09), sin login. Usa service role
 * (bypasa RLS) porque no hay sesión de doctor; por eso valida explícitamente
 * que doctorId exista antes de escribir nada. source: "public" activa la
 * regla de "sin cita futura duplicada" en createAppointment().
 */
export async function POST(request: NextRequest) {
  const supabase = createAdminClient();

  const { allowed } = await checkRateLimit(
    supabase,
    `public-appointments:${getClientIp(request)}`,
    { limit: 5, windowSeconds: 60 },
  );

  if (!allowed) {
    return NextResponse.json(
      { error: "Demasiadas solicitudes, intenta de nuevo en un momento." },
      { status: 429 },
    );
  }

  let body: PublicCreateAppointmentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const doctorId = body.doctorId;
  const patientName = body.patientName?.trim();
  const patientPhone = body.patientPhone?.trim();
  const reason = body.reason?.trim() || null;

  if (!doctorId || !UUID_PATTERN.test(doctorId)) {
    return NextResponse.json({ error: "doctorId inválido" }, { status: 400 });
  }

  if (!body.start || !patientName || !patientPhone) {
    return NextResponse.json(
      { error: "Faltan campos: start, patientName y patientPhone son obligatorios" },
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

  const result = await createAppointment({
    supabase,
    doctorId,
    start: body.start,
    patientName,
    patientPhone,
    reason,
    source: "public",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ appointment: result.appointment }, { status: 201 });
}
