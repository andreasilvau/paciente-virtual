-- Tablas del diseño anterior, vacías y sin uso en la aplicación.
alter table actividades drop constraint if exists actividades_docente_id_fkey;
alter table actividades drop column if exists docente_id;
drop table if exists evaluaciones;
drop table if exists turnos;
drop table if exists sesiones;
drop table if exists participantes;
drop table if exists docentes;
-- Avatar 3D opcional por personaje (ruta del modelo, por ejemplo /modelos/valentina.glb).
alter table casos add column if not exists modelo_3d text;
