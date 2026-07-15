# Auditoría técnica y funcional — MVP Fase 1 (DW Consultorios)

Fecha: 2026-07-14
Alcance: revisión completa del código existente antes de agregar nuevas funcionalidades (Fase 2). No se agregaron features nuevas durante esta auditoría.

## 1. Arquitectura y estructura

Sólida para el tamaño del MVP: Next.js App Router con capa de API propia (Route Handlers) separando UI de lógica de negocio, motor de disponibilidad aislado y testeado (`src/lib/availability/engine.ts`), y una función compartida `createAppointment()` (`src/lib/appointments/create-appointment.ts`) usada por los 3 orígenes posibles de una reserva (`doctor` / `public` / `assistant`). El diseño ya anticipa Fase 2 (chat IA) sin necesitar reescritura: el asistente solo tendrá que llamar a `createAppointment()` con `source: "assistant"`.

**Hallazgo menor (código muerto)**: `PROTECTED_PREFIXES` en `src/middleware.ts` incluía `"/appointments"`, pero no existe ninguna página en esa ruta (solo `/api/appointments`, que no matchea ese prefijo y se autoprotege con su propio chequeo de sesión). Confuso para quien lea el código después.

## 2. Seguridad (Auth, RLS, Service Role)

- RLS bien diseñado: cada policy usa `doctor_id = auth.uid()`, y hay un FK compuesto `(patient_id, doctor_id)` que impide a nivel de BD que un paciente quede colgado de un doctor distinto.
- El service role solo se usa server-side (`admin.ts` con `import "server-only"`), nunca llega al cliente.
- `/api/appointments/[id]` (DELETE) devuelve 404 en vez de 403 cuando la cita es de otro doctor — buena práctica, no revela existencia.

**Hallazgo crítico**: sin normalización de teléfono. Los pacientes se deduplican con `phone` exacto (`UNIQUE(doctor_id, phone)`), pero nada limpiaba el input — `"5551234567"`, `"555-123-4567"` y `"+52 555 123 4567"` se guardaban como pacientes distintos. Confirmado en datos reales de producción (3 pacientes con teléfonos guardados con espacios: `"664 801 8063"`, `"222 801 8067"`, `"123 4567890"`). Esto rompe la regla de negocio "reutilización automática de registro existente" y debilitaba la regla de "sin cita futura duplicada" (se puede evadir variando el formato).

**Hallazgo crítico (para producción real)**: cero anti-abuso en los endpoints públicos. `POST /api/public/appointments` y `GET /api/availability` no tienen rate limiting, CAPTCHA ni verificación de que el teléfono sea real. Cualquiera que conozca el slug de un doctor puede llenarle la agenda de citas falsas con un script simple.

**Hallazgo importante**: sin protección CSRF explícita en las rutas que mutan estado (`POST/DELETE /api/appointments*`). Las cookies de Supabase probablemente usan `SameSite=Lax`, que mitiga bastante, pero no reemplaza una verificación explícita de `Origin`/`Referer`.

**Hallazgo importante**: la regla "sin cita futura duplicada" (para `public`/`assistant`) vive solo en código de aplicación, sin constraint en BD — dos requests concurrentes con el mismo teléfono podrían colar dos citas antes de que ninguna termine de insertarse.

## 3. Flujo de login

Correcto y verificado en producción: Server Action, mensaje de error genérico (no revela si el email existe), middleware redirige según sesión. Sin hallazgos.

## 4. Flujo de agenda de citas (crear/eliminar)

Funciona según lo probado end-to-end. Hallazgo: falta de validación de formato/longitud en `patientName`/`patientPhone`/`reason` — ligado al hallazgo crítico de normalización de teléfono.

## 5. Flujo de reserva pública (RF09)

Funciona correctamente y el aislamiento de datos es bueno (nunca expone pacientes de otros doctores). Comparte los mismos hallazgos de anti-abuso y normalización de teléfono.

## 6. Manejo de errores

Consistente: todas las rutas devuelven `{ error: string }` con status codes apropiados (400/401/404/409/500). Sin hallazgos.

## 7. UX/UI

- El link público del doctor solo se mostraba como texto (`/dr-antonio`), sin dominio completo ni botón de copiar.
- El formulario público, tras confirmar, no ofrece "reservar otra cita" ni botón de volver (aceptable para MVP, mejorable).
- Los slots deshabilitados solo se comunican visualmente (tachado); un lector de pantalla no anuncia "ocupado".

## 8. Código duplicado

- `NewAppointmentForm` y `PublicBookingForm` son ~85% idénticos (mismo fetch de disponibilidad, mismo grid de slots, mismos estilos).
- `BUSINESS_TIMEZONE = "America/Mexico_City"` estaba redeclarado en 4 archivos en vez de importarse de `engine.ts`.
- `UUID_PATTERN` duplicado en 2 rutas API.

## 9. Componentes refactorizables

El par de formularios de reserva es el candidato obvio para un hook `useAvailabilitySlots(doctorId, date)` + componente `<SlotGrid>` compartido. **No se tocó en esta pasada** (refactor de UI pospuesto a petición explícita — ver sección de cambios aplicados).

## 10. Mejoras prioritarias para producción

1. Normalización de teléfono (crítico, afecta integridad de datos ya).
2. Rate limiting / anti-abuso en endpoints públicos (crítico para el modelo de negocio).
3. Constraint o lock a nivel BD para la regla de cita futura duplicada.
4. Verificación de Origin en rutas mutables.
5. Actualizar Node local (18→20/22) — Vercel ya corre Node 24.x en producción, así que el pineo de versiones (Next 15 en vez de 16, Tailwind v3, vitest 3.2.7, el polyfill de WebSocket) es deuda solo del entorno local, no de producción.

## Deuda técnica

- Stack pineado a Node 18 localmente (ver punto 5 arriba) — no urgente pero acumula fricción.
- Sin tests para `createAppointment()` (la función de negocio más crítica) ni para las rutas API — solo el motor de disponibilidad tiene cobertura (11 tests).
- Migraciones aplicadas manualmente vía SQL Editor, no vía `supabase db push` — funciona pero no queda un historial reproducible automatizado.

## Roadmap para Fase 2

1. Resolver primero los hallazgos críticos de esta auditoría — el chat va a pegarle al mismo endpoint público sin supervisión humana, así que las mismas fallas se vuelven más probables y más costosas ahí.
2. Falta construir el endpoint que use `source: "assistant"` (ya soportado en `createAppointment()`, pero no hay ruta que lo invoque todavía).
3. Definir qué pasa con cancelaciones: `DELETE /api/appointments/[id]` hoy exige sesión de doctor; el chat no la tiene. El documento no contempla que el paciente cancele — hay que decidir si eso cambia.
4. RF02 (vista de calendario visual día/semana) sigue pendiente de Fase 1 — probablemente conviene cerrarla antes de que el chat empiece a llenar la agenda.

---

## Registro de cambios aplicados (2026-07-14)

A petición explícita, se implementaron únicamente las mejoras de alta prioridad que no implican rediseño ni refactor masivo. **No se tocó** la duplicación entre `NewAppointmentForm`/`PublicBookingForm` (pospuesta), ni se agregó rate limiting/CAPTCHA (pospuesto).

1. **Normalización y validación de teléfono/nombre/motivo** — centralizado en `src/lib/patients/validate-patient-input.ts` (`normalizePhone`, `validatePatientName`, `validatePatientPhone`, `validateReason`) e integrado en `createAppointment()` (`src/lib/appointments/create-appointment.ts`), el único punto por el que pasan los 3 orígenes (doctor/público/asistente). Reglas: nombre 2–120 caracteres, teléfono 10–15 dígitos tras quitar todo lo que no sea número, motivo máx. 500 caracteres.
2. **Centralización de constantes**:
   - `UUID_PATTERN` movido a `src/lib/validation/uuid.ts`, usado por `GET /api/availability` y `POST /api/public/appointments`.
   - `BUSINESS_TIMEZONE` (y el resto de constantes de horario) movidas a `src/lib/availability/constants.ts` — módulo sin dependencias para no arrastrar `luxon` a los Client Components. `engine.ts` las re-exporta para no romper imports existentes; `upcoming-appointments.tsx`, `new-appointment-form.tsx` y `public-booking-form.tsx` ahora importan de ahí en vez de redeclarar el string.
3. **Código muerto eliminado**: quitado `"/appointments"` de `PROTECTED_PREFIXES` en `src/lib/supabase/middleware.ts` (no correspondía a ninguna página real).
4. **Link público completo + botón de copiar**: `src/lib/url.ts` (helper `getBaseUrl()` vía `next/headers`, sin depender de una env var de dominio) + `src/app/dashboard/copy-link-button.tsx`, integrados en `/dashboard`.

### Verificación

- Build, lint y los 11 tests existentes pasan sin cambios.
- Probado en real (navegador headless contra Supabase real): creación de cita con teléfono `"555 999-0001"` se guardó normalizado como `"5559990001"`; teléfono de 3 dígitos, nombre de 1 carácter y motivo de 501 caracteres rechazados con 400 y su mensaje específico.
- El botón "Copiar enlace" no se pudo verificar el clipboard end-to-end en Chrome headless (limitación conocida de automatización, deniega el permiso aunque se fuerce por API) — el código sigue el patrón estándar de `navigator.clipboard.writeText`; recomendado un click manual de confirmación en navegador real.

### Migración pendiente de correr

`supabase/migrations/0003_normalize_and_constrain_phone.sql` — normaliza los teléfonos ya existentes en `patients` (se detectaron 3 registros reales con espacios) y agrega un `CHECK` que exige 10–15 dígitos hacia adelante, como defensa adicional a nivel de base de datos. Pendiente de correr vía SQL Editor (igual que las migraciones anteriores).
