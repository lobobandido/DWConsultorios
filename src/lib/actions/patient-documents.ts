"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { PATIENT_DOCUMENT_BUCKET } from "@/lib/patients/document-bucket";

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];

export type ActionResult = { error: string | null };

export async function uploadPatientDocument(
  _prevState: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const patientId = formData.get("patientId");
  if (typeof patientId !== "string" || !patientId) {
    return { error: "Falta el paciente" };
  }

  // Se evita "instanceof File": el global File no existe en Node 18 (sí en
  // Node 24, lo que corre Vercel), así que se valida por forma en vez de tipo.
  const file = formData.get("file");
  if (
    typeof file === "string" ||
    !file ||
    typeof file.size !== "number" ||
    typeof file.type !== "string" ||
    file.size === 0
  ) {
    return { error: "Selecciona una imagen" };
  }
  if (file.size > MAX_FILE_SIZE) {
    return { error: "La imagen no puede superar 10MB" };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: "Solo se permiten imágenes JPEG, PNG, WEBP o HEIC" };
  }

  const extension = file.name.includes(".") ? file.name.split(".").pop() : "jpg";
  const storagePath = `${user.id}/${patientId}/${randomUUID()}.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from(PATIENT_DOCUMENT_BUCKET)
    .upload(storagePath, file, { contentType: file.type });

  if (uploadError) {
    return { error: "No se pudo subir la imagen" };
  }

  const { error: insertError } = await supabase.from("patient_documents").insert({
    doctor_id: user.id,
    patient_id: patientId,
    storage_path: storagePath,
  });

  if (insertError) {
    await supabase.storage.from(PATIENT_DOCUMENT_BUCKET).remove([storagePath]);
    return { error: "No se pudo guardar el registro de la imagen" };
  }

  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}

export async function deletePatientDocument(
  documentId: string,
  patientId: string,
): Promise<ActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado" };

  const { data: doc } = await supabase
    .from("patient_documents")
    .select("id, storage_path")
    .eq("id", documentId)
    .eq("doctor_id", user.id)
    .maybeSingle();

  if (!doc) return { error: "Imagen no encontrada" };

  await supabase.storage.from(PATIENT_DOCUMENT_BUCKET).remove([doc.storage_path]);
  await supabase.from("patient_documents").delete().eq("id", documentId);

  revalidatePath(`/patients/${patientId}`);
  return { error: null };
}
