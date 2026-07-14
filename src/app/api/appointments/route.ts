import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAppointment } from "@/lib/appointments/create-appointment";

type CreateAppointmentBody = {
  start?: string;
  patientName?: string;
  patientPhone?: string;
  reason?: string;
};

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: CreateAppointmentBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const patientName = body.patientName?.trim();
  const patientPhone = body.patientPhone?.trim();
  const reason = body.reason?.trim() || null;

  if (!body.start || !patientName || !patientPhone) {
    return NextResponse.json(
      { error: "Faltan campos: start, patientName y patientPhone son obligatorios" },
      { status: 400 },
    );
  }

  // Este endpoint solo lo llama el panel del doctor con sesión propia, así
  // que el origen siempre es "doctor" (sin restricción de cita futura
  // duplicada). El formulario público y el asistente de IA (Fase 2) usarán
  // createAppointment() con source: "public" / "assistant" respectivamente.
  const result = await createAppointment({
    supabase,
    doctorId: user.id,
    start: body.start,
    patientName,
    patientPhone,
    reason,
    source: "doctor",
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  return NextResponse.json({ appointment: result.appointment }, { status: 201 });
}
