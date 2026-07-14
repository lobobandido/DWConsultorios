import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSlot } from "@/lib/availability/engine";

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

  const slot = resolveSlot(body.start);
  if (!slot) {
    return NextResponse.json(
      {
        error:
          "El horario elegido no es válido (fuera de L-V 08:00-18:00 o no alineado a slots de 30 min)",
      },
      { status: 400 },
    );
  }

  const { data: existingAtSlot } = await supabase
    .from("appointments")
    .select("id")
    .eq("doctor_id", user.id)
    .eq("start_time", body.start)
    .maybeSingle();

  if (existingAtSlot) {
    return NextResponse.json(
      { error: "Ese horario ya está ocupado" },
      { status: 409 },
    );
  }

  const { data: existingPatient, error: patientLookupError } = await supabase
    .from("patients")
    .select("id")
    .eq("doctor_id", user.id)
    .eq("phone", patientPhone)
    .maybeSingle();

  if (patientLookupError) {
    return NextResponse.json(
      { error: "No se pudo consultar el paciente" },
      { status: 500 },
    );
  }

  let patientId = existingPatient?.id as string | undefined;

  if (!patientId) {
    const { data: createdPatient, error: createPatientError } = await supabase
      .from("patients")
      .insert({ doctor_id: user.id, name: patientName, phone: patientPhone })
      .select("id")
      .single();

    if (createPatientError || !createdPatient) {
      return NextResponse.json(
        { error: "No se pudo registrar al paciente" },
        { status: 500 },
      );
    }

    patientId = createdPatient.id;
  } else {
    // Regla de negocio: un paciente no puede tener más de una cita futura
    // con el mismo doctor (evita duplicidad / doble agenda por error).
    const { data: futureAppointment } = await supabase
      .from("appointments")
      .select("id")
      .eq("patient_id", patientId)
      .gt("start_time", new Date().toISOString())
      .maybeSingle();

    if (futureAppointment) {
      return NextResponse.json(
        { error: "Este paciente ya tiene una cita futura agendada" },
        { status: 409 },
      );
    }
  }

  const { data: appointment, error: insertError } = await supabase
    .from("appointments")
    .insert({
      doctor_id: user.id,
      patient_id: patientId,
      start_time: body.start,
      end_time: slot.end,
      reason,
    })
    .select("id, start_time, end_time, reason")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return NextResponse.json(
        { error: "Ese horario ya está ocupado" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "No se pudo crear la cita" },
      { status: 500 },
    );
  }

  return NextResponse.json({ appointment }, { status: 201 });
}
