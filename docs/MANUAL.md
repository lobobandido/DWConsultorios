# Manual de DW Consultorios — Fase 1 (MVP)

Versión: 2026-07-15
Estado: Fase 1 funcional en producción. Fase 2 (chat con IA) no construida todavía.

Este manual tiene dos partes: una técnica (para ti, como responsable del proyecto) y una de uso (para el doctor que usa la app día a día).

---

# Parte 1 — Manual técnico

## 1. Qué es esto

DW Consultorios es una agenda médica: el doctor administra su calendario desde un panel privado, y sus pacientes pueden reservar citas solos desde un link público, sin necesidad de cuenta ni contraseña.

## 2. Dónde vive todo

| Componente | Ubicación |
|---|---|
| Código | github.com/lobobandido/DWConsultorios |
| Aplicación en vivo | Vercel — proyecto `dw-consultorios` (equipo `lobobandidos-projects`) |
| Base de datos / Auth / Storage | Supabase — proyecto `kiuasevbhkvuirdmdqqi` |
| Carpeta local | `~/Documentos/aar/varios/dw-consultorios` |

## 3. Stack técnico

- **Next.js 15** (App Router) + TypeScript — frontend y API en el mismo proyecto.
- **Tailwind CSS v3** — estilos.
- **Supabase**: Postgres (base de datos), Auth (login del doctor), Storage (fotos de pacientes).
- **Vercel**: hosting, despliegue automático al hacer `git push`.
- **Node 18** localmente (por eso algunas dependencias están en versiones específicas — ver sección 9). Vercel despliega con Node 24, sin este límite.

## 4. Cómo correr el proyecto en tu máquina

```bash
cd ~/Documentos/aar/varios/dw-consultorios
npm install
npm run dev
```

Abre `http://localhost:3000`. Necesitas el archivo `.env.local` con las credenciales de Supabase (no está en git, es tuyo local). Si no lo tienes, usa `.env.local.example` como plantilla y llena:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (sensible — bypasa todas las reglas de seguridad, no la compartas)

## 5. Cómo desplegar cambios

1. Haces cambios en el código (tú o yo).
2. Se hace `git commit`.
3. Tú corres `git push` desde la carpeta del proyecto.
4. Vercel detecta el push y despliega solo — en 1-2 minutos queda en `https://dw-consultorios.vercel.app`.

Si cambias variables de entorno en Vercel (Settings → Environment Variables), **necesitas forzar un redeploy** — cambiarlas no actualiza el sitio ya desplegado por sí solo.

## 6. Cómo correr una migración de base de datos

Cuando el código incluye un archivo nuevo en `supabase/migrations/`, hay que aplicarlo manualmente (no hay automatización todavía):

1. Entra a **supabase.com/dashboard** → tu proyecto → **SQL Editor** → **New query**.
2. Copia el contenido del archivo de migración nuevo.
3. Pégalo y dale **Run**.
4. Debe decir "Success". Si falla, no sigas — pásame el error.

Las migraciones se corren **en orden** (0001, 0002, 0003...) y solo una vez cada una.

## 7. Cómo dar de alta un doctor nuevo

No hay registro público — todo alta de doctor es manual, vía script:

```bash
cd ~/Documentos/aar/varios/dw-consultorios
npm run create-doctor -- --email doctor@ejemplo.com --password "contraseña-segura" --name "Dra. Ana Pérez" --slug ana-perez
```

- `--slug`: identificador para la URL pública de reservas (`/ana-perez`). Solo minúsculas, números y guiones.
- Esto crea el usuario en Supabase Auth y su fila en la tabla `doctors` en un solo paso.

## 8. Arquitectura por dentro (resumen)

- `src/app/` — páginas y rutas de API (App Router de Next.js).
  - `/login`, `/dashboard`, `/calendar/new`, `/patients`, `/patients/[id]` — panel del doctor (requieren sesión).
  - `/[doctorSlug]` — página pública de reservas (sin sesión).
  - `/api/availability`, `/api/appointments`, `/api/public/appointments` — endpoints.
- `src/lib/availability/engine.ts` — el motor que calcula horarios disponibles (L-V 08:00-18:00, slots de 30 min, zona horaria `America/Mexico_City`). Aislado y con tests automatizados.
- `src/lib/appointments/create-appointment.ts` — la única función que crea citas, sin importar si viene del doctor, del formulario público o (en el futuro) del chat de IA. La diferencia de comportamiento entre esos tres orígenes se controla con un parámetro `source`, no con código duplicado.
- `src/lib/supabase/` — clientes de Supabase (uno para el navegador, uno para el servidor con sesión, uno "admin" con permisos totales que nunca se expone al cliente).
- Seguridad de datos: cada tabla tiene Row Level Security (RLS) — un doctor solo puede ver/tocar sus propios pacientes y citas, aunque alguien intentara acceder directo a la base de datos.

## 9. Cosas que quedaron pineadas por el entorno local (no por elección)

Tu máquina tiene Node 18.19, y varias herramientas ya requieren Node 20+ por defecto. Para que todo funcionara localmente, se usaron versiones específicas: Next.js 15 (no 16), Tailwind v3 (no v4), vitest 3.2.7. Esto **no afecta producción** (Vercel ya usa Node 24), es solo para que puedas seguir desarrollando en esta máquina sin fricción. Si en algún momento actualizas Node localmente (via `nvm install 22`), se puede revisar subir estas versiones.

## 10. Qué falta de Fase 1 y qué es Fase 2

**Pendiente de Fase 1** (documento original):
- RF02: vista de calendario visual (día/semana en cuadrícula). Hoy el doctor ve una lista simple de "Próximas citas", funcional pero no un calendario gráfico.

**Fase 2** (chat con IA — no construida, sesión aparte cuando decidas empezar):
- El chat consumirá los mismos endpoints ya construidos (`/api/availability`, y un endpoint de creación de citas con `source: "assistant"` que falta construir, aunque la lógica de negocio ya está lista para recibirlo).

**Agregado fuera del alcance original** (petición de un cliente real):
- Expediente básico: cada paciente puede tener varias fotos de su historial (ver sección de uso, parte 2).
- Rate limiting en los endpoints públicos (protección básica contra abuso/spam).

Detalle completo de la auditoría técnica y decisiones de seguridad: `docs/AUDITORIA_MVP_FASE1.md`.

## 11. Contraseñas y credenciales — quién tiene qué

- **Service role key de Supabase**: bypasa toda regla de seguridad. Solo debe vivir en `.env.local` (tu máquina) y en las variables de entorno de Vercel. Nunca en el código, nunca en git, nunca por chat/WhatsApp.
- **Contraseñas de doctores**: las defines tú al darlos de alta con el script (sección 7). Recomendado: contraseña única por doctor, comunicada de forma privada (no por el mismo canal que el link público).

---

# Parte 2 — Manual de uso (para el doctor)

## 1. Cómo entrar

1. Ve a `https://dw-consultorios.vercel.app/login`.
2. Ingresa tu email y contraseña (te los da el administrador del sistema).
3. Entras directo a tu panel (`/dashboard`).

## 2. Qué ves en tu panel

- **Tu enlace público de reservas**: un link único tuyo (ej. `https://dw-consultorios.vercel.app/ana-perez`). Cualquier paciente que lo abra puede reservar una cita contigo sin necesitar cuenta. Hay un botón **"Copiar enlace"** para mandarlo fácil por WhatsApp, redes o donde prefieras.
- **Nueva cita**: para agendar tú mismo una cita (ej. si el paciente te llama por teléfono).
- **Pacientes**: la lista de tus pacientes, con acceso a su expediente de fotos.
- **Próximas citas**: lista de tus citas agendadas a futuro, con nombre y teléfono del paciente, y motivo si lo capturaste. Cada una tiene un botón **Eliminar** (pide confirmación antes de borrar).

## 3. Cómo crear una cita manualmente

1. Click en **"Nueva cita"**.
2. Elige la fecha (solo días entre semana están disponibles).
3. Verás los horarios de 08:00 a 18:00 en bloques de 30 minutos — los ya ocupados aparecen tachados.
4. Click en un horario libre.
5. Llena nombre y teléfono del paciente (el motivo es opcional).
6. Click **"Crear cita"**.

Si el teléfono ya existe en tu lista de pacientes, el sistema lo reconoce automáticamente — no crea un paciente duplicado.

## 4. Cómo eliminar una cita

1. En "Próximas citas", busca la cita.
2. Click **"Eliminar"**.
3. Confirma con el botón que aparece ("¿Eliminar esta cita?" → "Confirmar").

## 5. Cómo funciona la reserva de tus pacientes

Cuando un paciente abre tu link público:

1. Ve tu nombre y un calendario de horarios disponibles (mismo horario que manejas tú: L-V 08:00-18:00).
2. Elige fecha y hora libre.
3. Captura su nombre, teléfono y (opcional) motivo de consulta.
4. Confirma — la cita queda agendada al instante, sin que tú tengas que aprobarla, y aparece automáticamente en tu "Próximas citas".

Si un paciente ya tiene una cita futura pendiente contigo, el sistema no le permite reservar otra hasta que pase esa fecha o tú la elimines — esto evita reservas duplicadas por error. (Esta restricción **no aplica** cuando tú agendas manualmente desde tu panel — tú sí puedes agendarle varias citas futuras a un mismo paciente si hace falta, por ejemplo un seguimiento.)

## 6. Expediente básico: fotos de tus pacientes

Pensado para digitalizar el historial que manejas impreso:

1. Click en **"Pacientes"** desde tu panel.
2. Elige un paciente de la lista.
3. En su ficha verás las fotos que ya tenga subidas.
4. Para agregar una: click en el selector de archivo, elige la foto (JPEG, PNG, WEBP o HEIC, máximo 10MB), click **"Subir foto"**.
5. Para eliminar una foto: botón **"Eliminar"** sobre la foto → confirmar.

Puedes subir varias fotos por paciente (por ejemplo, distintas hojas del historial o visitas). No hay campos de texto adicionales por ahora — solo la imagen y la fecha en que la subiste.

## 7. Limitaciones actuales (a propósito, por ahora)

- No hay vista de calendario visual (día/semana en cuadrícula) — solo la lista de próximas citas.
- No se puede reagendar una cita (hay que eliminarla y crear una nueva).
- No hay recordatorios automáticos (SMS/WhatsApp/email) para el paciente.
- No hay chat con IA todavía (viene en una fase futura).
- Una cuenta = un doctor. No hay soporte para secretarias ni múltiples doctores en un mismo consultorio todavía.

## 8. ¿Algo no funciona como se describe aquí?

Avísale al administrador del sistema con el mayor detalle posible: qué botón apretaste, qué esperabas que pasara, y qué pasó en realidad (o una captura de pantalla si puedes). Eso ayuda a diagnosticar rápido.
