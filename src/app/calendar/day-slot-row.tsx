"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, Check } from "lucide-react";
import { BUSINESS_TIMEZONE } from "@/lib/availability/constants";

function formatTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

export type OccupiedSlot = {
  start: string;
  end: string;
  appointmentId: string;
  patientName: string;
  patientPhone: string;
};

export function DaySlotRow({ slot }: { slot: OccupiedSlot }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const res = await fetch(`/api/appointments/${slot.appointmentId}`, {
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
    <div className="flex flex-col gap-2 border-b border-white/10 px-4 py-3 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="text-sm font-medium text-white">
          {formatTime(slot.start)} - {formatTime(slot.end)}
        </p>
        <p className="text-sm text-gray-400">
          {slot.patientName} · {slot.patientPhone}
        </p>
        {error && <p className="text-xs text-red-400">{error}</p>}
      </div>

      {confirming ? (
        <div className="flex items-center gap-2">
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
