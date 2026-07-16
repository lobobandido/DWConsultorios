import Link from "next/link";
import { BUSINESS_TIMEZONE } from "@/lib/availability/constants";
import type { CalendarDay } from "@/lib/calendar/load-calendar-data";

function formatDayHeader(dateISO: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "short",
    day: "2-digit",
  }).format(new Date(`${dateISO}T12:00:00`));
}

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export function WeekView({ days }: { days: CalendarDay[] }) {
  const slotCount = days[0]?.slots.length ?? 0;

  if (slotCount === 0) {
    return (
      <p className="rounded-2xl border border-white/10 bg-white/5 p-8 text-sm text-gray-500">
        Sin horarios esta semana.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
      <table className="w-full min-w-[600px] border-collapse text-sm">
        <thead>
          <tr>
            <th className="w-16 border-b border-white/10 p-2 text-left text-xs font-medium text-gray-500">
              Hora
            </th>
            {days.map((day) => (
              <th key={day.dateISO} className="border-b border-white/10 p-2 text-center">
                <Link
                  href={`/calendar?date=${day.dateISO}&view=day`}
                  className="text-xs font-medium capitalize text-gray-300 hover:text-teal-400"
                >
                  {formatDayHeader(day.dateISO)}
                </Link>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: slotCount }).map((_, rowIdx) => (
            <tr key={rowIdx}>
              <td className="border-b border-white/5 p-2 text-xs text-gray-500">
                {formatTime(days[0].slots[rowIdx].start)}
              </td>
              {days.map((day) => {
                const slot = day.slots[rowIdx];
                return (
                  <td
                    key={day.dateISO}
                    className={`border-b border-white/5 p-2 text-center text-xs ${
                      slot.appointmentId
                        ? "bg-teal-500/10 text-teal-300"
                        : "text-gray-700"
                    }`}
                    title={slot.appointmentId ? `${slot.patientName} · ${slot.patientPhone}` : undefined}
                  >
                    {slot.appointmentId ? slot.patientName : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
