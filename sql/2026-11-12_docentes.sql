-- Códigos de ingreso individuales al panel docente (etiqueta D1…D6; sin nombres ni correos).
-- El código de administración sigue siendo la variable DOCENTE_CODE de Vercel y no está en esta tabla.
create table if not exists docentes (
  codigo text primary key,
  etiqueta text not null unique,
  activo boolean not null default true,
  creado timestamptz not null default now(),
  ultimo_acceso timestamptz
);
alter table docentes enable row level security;
revoke all on docentes from anon, authenticated;
