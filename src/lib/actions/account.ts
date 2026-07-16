"use server";

import { createClient } from "@/lib/supabase/server";

export type ChangePasswordState = { error: string | null; success: boolean };

const MIN_PASSWORD_LENGTH = 8;

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "No autenticado", success: false };

  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");

  if (newPassword.length < MIN_PASSWORD_LENGTH) {
    return {
      error: `La contraseña debe tener al menos ${MIN_PASSWORD_LENGTH} caracteres`,
      success: false,
    };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Las contraseñas no coinciden", success: false };
  }

  const { error } = await supabase.auth.updateUser({ password: newPassword });

  if (error) {
    return { error: "No se pudo cambiar la contraseña", success: false };
  }

  return { error: null, success: true };
}
