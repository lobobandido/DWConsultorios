-- RLS: un doctor solo puede ver/modificar su propia agenda (RNF03).
--
-- El formulario público (RF09) y la disponibilidad no se consultan con la
-- anon key desde el cliente: pasan por los Route Handlers de Next.js, que
-- usan la service role key (bypassa RLS) y aplican ahí mismo la lógica de
-- qué columnas exponer (nunca datos de otros pacientes). Estas policies son
-- la defensa de base de datos por si algún código llega a usar la anon key
-- directamente.

alter table public.doctors enable row level security;
alter table public.patients enable row level security;
alter table public.appointments enable row level security;

create policy "doctors_select_own"
  on public.doctors for select
  to authenticated
  using (id = auth.uid());

create policy "doctors_update_own"
  on public.doctors for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy "patients_select_own"
  on public.patients for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "patients_insert_own"
  on public.patients for insert
  to authenticated
  with check (doctor_id = auth.uid());

create policy "patients_update_own"
  on public.patients for update
  to authenticated
  using (doctor_id = auth.uid())
  with check (doctor_id = auth.uid());

create policy "appointments_select_own"
  on public.appointments for select
  to authenticated
  using (doctor_id = auth.uid());

create policy "appointments_insert_own"
  on public.appointments for insert
  to authenticated
  with check (doctor_id = auth.uid());

create policy "appointments_delete_own"
  on public.appointments for delete
  to authenticated
  using (doctor_id = auth.uid());
