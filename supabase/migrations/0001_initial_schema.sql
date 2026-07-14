-- Fase 1: esquema mínimo (doctors, patients, appointments) sobre auth.users de Supabase.
-- Referencia: Requerimientos_MVP_Consolidado + Documentación de la BD + diagrama ER.

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- doctors: extiende auth.users (relación 1:1, id = auth.users.id)
-- ---------------------------------------------------------------------------
create table public.doctors (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null,
  -- slug: agregado respecto al diagrama ER original — lo necesita RF09 para
  -- la ruta pública /[doctorSlug]. No existía columna para esto.
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  chat_id uuid not null unique default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.doctors.slug is 'Identificador url-safe usado en /[doctorSlug] (formulario público de reservas).';
comment on column public.doctors.chat_id is 'Reservado para Fase 2 (chat embebido por doctor). No usado en Fase 1.';

-- ---------------------------------------------------------------------------
-- patients: identificados por teléfono dentro del contexto de un doctor
-- ---------------------------------------------------------------------------
create table public.patients (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  name text not null,
  phone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (doctor_id, phone)
);

create index patients_doctor_id_idx on public.patients (doctor_id);

-- Requerido para poder referenciar (patient_id, doctor_id) desde appointments
-- y así garantizar a nivel de base de datos que un paciente no pueda quedar
-- asociado a una cita de un doctor distinto al suyo.
alter table public.patients
  add constraint patients_id_doctor_id_key unique (id, doctor_id);

-- ---------------------------------------------------------------------------
-- appointments: todas las citas del sistema
-- ---------------------------------------------------------------------------
create table public.appointments (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  start_time timestamptz not null,
  end_time timestamptz not null,
  reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  -- Toda cita dura exactamente 30 minutos (regla de negocio, calculado en backend).
  constraint appointments_duration_check check (end_time = start_time + interval '30 minutes'),

  -- Evita que un paciente quede vinculado a una cita de un doctor distinto al suyo.
  foreign key (patient_id, doctor_id) references public.patients (id, doctor_id) on delete cascade,

  -- Un doctor no puede tener dos citas en el mismo horario.
  unique (doctor_id, start_time)
);

create index appointments_doctor_id_start_time_idx on public.appointments (doctor_id, start_time);
create index appointments_patient_id_idx on public.appointments (patient_id);

-- ---------------------------------------------------------------------------
-- updated_at automático
-- ---------------------------------------------------------------------------
create function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger doctors_set_updated_at
  before update on public.doctors
  for each row execute function public.set_updated_at();

create trigger patients_set_updated_at
  before update on public.patients
  for each row execute function public.set_updated_at();

create trigger appointments_set_updated_at
  before update on public.appointments
  for each row execute function public.set_updated_at();
