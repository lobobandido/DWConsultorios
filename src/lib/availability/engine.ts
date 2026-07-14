import { DateTime } from "luxon";

/**
 * Fase 1: horario fijo, no configurable (RF06 / regla de negocio).
 * Zona horaria única para todo el sistema (decisión de producto, no está en
 * los documentos originales).
 */
export const BUSINESS_TIMEZONE = "America/Mexico_City";
export const BUSINESS_START_HOUR = 8;
export const BUSINESS_END_HOUR = 18;
export const SLOT_DURATION_MINUTES = 30;

export type Slot = {
  start: DateTime;
  end: DateTime;
};

export type AppointmentInterval = {
  startTime: Date | string;
  endTime: Date | string;
};

/**
 * Genera los slots de 30 min de un día (L-V 08:00-18:00, hora de negocio).
 * Fuera de lunes a viernes regresa un arreglo vacío.
 */
/**
 * Límites del día civil (00:00-24:00 en BUSINESS_TIMEZONE) expresados en UTC,
 * para acotar la consulta de citas existentes a esa fecha.
 */
export function getDayBoundsUTC(dateISO: string): { start: string; end: string } {
  const dayStart = DateTime.fromISO(dateISO, {
    zone: BUSINESS_TIMEZONE,
  }).startOf("day");

  if (!dayStart.isValid) {
    throw new Error(`Fecha inválida: ${dateISO}`);
  }

  return {
    start: dayStart.toUTC().toISO() as string,
    end: dayStart.plus({ days: 1 }).toUTC().toISO() as string,
  };
}

export function generateDaySlots(dateISO: string): Slot[] {
  const dayStart = DateTime.fromISO(dateISO, {
    zone: BUSINESS_TIMEZONE,
  }).startOf("day");

  if (!dayStart.isValid) {
    throw new Error(`Fecha inválida: ${dateISO}`);
  }

  // Luxon: 1 = lunes ... 7 = domingo
  if (dayStart.weekday > 5) {
    return [];
  }

  const slots: Slot[] = [];
  let slotStart = dayStart.set({ hour: BUSINESS_START_HOUR });
  const dayEnd = dayStart.set({ hour: BUSINESS_END_HOUR });

  while (slotStart.plus({ minutes: SLOT_DURATION_MINUTES }) <= dayEnd) {
    slots.push({
      start: slotStart,
      end: slotStart.plus({ minutes: SLOT_DURATION_MINUTES }),
    });
    slotStart = slotStart.plus({ minutes: SLOT_DURATION_MINUTES });
  }

  return slots;
}

function overlaps(slot: Slot, appointment: AppointmentInterval): boolean {
  const apptStart = DateTime.fromJSDate(new Date(appointment.startTime));
  const apptEnd = DateTime.fromJSDate(new Date(appointment.endTime));
  return slot.start < apptEnd && apptStart < slot.end;
}

/**
 * Valida que un instante propuesto como inicio de cita caiga exactamente en
 * uno de los slots de 30 min generados para su día (L-V, dentro de horario).
 * Regresa el end_time correspondiente (start + 30 min) si es válido.
 */
export function resolveSlot(startISO: string): { end: string } | null {
  const start = DateTime.fromISO(startISO, { zone: "utc" });
  if (!start.isValid) return null;

  const businessDate = start.setZone(BUSINESS_TIMEZONE);
  const dateISO = businessDate.toFormat("yyyy-LL-dd");
  const slots = generateDaySlots(dateISO);

  const match = slots.find((slot) => slot.start.toMillis() === start.toMillis());
  if (!match) return null;

  return { end: match.end.toUTC().toISO() as string };
}

export type SlotAvailability = {
  start: string;
  end: string;
  available: boolean;
};

/**
 * Marca cada slot del día como disponible u ocupado según las citas
 * existentes del doctor. No expone nada de la cita (paciente, motivo, etc.),
 * solo el estado del horario — pensado para poder exponerse públicamente
 * (RF09) sin filtrar datos de otros pacientes.
 */
export function getAvailability(
  dateISO: string,
  existingAppointments: AppointmentInterval[],
): SlotAvailability[] {
  const slots = generateDaySlots(dateISO);

  return slots.map((slot) => ({
    start: slot.start.toUTC().toISO() as string,
    end: slot.end.toUTC().toISO() as string,
    available: !existingAppointments.some((appt) => overlaps(slot, appt)),
  }));
}
