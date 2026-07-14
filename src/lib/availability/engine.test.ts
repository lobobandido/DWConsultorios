import { describe, expect, it } from "vitest";
import { generateDaySlots, getAvailability } from "./engine";

describe("generateDaySlots", () => {
  it("genera 20 slots de 30 min para un día entre semana (08:00-18:00)", () => {
    // 2026-07-13 es lunes
    const slots = generateDaySlots("2026-07-13");
    expect(slots).toHaveLength(20);
    expect(slots[0].start.hour).toBe(8);
    expect(slots[0].start.minute).toBe(0);
    expect(slots.at(-1)!.end.hour).toBe(18);
    expect(slots.at(-1)!.end.minute).toBe(0);
  });

  it("no genera slots en sábado", () => {
    expect(generateDaySlots("2026-07-18")).toHaveLength(0);
  });

  it("no genera slots en domingo", () => {
    expect(generateDaySlots("2026-07-19")).toHaveLength(0);
  });

  it("cada slot dura exactamente 30 minutos y no hay huecos entre slots", () => {
    const slots = generateDaySlots("2026-07-13");
    for (let i = 0; i < slots.length; i += 1) {
      expect(
        slots[i].end.diff(slots[i].start, "minutes").minutes,
      ).toBe(30);
      if (i > 0) {
        expect(slots[i].start.toMillis()).toBe(slots[i - 1].end.toMillis());
      }
    }
  });
});

describe("getAvailability", () => {
  it("marca todos los slots como disponibles si no hay citas", () => {
    const availability = getAvailability("2026-07-13", []);
    expect(availability.every((s) => s.available)).toBe(true);
    expect(availability).toHaveLength(20);
  });

  it("marca como ocupado el slot que se solapa con una cita existente", () => {
    // 09:00-09:30 hora de CDMX (UTC-6 en julio) = 15:00-15:30 UTC
    const availability = getAvailability("2026-07-13", [
      {
        startTime: "2026-07-13T15:00:00.000Z",
        endTime: "2026-07-13T15:30:00.000Z",
      },
    ]);

    const occupied = availability.filter((s) => !s.available);
    expect(occupied).toHaveLength(1);
    expect(occupied[0].start).toBe("2026-07-13T15:00:00.000Z");
  });

  it("no genera disponibilidad para fin de semana", () => {
    expect(getAvailability("2026-07-18", [])).toHaveLength(0);
  });
});
