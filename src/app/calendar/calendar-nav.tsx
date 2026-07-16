import Link from "next/link";
import { DateTime } from "luxon";
import { ChevronLeft, ChevronRight, LayoutGrid, List } from "lucide-react";
import { BUSINESS_TIMEZONE } from "@/lib/availability/constants";

export function CalendarNav({
  selectedDate,
  view,
}: {
  selectedDate: string;
  view: "day" | "week";
}) {
  const dt = DateTime.fromISO(selectedDate, { zone: BUSINESS_TIMEZONE });
  const step = view === "week" ? { days: 7 } : { days: 1 };
  const prevDate = dt.minus(step).toFormat("yyyy-LL-dd");
  const nextDate = dt.plus(step).toFormat("yyyy-LL-dd");
  const todayDate = DateTime.now().setZone(BUSINESS_TIMEZONE).toFormat("yyyy-LL-dd");

  const label =
    view === "week"
      ? `Semana del ${dt.set({ weekday: 1 }).setLocale("es").toFormat("d 'de' LLLL")}`
      : dt.setLocale("es").toFormat("cccc d 'de' LLLL, yyyy");

  const navButton =
    "flex h-8 w-8 items-center justify-center rounded-lg border border-gray-700 bg-gray-900/50 text-gray-300 hover:border-teal-500/50 hover:text-white";
  const toggleButton = (active: boolean) =>
    `flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium ${
      active
        ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white"
        : "border border-gray-700 bg-gray-900/50 text-gray-300 hover:border-teal-500/50 hover:text-white"
    }`;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="flex items-center gap-2">
        <Link href={`/calendar?date=${prevDate}&view=${view}`} className={navButton}>
          <ChevronLeft className="h-4 w-4" />
        </Link>
        <span className="text-lg font-semibold capitalize text-white">{label}</span>
        <Link href={`/calendar?date=${nextDate}&view=${view}`} className={navButton}>
          <ChevronRight className="h-4 w-4" />
        </Link>
        <Link
          href={`/calendar?date=${todayDate}&view=${view}`}
          className="text-sm text-teal-400 hover:underline"
        >
          Hoy
        </Link>
      </div>
      <div className="flex gap-2">
        <Link href={`/calendar?date=${selectedDate}&view=day`} className={toggleButton(view === "day")}>
          <List className="h-3.5 w-3.5" />
          Día
        </Link>
        <Link href={`/calendar?date=${selectedDate}&view=week`} className={toggleButton(view === "week")}>
          <LayoutGrid className="h-3.5 w-3.5" />
          Semana
        </Link>
      </div>
    </div>
  );
}
