-- Entrevistas guardadas para la evaluación docente (código seudónimo; sin nombre, RUT ni correo).
create table if not exists entrevistas (
  id bigint generated always as identity primary key,
  creado timestamptz not null default now(),
  participante text not null,
  actividad text,
  actividad_nombre text,
  caso text,
  caso_nombre text,
  nivel text,
  guia text,
  duracion_seg integer,
  intervenciones integer,
  consentimiento boolean,
  logro_a numeric,
  logro_b numeric,
  transcripcion jsonb,
  rubrica jsonb,
  feedback_completo text,
  feedback_breve text
);
create index if not exists entrevistas_creado on entrevistas (creado desc);
alter table entrevistas enable row level security;
revoke all on entrevistas from anon, authenticated;

-- Ajustes de la plataforma (consentimiento informado).
create table if not exists ajustes (
  clave text primary key,
  valor jsonb,
  actualizado timestamptz default now()
);
alter table ajustes enable row level security;
revoke all on ajustes from anon, authenticated;
