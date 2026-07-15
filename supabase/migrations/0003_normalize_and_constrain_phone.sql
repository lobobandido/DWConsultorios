-- Normaliza teléfonos existentes (quita todo lo que no sea dígito) y agrega
-- un CHECK que exige formato de 10-15 dígitos hacia adelante. Necesario
-- porque el código de aplicación empezó a normalizar el teléfono al guardar
-- (audit 2026-07-14: pacientes duplicados por variación de formato), pero
-- los registros ya existentes tenían espacios/guiones sin limpiar.

update public.patients
set phone = regexp_replace(phone, '\D', '', 'g')
where phone != regexp_replace(phone, '\D', '', 'g');

alter table public.patients
  add constraint patients_phone_format_check
  check (phone ~ '^[0-9]{10,15}$');
