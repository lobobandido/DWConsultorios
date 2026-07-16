import "server-only";
import { Resend } from "resend";
import { BUSINESS_TIMEZONE } from "@/lib/availability/constants";

/**
 * Avisa al doctor por correo cuando llega una reserva del formulario
 * público (nadie más las ve hasta que entra al dashboard). Si no hay
 * RESEND_API_KEY configurada, o el envío falla, no bloquea ni afecta la
 * confirmación de la cita — es un aviso adicional, no parte del flujo
 * crítico de reservar.
 */
export async function notifyDoctorOfNewAppointment(params: {
  doctorEmail: string;
  patientName: string;
  patientPhone: string;
  reason: string | null;
  startISO: string;
}): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;

  try {
    const resend = new Resend(apiKey);

    const dateLabel = new Intl.DateTimeFormat("es-MX", {
      timeZone: BUSINESS_TIMEZONE,
      weekday: "long",
      day: "2-digit",
      month: "long",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).format(new Date(params.startISO));

    await resend.emails.send({
      from: "DW Consultorios <onboarding@resend.dev>",
      to: params.doctorEmail,
      subject: `Nueva cita: ${params.patientName}`,
      text: [
        "Tienes una nueva reserva desde tu formulario público.",
        "",
        `Paciente: ${params.patientName}`,
        `Teléfono: ${params.patientPhone}`,
        `Motivo: ${params.reason ?? "No especificado"}`,
        `Fecha: ${dateLabel}`,
        "",
        "Ver en tu panel: https://dw-consultorios.vercel.app/dashboard",
      ].join("\n"),
    });
  } catch {
    // Falla silenciosa a propósito: la cita ya quedó confirmada, el correo
    // es un aviso adicional, no debe tumbar la reserva del paciente.
  }
}
