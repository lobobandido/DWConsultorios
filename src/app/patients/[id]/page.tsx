import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PATIENT_DOCUMENT_BUCKET } from "@/lib/patients/document-bucket";
import { UploadPhotoForm } from "./upload-photo-form";
import { PhotoGallery, type PatientPhoto } from "./photo-gallery";

const SIGNED_URL_TTL_SECONDS = 300;

export default async function PatientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const { data: patient } = await supabase
    .from("patients")
    .select("id, name, phone")
    .eq("id", id)
    .eq("doctor_id", user.id)
    .maybeSingle();

  if (!patient) {
    notFound();
  }

  const { data: documents } = await supabase
    .from("patient_documents")
    .select("id, storage_path, created_at")
    .eq("patient_id", id)
    .order("created_at", { ascending: false });

  const photos: PatientPhoto[] = [];
  for (const doc of documents ?? []) {
    const { data: signed } = await supabase.storage
      .from(PATIENT_DOCUMENT_BUCKET)
      .createSignedUrl(doc.storage_path, SIGNED_URL_TTL_SECONDS);

    if (signed?.signedUrl) {
      photos.push({ id: doc.id, url: signed.signedUrl, createdAt: doc.created_at });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-12">
      <div>
        <Link
          href="/patients"
          className="mb-4 flex w-fit items-center gap-1.5 text-sm text-gray-400 hover:text-white"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Pacientes
        </Link>
        <h1 className="text-2xl font-bold text-white">{patient.name}</h1>
        <p className="text-sm text-gray-400">{patient.phone}</p>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
        <h2 className="mb-4 text-sm font-medium text-gray-300">
          Historial (fotos)
        </h2>
        <PhotoGallery photos={photos} patientId={patient.id} />
      </div>

      <UploadPhotoForm patientId={patient.id} />
    </div>
  );
}
