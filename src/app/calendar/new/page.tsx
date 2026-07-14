import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewAppointmentForm } from "./new-appointment-form";

export default async function NewAppointmentPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Nueva cita</h1>
        <p className="text-sm text-gray-400">
          Elige un horario disponible y captura los datos del paciente.
        </p>
      </div>

      <NewAppointmentForm doctorId={user.id} />
    </div>
  );
}
