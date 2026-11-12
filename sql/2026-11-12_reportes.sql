-- Reportes de problemas que envían docentes y estudiantes desde la aplicación.
-- Sin nombre ni correo: solo la etiqueta del código (D1…D6, la actividad o «Práctica libre»).
create table if not exists reportes (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  etiqueta text not null,
  tipo text,
  pantalla text,
  caso text,
  texto text not null,
  detalle jsonb,
  resuelto boolean not null default false
);
create index if not exists reportes_creado on reportes (creado desc);
alter table reportes enable row level security;
revoke all on reportes from anon, authenticated;
