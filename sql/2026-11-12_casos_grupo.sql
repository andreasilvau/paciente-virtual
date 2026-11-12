-- Caso clínico al que pertenece cada personaje: los que comparten grupo son versiones (básica, intermedia, avanzada) del mismo caso.
-- Vacío = el personaje es su propio caso.
alter table casos add column if not exists grupo text;
