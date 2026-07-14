import { notFound } from "next/navigation";
import { Calendar } from "lucide-react";
import { createAdminClient } from "@/lib/supabase/admin";
import { PublicBookingForm } from "./public-booking-form";

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ doctorSlug: string }>;
}) {
  const { doctorSlug } = await params;
  const supabase = createAdminClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id, name, slug")
    .eq("slug", doctorSlug)
    .maybeSingle();

  if (!doctor) {
    notFound();
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-500 to-cyan-500">
          <Calendar className="h-6 w-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">{doctor.name}</h1>
          <p className="text-sm text-gray-400">Reserva tu cita en línea</p>
        </div>
      </div>

      <PublicBookingForm doctorId={doctor.id} />
    </div>
  );
}
