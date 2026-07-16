import type { SupabaseClient } from "@supabase/supabase-js";
import { DateTime } from "luxon";
import { generateDaySlots, getDayBoundsUTC } from "@/lib/availability/engine";
import { BUSINESS_TIMEZONE } from "@/lib/availability/constants";

export type CalendarSlot = {
  start: string;
  end: string;
  appointmentId: string | null;
  patientName: string | null;
  patientPhone: string | null;
};

export type CalendarDay = {
  dateISO: string;
  slots: CalendarSlot[];
};

async function fetchAppointmentsWithPatients(
  supabase: SupabaseClient,
  doctorId: string,
  rangeStartUTC: string,
  rangeEndUTC: string,
) {
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_time, patient_id")
    .eq("doctor_id", doctorId)
    .gte("start_time", rangeStartUTC)
    .lt("start_time", rangeEndUTC);

  if (!appointments || appointments.length === 0) return [];

  const patientIds = [...new Set(appointments.map((a) => a.patient_id))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, name, phone")
    .in("id", patientIds);

  const patientById = new Map((patients ?? []).map((p) => [p.id, p]));

  return appointments.map((a) => ({
    id: a.id as string,
    start_time: a.start_time as string,
    patientName: patientById.get(a.patient_id)?.name ?? "Paciente",
    patientPhone: patientById.get(a.patient_id)?.phone ?? "",
  }));
}

export async function loadDaySlots(
  supabase: SupabaseClient,
  doctorId: string,
  dateISO: string,
): Promise<CalendarSlot[]> {
  const bounds = getDayBoundsUTC(dateISO);
  const appointments = await fetchAppointmentsWithPatients(
    supabase,
    doctorId,
    bounds.start,
    bounds.end,
  );
  // Postgres regresa timestamptz como "...+00:00" y Luxon genera "...Z" —
  // mismo instante, distinto string. Se compara por milisegundos, no por
  // texto, para que el match funcione sin importar el formato exacto.
  const byStart = new Map(
    appointments.map((a) => [new Date(a.start_time).getTime(), a]),
  );

  return generateDaySlots(dateISO).map((slot) => {
    const startISO = slot.start.toUTC().toISO() as string;
    const appt = byStart.get(slot.start.toMillis());
    return {
      start: startISO,
      end: slot.end.toUTC().toISO() as string,
      appointmentId: appt?.id ?? null,
      patientName: appt?.patientName ?? null,
      patientPhone: appt?.patientPhone ?? null,
    };
  });
}

export async function loadWeekSlots(
  supabase: SupabaseClient,
  doctorId: string,
  weekStartISO: string,
): Promise<CalendarDay[]> {
  const weekStart = DateTime.fromISO(weekStartISO, { zone: BUSINESS_TIMEZONE });
  const dateISOs = Array.from({ length: 5 }, (_, i) =>
    weekStart.plus({ days: i }).toFormat("yyyy-LL-dd"),
  );

  const slotsByDay = await Promise.all(
    dateISOs.map((d) => loadDaySlots(supabase, doctorId, d)),
  );

  return dateISOs.map((dateISO, i) => ({ dateISO, slots: slotsByDay[i] }));
}
