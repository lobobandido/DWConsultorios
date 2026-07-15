/**
 * Constantes puras, sin dependencias (ni siquiera luxon), para poder
 * importarse también desde Client Components sin arrastrar el motor de
 * disponibilidad completo al bundle del navegador.
 */
export const BUSINESS_TIMEZONE = "America/Mexico_City";
export const BUSINESS_START_HOUR = 8;
export const BUSINESS_END_HOUR = 18;
export const SLOT_DURATION_MINUTES = 30;
