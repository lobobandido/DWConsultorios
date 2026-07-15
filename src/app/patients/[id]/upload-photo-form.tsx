"use client";

import { useActionState, useRef } from "react";
import { Upload } from "lucide-react";
import {
  uploadPatientDocument,
  type ActionResult,
} from "@/lib/actions/patient-documents";

const initialState: ActionResult = { error: null };

export function UploadPhotoForm({ patientId }: { patientId: string }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [state, formAction, pending] = useActionState(
    uploadPatientDocument,
    initialState,
  );

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm"
    >
      <input type="hidden" name="patientId" value={patientId} />

      <label htmlFor="file" className="text-sm font-medium text-gray-300">
        Subir foto del historial
      </label>
      <input
        id="file"
        name="file"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic"
        required
        className="text-sm text-gray-400 file:mr-3 file:rounded-lg file:border-0 file:bg-gray-800 file:px-3 file:py-1.5 file:text-sm file:text-gray-300"
      />
      <p className="text-xs text-gray-500">JPEG, PNG, WEBP o HEIC, máx. 10MB.</p>

      {state.error && (
        <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-400">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="flex w-fit items-center gap-2 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:from-teal-700 hover:to-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Upload className="h-4 w-4" />
        {pending ? "Subiendo…" : "Subir foto"}
      </button>
    </form>
  );
}
