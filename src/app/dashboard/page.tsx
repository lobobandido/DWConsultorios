import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, LogOut, Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";
import { getBaseUrl } from "@/lib/url";
import {
  UpcomingAppointments,
  type UpcomingAppointment,
} from "./upcoming-appointments";
import { CopyLinkButton } from "./copy-link-button";

async function loadUpcomingAppointments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  doctorId: string,
): Promise<UpcomingAppointment[]> {
  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, start_time, end_time, reason, patient_id")
    .eq("doctor_id", doctorId)
    .gt("start_time", new Date().toISOString())
    .order("start_time", { ascending: true })
    .limit(20);

  if (!appointments || appointments.length === 0) return [];

  const patientIds = [...new Set(appointments.map((a) => a.patient_id))];
  const { data: patients } = await supabase
    .from("patients")
    .select("id, name, phone")
    .in("id", patientIds);

  const patientById = new Map((patients ?? []).map((p) => [p.id, p]));

  return appointments.map((a) => ({
    id: a.id,
    start_time: a.start_time,
    end_time: a.end_time,
    reason: a.reason,
    patientName: patientById.get(a.patient_id)?.name ?? "Paciente",
    patientPhone: patientById.get(a.patient_id)?.phone ?? "",
  }));
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: doctor } = await supabase
    .from("doctors")
    .select("name, slug")
    .eq("id", user.id)
    .maybeSingle();

  const upcomingAppointments = doctor
    ? await loadUpcomingAppointments(supabase, user.id)
    : [];

  const publicBookingUrl = doctor
    ? `${await getBaseUrl()}/${doctor.slug}`
    : null;

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {doctor?.name ? `Hola, ${doctor.name}` : "Bienvenido"}
          </h1>
          <p className="text-sm text-gray-400">{user.email}</p>
        </div>
        <form action={logout}>
          <button
            type="submit"
            className="flex items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-sm font-medium text-gray-300 transition-all duration-200 hover:border-teal-500/50 hover:bg-gray-800 hover:text-white"
          >
            <LogOut className="h-4 w-4" />
            Salir
          </button>
        </form>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-gray-400 backdrop-blur-sm">
        {doctor ? (
          <div className="flex flex-col gap-4">
            <p>Vista de calendario en construcción.</p>

            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Tu enlace público de reservas
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={publicBookingUrl ?? "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-sm text-teal-400 hover:underline"
                >
                  {publicBookingUrl}
                </a>
                {publicBookingUrl && <CopyLinkButton url={publicBookingUrl} />}
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                href="/calendar/new"
                className="flex w-fit items-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:from-teal-700 hover:to-cyan-700"
              >
                <CalendarPlus className="h-4 w-4" />
                Nueva cita
              </Link>
              <Link
                href="/patients"
                className="flex w-fit items-center gap-2 rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2.5 text-sm font-medium text-gray-300 transition-all duration-200 hover:border-teal-500/50 hover:text-white"
              >
                <Users className="h-4 w-4" />
                Pacientes
              </Link>
            </div>
          </div>
        ) : (
          <p>
            Tu usuario existe en Supabase Auth pero todavía no tiene una fila
            en <span className="font-mono text-teal-400">doctors</span>. Créala
            con el script de alta manual (Paso 2).
          </p>
        )}
      </div>

      {doctor && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-sm">
          <h2 className="mb-4 text-sm font-medium text-gray-300">
            Próximas citas
          </h2>
          <UpcomingAppointments appointments={upcomingAppointments} />
        </div>
      )}
    </div>
  );
}
