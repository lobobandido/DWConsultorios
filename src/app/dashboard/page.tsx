import { redirect } from "next/navigation";
import Link from "next/link";
import { CalendarPlus, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { logout } from "@/lib/actions/auth";

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
            <p>
              Vista de calendario en construcción. Slug público:{" "}
              <span className="font-mono text-teal-400">/{doctor.slug}</span>
            </p>
            <Link
              href="/calendar/new"
              className="flex w-fit items-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 hover:from-teal-700 hover:to-cyan-700"
            >
              <CalendarPlus className="h-4 w-4" />
              Nueva cita
            </Link>
          </div>
        ) : (
          <p>
            Tu usuario existe en Supabase Auth pero todavía no tiene una fila
            en <span className="font-mono text-teal-400">doctors</span>. Créala
            con el script de alta manual (Paso 2).
          </p>
        )}
      </div>
    </div>
  );
}
