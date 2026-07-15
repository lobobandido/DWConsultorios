import { redirect } from "next/navigation";
import Link from "next/link";
import { Users } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function PatientsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: patients } = await supabase
    .from("patients")
    .select("id, name, phone")
    .eq("doctor_id", user.id)
    .order("name", { ascending: true });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <div>
        <h1 className="text-2xl font-bold text-white">Pacientes</h1>
        <p className="text-sm text-gray-400">
          Consulta el expediente (fotos) de cada paciente.
        </p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 backdrop-blur-sm">
        {!patients || patients.length === 0 ? (
          <p className="p-8 text-sm text-gray-500">
            Todavía no tienes pacientes registrados.
          </p>
        ) : (
          <div className="flex flex-col">
            {patients.map((patient) => (
              <Link
                key={patient.id}
                href={`/patients/${patient.id}`}
                className="flex items-center gap-3 border-b border-white/10 px-6 py-4 transition-colors last:border-b-0 hover:bg-white/5"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gray-800">
                  <Users className="h-4 w-4 text-gray-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">{patient.name}</p>
                  <p className="text-xs text-gray-500">{patient.phone}</p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
