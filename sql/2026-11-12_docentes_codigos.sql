-- Códigos de ingreso individuales para los docentes (D1 a D6), sin nombres.
-- Tabla propia: la tabla «docentes» antigua (id, nombre, codigo_hash) no se toca.
create table if not exists docentes_codigos (
  codigo text primary key,
  etiqueta text not null unique,
  activo boolean not null default true,
  creado timestamptz not null default now(),
  ultimo_acceso timestamptz
);
alter table docentes_codigos enable row level security;
revoke all on docentes_codigos from anon, authenticated;
