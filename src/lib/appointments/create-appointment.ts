import type { SupabaseClient } from "@supabase/supabase-js";
import { resolveSlot } from "@/lib/availability/engine";
import {
  normalizePhone,
  validatePatientName,
  validatePatientPhone,
  validateReason,
} from "@/lib/patients/validate-patient-input";

/**
 * Quién origina la solicitud de la cita. La validación de "cita futura
 * duplicada" depende de esto, no de un flag suelto: el doctor gestiona su
 * propia agenda con criterio (puede agendar seguimientos a futuro), mientras
 * que el formulario público y el asistente de IA (Fase 2) actúan en nombre
 * del paciente sin supervisión del doctor, así que sí se restringen.
 */
export type RequestSource = "doctor" | "public" | "assistant";

const SOURCES_REQUIRING_DUPLICATE_CHECK: RequestSource[] = ["public", "assistant"];

export type CreateAppointmentInput = {
  supabase: SupabaseClient;
  doctorId: string;
  start: string;
  patientName: string;
  patientPhone: string;
  reason: string | null;
  source: RequestSource;
};

export type CreateAppointmentResult =
  | {
      ok: true;
      appointment: { id: string; start_time: string; end_time: string; reason: string | null };
    }
  | { ok: false; status: number; error: string };

export async function createAppointment(
  input: CreateAppointmentInput,
): Promise<CreateAppointmentResult> {
  const { supabase, doctorId, start, patientName, reason, source } = input;

  const nameError = validatePatientName(patientName);
  if (nameError) {
    return { ok: false, status: 400, error: nameError };
  }

  const normalizedPhone = normalizePhone(input.patientPhone);
  const phoneError = validatePatientPhone(normalizedPhone);
  if (phoneError) {
    return { ok: false, status: 400, error: phoneError };
  }

  const reasonError = validateReason(reason);
  if (reasonError) {
    return { ok: false, status: 400, error: reasonError };
  }

  const slot = resolveSlot(start);
  if (!slot) {
    return {
      ok: false,
      status: 400,
      error:
        "El horario elegido no es válido (fuera de L-V 08:00-18:00 o no alineado a slots de 30 min)",
    };
  }

  const { data: existingAtSlot } = await supabase
    .from("appointments")
    .select("id")
    .eq("doctor_id", doctorId)
    .eq("start_time", start)
    .maybeSingle();

  if (existingAtSlot) {
    return { ok: false, status: 409, error: "Ese horario ya está ocupado" };
  }

  const { data: existingPatient, error: patientLookupError } = await supabase
    .from("patients")
    .select("id")
    .eq("doctor_id", doctorId)
    .eq("phone", normalizedPhone)
    .maybeSingle();

  if (patientLookupError) {
    return { ok: false, status: 500, error: "No se pudo consultar el paciente" };
  }

  let patientId = existingPatient?.id as string | undefined;

  if (!patientId) {
    const { data: createdPatient, error: createPatientError } = await supabase
      .from("patients")
      .insert({ doctor_id: doctorId, name: patientName.trim(), phone: normalizedPhone })
      .select("id")
      .single();

    if (createPatientError || !createdPatient) {
      return { ok: false, status: 500, error: "No se pudo registrar al paciente" };
    }

    patientId = createdPatient.id;
  } else if (SOURCES_REQUIRING_DUPLICATE_CHECK.includes(source)) {
    const { data: futureAppointment } = await supabase
      .from("appointments")
      .select("id")
      .eq("patient_id", patientId)
      .gt("start_time", new Date().toISOString())
      .maybeSingle();

    if (futureAppointment) {
      return {
        ok: false,
        status: 409,
        error: "Este paciente ya tiene una cita futura agendada",
      };
    }
  }

  const { data: appointment, error: insertError } = await supabase
    .from("appointments")
    .insert({
      doctor_id: doctorId,
      patient_id: patientId,
      start_time: start,
      end_time: slot.end,
      reason,
    })
    .select("id, start_time, end_time, reason")
    .single();

  if (insertError) {
    if (insertError.code === "23505") {
      return { ok: false, status: 409, error: "Ese horario ya está ocupado" };
    }
    return { ok: false, status: 500, error: "No se pudo crear la cita" };
  }

  return { ok: true, appointment };
}
