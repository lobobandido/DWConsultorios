import { describe, expect, it } from "vitest";
import { createAppointment } from "./create-appointment";

/**
 * Fake mínimo de SupabaseClient, tallado exactamente a los métodos que usa
 * createAppointment() (select/eq/gt/maybeSingle/insert/single). No es un
 * mock genérico de Supabase — solo lo necesario para probar la lógica de
 * negocio sin una base de datos real.
 */
type Row = Record<string, unknown>;

function makeFakeSupabase(initial: { patients?: Row[]; appointments?: Row[] } = {}) {
  const db: { patients: Row[]; appointments: Row[] } = {
    patients: initial.patients ? [...initial.patients] : [],
    appointments: initial.appointments ? [...initial.appointments] : [],
  };
  let idCounter = 1;

  function from(table: "patients" | "appointments") {
    const filters: Array<(row: Row) => boolean> = [];
    let insertRow: Row | null = null;

    const builder = {
      select() {
        return builder;
      },
      eq(col: string, value: unknown) {
        filters.push((row) => row[col] === value);
        return builder;
      },
      gt(col: string, value: unknown) {
        filters.push((row) => (row[col] as string) > (value as string));
        return builder;
      },
      insert(row: Row) {
        insertRow = row;
        return builder;
      },
      async maybeSingle() {
        const rows = db[table].filter((r) => filters.every((f) => f(r)));
        return { data: rows[0] ?? null, error: null };
      },
      async single() {
        if (insertRow) {
          const created = { id: `id-${idCounter++}`, ...insertRow };
          db[table].push(created);
          return { data: created, error: null };
        }
        const rows = db[table].filter((r) => filters.every((f) => f(r)));
        return { data: rows[0] ?? null, error: rows[0] ? null : { message: "not found" } };
      },
    };
    return builder;
  }

  return { from, db } as unknown as { from: typeof from; db: typeof db };
}

const DOCTOR_ID = "doctor-1";
const MONDAY_9AM_UTC = "2026-07-13T15:00:00.000Z"; // 09:00 CDMX, lunes

describe("createAppointment", () => {
  it("crea la cita y da de alta un paciente nuevo", async () => {
    const fake = makeFakeSupabase();

    const result = await createAppointment({
      supabase: fake as never,
      doctorId: DOCTOR_ID,
      start: MONDAY_9AM_UTC,
      patientName: "Juan Pérez",
      patientPhone: "555-123 4567",
      reason: "Consulta",
      source: "doctor",
    });

    expect(result.ok).toBe(true);
    expect(fake.db.patients).toHaveLength(1);
    expect(fake.db.patients[0].phone).toBe("5551234567"); // normalizado
    expect(fake.db.appointments).toHaveLength(1);
  });

  it("rechaza un horario ya ocupado", async () => {
    const fake = makeFakeSupabase({
      appointments: [{ id: "a1", doctor_id: DOCTOR_ID, start_time: MONDAY_9AM_UTC, patient_id: "p1" }],
    });

    const result = await createAppointment({
      supabase: fake as never,
      doctorId: DOCTOR_ID,
      start: MONDAY_9AM_UTC,
      patientName: "Juan Pérez",
      patientPhone: "5551234567",
      reason: null,
      source: "doctor",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it("rechaza un horario fuera de la ventana de negocio", async () => {
    const fake = makeFakeSupabase();

    const result = await createAppointment({
      supabase: fake as never,
      doctorId: DOCTOR_ID,
      start: "2026-07-18T15:00:00.000Z", // sábado
      patientName: "Juan Pérez",
      patientPhone: "5551234567",
      reason: null,
      source: "doctor",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("reutiliza al paciente existente por teléfono normalizado en vez de duplicarlo", async () => {
    const fake = makeFakeSupabase({
      patients: [{ id: "p1", doctor_id: DOCTOR_ID, name: "Juan Pérez", phone: "5551234567" }],
    });

    const result = await createAppointment({
      supabase: fake as never,
      doctorId: DOCTOR_ID,
      start: MONDAY_9AM_UTC,
      patientName: "Juan Pérez",
      patientPhone: "555 123-4567", // mismo número, formato distinto
      reason: null,
      source: "doctor",
    });

    expect(result.ok).toBe(true);
    expect(fake.db.patients).toHaveLength(1); // no se creó un segundo paciente
  });

  it('bloquea cita futura duplicada cuando source es "public"', async () => {
    const fake = makeFakeSupabase({
      patients: [{ id: "p1", doctor_id: DOCTOR_ID, name: "Juan Pérez", phone: "5551234567" }],
      appointments: [
        { id: "a1", doctor_id: DOCTOR_ID, patient_id: "p1", start_time: "2099-01-01T00:00:00.000Z" },
      ],
    });

    const result = await createAppointment({
      supabase: fake as never,
      doctorId: DOCTOR_ID,
      start: MONDAY_9AM_UTC,
      patientName: "Juan Pérez",
      patientPhone: "5551234567",
      reason: null,
      source: "public",
    });

    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(409);
  });

  it('permite varias citas futuras al mismo paciente cuando source es "doctor"', async () => {
    const fake = makeFakeSupabase({
      patients: [{ id: "p1", doctor_id: DOCTOR_ID, name: "Juan Pérez", phone: "5551234567" }],
      appointments: [
        { id: "a1", doctor_id: DOCTOR_ID, patient_id: "p1", start_time: "2099-01-01T00:00:00.000Z" },
      ],
    });

    const result = await createAppointment({
      supabase: fake as never,
      doctorId: DOCTOR_ID,
      start: MONDAY_9AM_UTC,
      patientName: "Juan Pérez",
      patientPhone: "5551234567",
      reason: null,
      source: "doctor",
    });

    expect(result.ok).toBe(true);
  });

  it("rechaza nombre demasiado corto", async () => {
    const fake = makeFakeSupabase();
    const result = await createAppointment({
      supabase: fake as never,
      doctorId: DOCTOR_ID,
      start: MONDAY_9AM_UTC,
      patientName: "A",
      patientPhone: "5551234567",
      reason: null,
      source: "doctor",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rechaza teléfono con menos de 10 dígitos tras normalizar", async () => {
    const fake = makeFakeSupabase();
    const result = await createAppointment({
      supabase: fake as never,
      doctorId: DOCTOR_ID,
      start: MONDAY_9AM_UTC,
      patientName: "Juan Pérez",
      patientPhone: "123-45",
      reason: null,
      source: "doctor",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });

  it("rechaza motivo de más de 500 caracteres", async () => {
    const fake = makeFakeSupabase();
    const result = await createAppointment({
      supabase: fake as never,
      doctorId: DOCTOR_ID,
      start: MONDAY_9AM_UTC,
      patientName: "Juan Pérez",
      patientPhone: "5551234567",
      reason: "x".repeat(501),
      source: "doctor",
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(400);
  });
});
