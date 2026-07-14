"use client";

import { useEffect, useState } from "react";
import { Check, Send } from "lucide-react";

const BUSINESS_TIMEZONE = "America/Mexico_City";

type SlotAvailability = {
  start: string;
  end: string;
  available: boolean;
};

function todayInBusinessTimezone(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: BUSINESS_TIMEZONE }).format(
    new Date(),
  );
}

function formatSlotTime(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: BUSINESS_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(iso));
}

function formatSlotDate(iso: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "long",
    day: "2-digit",
    month: "long",
  }).format(new Date(iso));
}

export function PublicBookingForm({ doctorId }: { doctorId: string }) {
  const [date, setDate] = useState(todayInBusinessTimezone);
  const [slots, setSlots] = useState<SlotAvailability[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);

  const [selectedSlot, setSelectedSlot] = useState<SlotAvailability | null>(null);
  const [patientName, setPatientName] = useState("");
  const [patientPhone, setPatientPhone] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<SlotAvailability | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoadingSlots(true);
    setSlotsError(null);
    setSelectedSlot(null);

    fetch(`/api/availability?doctor_id=${doctorId}&date=${date}`)
      .then(async (res) => {
        if (!res.ok) throw new Error((await res.json()).error ?? "Error");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setSlots(data.slots);
      })
      .catch(() => {
        if (!cancelled) setSlotsError("No se pudo cargar la disponibilidad.");
      })
      .finally(() => {
        if (!cancelled) setLoadingSlots(false);
      });

    return () => {
      cancelled = true;
    };
  }, [doctorId, date]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedSlot) return;

    setSubmitting(true);
    setSubmitError(null);

    try {
      const res = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          doctorId,
          start: selectedSlot.start,
          patientName,
          patientPhone,
          reason,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setSubmitError(data.error ?? "No se pudo agendar la cita.");
        return;
      }

      setConfirmed(selectedSlot);
    } finally {
      setSubmitting(false);
    }
  }

  if (confirmed) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-teal-500/30 bg-teal-500/10 p-8 text-center">
        <Check className="h-10 w-10 text-teal-400" />
        <h2 className="text-lg font-bold text-white">¡Cita confirmada!</h2>
        <p className="text-sm text-gray-300">
          {formatSlotDate(confirmed.start)}, a las{" "}
          <span className="font-medium text-teal-400">
            {formatSlotTime(confirmed.start)}
          </span>
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="date" className="text-sm font-medium text-gray-300">
          Fecha
        </label>
        <input
          id="date"
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-fit rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2 text-white focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
        />
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-sm font-medium text-gray-300">
          Horarios disponibles
        </h2>

        {loadingSlots && <p className="text-sm text-gray-500">Cargando…</p>}
        {slotsError && <p className="text-sm text-red-400">{slotsError}</p>}
        {!loadingSlots && !slotsError && slots.length === 0 && (
          <p className="text-sm text-gray-500">
            Sin horarios disponibles para este día.
          </p>
        )}

        <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
          {slots.map((slot) => (
            <button
              key={slot.start}
              type="button"
              disabled={!slot.available}
              onClick={() => setSelectedSlot(slot)}
              className={`rounded-lg px-3 py-2 text-sm font-medium transition-all duration-150 ${
                selectedSlot?.start === slot.start
                  ? "bg-gradient-to-r from-teal-600 to-cyan-600 text-white"
                  : slot.available
                    ? "border border-gray-700 bg-gray-900/50 text-gray-300 hover:border-teal-500/50 hover:text-white"
                    : "cursor-not-allowed border border-gray-800 bg-gray-900/20 text-gray-600 line-through"
              }`}
            >
              {formatSlotTime(slot.start)}
            </button>
          ))}
        </div>
      </div>

      {selectedSlot && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
        >
          <p className="text-sm font-medium text-gray-300">
            Horario elegido:{" "}
            <span className="text-teal-400">
              {formatSlotDate(selectedSlot.start)},{" "}
              {formatSlotTime(selectedSlot.start)}
            </span>
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="patientName" className="text-sm text-gray-300">
              Tu nombre
            </label>
            <input
              id="patientName"
              required
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="patientPhone" className="text-sm text-gray-300">
              Tu teléfono
            </label>
            <input
              id="patientPhone"
              required
              value={patientPhone}
              onChange={(e) => setPatientPhone(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="reason" className="text-sm text-gray-300">
              Motivo de la consulta (opcional)
            </label>
            <input
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="rounded-lg border border-gray-700 bg-gray-900/50 px-4 py-2.5 text-white placeholder:text-gray-500 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/50"
            />
          </div>

          {submitError && (
            <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {submitError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:from-teal-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Send className="h-4 w-4" />
            {submitting ? "Agendando…" : "Confirmar cita"}
          </button>
        </form>
      )}
    </div>
  );
}
