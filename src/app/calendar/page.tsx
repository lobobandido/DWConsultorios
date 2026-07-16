import { redirect } from "next/navigation";
import Link from "next/link";
import { DateTime } from "luxon";
import { CalendarPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { loadDaySlots, loadWeekSlots } from "@/lib/calendar/load-calendar-data";
import { BUSINESS_TIMEZONE } from "@/lib/availability/constants";
import { CalendarNav } from "./calendar-nav";
import { DayView } from "./day-view";
import { WeekView } from "./week-view";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function todayISO(): string {
  return DateTime.now().setZone(BUSINESS_TIMEZONE).toFormat("yyyy-LL-dd");
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; view?: string }>;
}) {
  const { date, view } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const selectedDate = date && DATE_PATTERN.test(date) ? date : todayISO();
  const selectedView = view === "week" ? "week" : "day";

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Calendario</h1>
        <Link
          href="/calendar/new"
          className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:from-teal-700 hover:to-cyan-700"
        >
          <CalendarPlus className="h-4 w-4" />
          Nueva cita
        </Link>
      </div>

      <CalendarNav selectedDate={selectedDate} view={selectedView} />

      {selectedView === "week" ? (
        <WeekView
          days={await loadWeekSlots(
            supabase,
            user.id,
            DateTime.fromISO(selectedDate, { zone: BUSINESS_TIMEZONE })
              .set({ weekday: 1 })
              .toFormat("yyyy-LL-dd"),
          )}
        />
      ) : (
        <DayView slots={await loadDaySlots(supabase, user.id, selectedDate)} />
      )}
    </div>
  );
}
