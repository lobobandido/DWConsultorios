-- Rate limiting básico para los endpoints públicos (sin login):
-- POST /api/public/appointments y GET /api/availability. Usa Postgres en
-- vez de un servicio externo (Upstash/Redis) para no sumar infraestructura
-- ni credenciales nuevas — suficiente para el tráfico esperado del MVP.
--
-- Ventana fija: cada (key, window_start) es un balde de tiempo; el conteo
-- se incrementa de forma atómica vía la función increment_rate_limit.

create table public.rate_limit_hits (
  key text not null,
  window_start timestamptz not null,
  hit_count int not null default 1,
  primary key (key, window_start)
);

alter table public.rate_limit_hits enable row level security;
-- Sin policies: solo accesible vía service role (bypasa RLS), igual que el
-- resto de las escrituras del formulario público y de disponibilidad.

create or replace function public.increment_rate_limit(
  p_key text,
  p_window_start timestamptz
)
returns int
language plpgsql
as $$
declare
  v_count int;
begin
  insert into public.rate_limit_hits (key, window_start, hit_count)
  values (p_key, p_window_start, 1)
  on conflict (key, window_start)
  do update set hit_count = rate_limit_hits.hit_count + 1
  returning hit_count into v_count;

  return v_count;
end;
$$;
