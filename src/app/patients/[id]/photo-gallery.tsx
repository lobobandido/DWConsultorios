"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Trash2, X, Check } from "lucide-react";
import { deletePatientDocument } from "@/lib/actions/patient-documents";

export type PatientPhoto = {
  id: string;
  url: string;
  createdAt: string;
};

function PhotoCard({
  photo,
  patientId,
}: {
  photo: PatientPhoto;
  patientId: string;
}) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setDeleting(true);
    setError(null);

    const result = await deletePatientDocument(photo.id, patientId);

    if (result.error) {
      setError(result.error);
      setDeleting(false);
      return;
    }

    router.refresh();
  }

  return (
    <div className="group relative overflow-hidden rounded-xl border border-white/10 bg-white/5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo.url}
        alt="Foto del historial del paciente"
        className="aspect-square w-full object-cover"
      />
      <div className="absolute inset-x-0 bottom-0 flex flex-col gap-1 bg-black/70 p-2 backdrop-blur-sm">
        <p className="text-[10px] text-gray-300">
          {new Date(photo.createdAt).toLocaleDateString("es-MX")}
        </p>
        {error && <p className="text-[10px] text-red-400">{error}</p>}
        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 rounded bg-red-500/30 px-2 py-1 text-[11px] text-red-300 hover:bg-red-500/40"
            >
              <Check className="h-3 w-3" />
              {deleting ? "..." : "Confirmar"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              className="flex items-center gap-1 rounded border border-gray-600 px-2 py-1 text-[11px] text-gray-300"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="flex w-fit items-center gap-1 rounded border border-gray-600 px-2 py-1 text-[11px] text-gray-300 hover:border-red-500/50 hover:text-red-400"
          >
            <Trash2 className="h-3 w-3" />
            Eliminar
          </button>
        )}
      </div>
    </div>
  );
}

export function PhotoGallery({
  photos,
  patientId,
}: {
  photos: PatientPhoto[];
  patientId: string;
}) {
  if (photos.length === 0) {
    return (
      <p className="text-sm text-gray-500">
        Sin fotos todavía. Sube la primera abajo.
      </p>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {photos.map((photo) => (
        <PhotoCard key={photo.id} photo={photo} patientId={patientId} />
      ))}
    </div>
  );
}
