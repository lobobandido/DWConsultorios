export const PATIENT_NAME_MIN_LENGTH = 2;
export const PATIENT_NAME_MAX_LENGTH = 120;
export const PATIENT_PHONE_MIN_DIGITS = 10;
export const PATIENT_PHONE_MAX_DIGITS = 15;
export const REASON_MAX_LENGTH = 500;

/**
 * Deja solo dígitos ("555-123 4567" -> "5551234567"). No unifica prefijos de
 * país (+52 555... seguiría distinto de 555...), pero resuelve la variación
 * de formato real que rompía la deduplicación de pacientes por teléfono.
 */
export function normalizePhone(rawPhone: string): string {
  return rawPhone.replace(/\D/g, "");
}

export function validatePatientName(name: string): string | null {
  const trimmed = name.trim();
  if (trimmed.length < PATIENT_NAME_MIN_LENGTH || trimmed.length > PATIENT_NAME_MAX_LENGTH) {
    return `El nombre debe tener entre ${PATIENT_NAME_MIN_LENGTH} y ${PATIENT_NAME_MAX_LENGTH} caracteres`;
  }
  return null;
}

export function validatePatientPhone(normalizedPhone: string): string | null {
  if (
    normalizedPhone.length < PATIENT_PHONE_MIN_DIGITS ||
    normalizedPhone.length > PATIENT_PHONE_MAX_DIGITS
  ) {
    return `El teléfono debe tener entre ${PATIENT_PHONE_MIN_DIGITS} y ${PATIENT_PHONE_MAX_DIGITS} dígitos`;
  }
  return null;
}

export function validateReason(reason: string | null): string | null {
  if (reason && reason.length > REASON_MAX_LENGTH) {
    return `El motivo no puede superar ${REASON_MAX_LENGTH} caracteres`;
  }
  return null;
}
