-- Expediente básico (petición de cliente real, 2026-07-14): fotos del
-- historial impreso del paciente, varias por paciente, sin campos
-- estructurados (solo imagen + fecha de subida). Fuera del alcance
-- original de Fase 1/Fase 2 — se trata como su propio alcance chico.

create table public.patient_documents (
  id uuid primary key default gen_random_uuid(),
  doctor_id uuid not null references public.doctors (id) on delete cascade,
  patient_id uuid not null references public.patients (id) on delete cascade,
  storage_path text not null unique,
  created_at timestamptz not null default now(),

  foreign key (patient_id, doctor_id) references public.patients (id, doctor_id) on delete cascade
);

create index patient_documents_patient_id_idx on public.patient_documents (patient_id);

alter table public.patient_documents enable row level security;

create policy "patient_documents_select_own"
  on public.patient_documents for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "patient_documents_insert_own"
  on public.patient_documents for insert
  to authenticated
  with check (doctor_id = auth.uid());

create policy "patient_documents_delete_own"
  on public.patient_documents for delete
  to authenticated
  using (doctor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Storage: bucket privado, solo imágenes, límite 10MB por archivo.
-- Convención de ruta: {doctor_id}/{patient_id}/{uuid}.{ext} — el primer
-- segmento de la ruta es el doctor_id, así las policies de storage.objects
-- pueden validar pertenencia sin tocar la tabla patient_documents.
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'patient-documents',
  'patient-documents',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/heic']
)
on conflict (id) do nothing;

create policy "patient_documents_storage_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "patient_documents_storage_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "patient_documents_storage_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'patient-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
