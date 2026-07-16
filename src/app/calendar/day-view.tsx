import { BUSINESS_TIMEZONE } from "@/lib/availability/constants";
import type { CalendarSlot } from "@/lib/calendar/load-calendar-data";
import { DaySlotRow } from "./day-slot-row";

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function DayView({ slots }: { slots: CalendarSlot[] }) {
  if (slots.length === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-gray-500">
        Sin horario este día (fin de semana).
      </p>
    );
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      {slots.map((slot) =>
        slot.appointmentId && slot.patientName && slot.patientPhone !== null ? (
          <DaySlotRow
            key={slot.start}
            slot={{
              start: slot.start,
              end: slot.end,
              appointmentId: slot.appointmentId,
              patientName: slot.patientName,
              patientPhone: slot.patientPhone,
            }}
          />
        ) : (
          <div
            key={slot.start}
            className="flex items-center justify-between border-b border-white/10 px-4 py-3 last:border-b-0"
          >
            <p className="text-sm text-gray-500">
              {formatTime(slot.start)} - {formatTime(slot.end)}
            </p>
            <span className="text-xs text-gray-600">Libre</span>
          </div>
        ),
      )}
    </div>
  );
}
