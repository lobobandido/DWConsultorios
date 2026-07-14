"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, Check } from "lucide-react";

const BUSINESS_TIMEZONE = "America/Mexico_City";

export type UpcomingAppointment = {
  id: string;
  start_time: string;
  end_time: string;
  reason: string | null;
  patientName: string;
  patientPhone: string;
};

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function AppointmentRow({ appointment }: { appointment: UpcomingAppointment }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const res = await fetch(`/api/appointments/${appointment.id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "No se pudo eliminar la cita");
      setDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 border-b border-white/10 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-white">
          {formatDateTime(appointment.start_time)}
        </p>
        <p className="text-sm text-gray-400">
          {appointment.patientName} · {appointment.patientPhone}
        </p>
        {appointment.reason && (
          <p className="text-xs text-gray-500">{appointment.reason}</p>
        )}
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {confirming ? (
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-400">¿Eliminar esta cita?</span>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex items-center gap-1 rounded-lg bg-red-500/20 px-3 py-1.5 text-sm font-medium text-red-400 hover:bg-red-500/30 disabled:opacity-60"
          >
            <Check className="h-3.5 w-3.5" />
            {deleting ? "Eliminando…" : "Confirmar"}
          </button>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            disabled={deleting}
            className="flex items-center gap-1 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 hover:bg-gray-800"
          >
            <X className="h-3.5 w-3.5" />
            Cancelar
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="flex w-fit items-center gap-1.5 rounded-lg border border-gray-700 px-3 py-1.5 text-sm text-gray-400 transition-colors hover:border-red-500/50 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
          Eliminar
        </button>
      )}
    </div>
  );
}

export function UpcomingAppointments({
  appointments,
}: {
  appointments: UpcomingAppointment[];
}) {
  if (appointments.length === 0) {
    return <p className="text-sm text-gray-500">No tienes citas próximas.</p>;
  }

  return (
    <div className="flex flex-col">
      {appointments.map((appt) => (
        <AppointmentRow key={appt.id} appointment={appt} />
      ))}
    </div>
  );
}
