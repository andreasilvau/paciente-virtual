// Acceso a los personajes.
// Si Supabase está configurado (SUPABASE_URL + SUPABASE_SECRET_KEY), los personajes se leen de la tabla "casos".
// Si no, se usan los del archivo _casos.js como respaldo.
import { CASOS } from "./_casos.js";

const URL_SB = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const CLAVE_SB = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || "").trim();
export const supabaseConfigurado = Boolean(URL_SB && CLAVE_SB);

// Columnas de la tabla que se pueden editar desde la página de docente.
export const CAMPOS = ["orden", "activo", "nombre", "sexo", "edad", "rut", "atencion", "motivo", "nivel_dificultad", "desafio",
  "foco_cicaa", "carreras", "identificacion", "identidad", "guion_clinico", "info_condicionada", "carga_emocional",
  "forma_de_hablar", "reglas_adicionales", "voz_id"];

function encabezados(extra = {}) {
  const h = { apikey: CLAVE_SB, "Content-Type": "application/json", ...extra };
  if (CLAVE_SB.startsWith("eyJ")) h.Authorization = `Bearer ${CLAVE_SB}`; // claves antiguas (service_role)
  return h;
}

// Explica qué clave se pegó, sin mostrarla.
function diagnosticoClave() {
  const base = "Supabase rechazó la clave de SUPABASE_SECRET_KEY en Vercel. ";
  if (CLAVE_SB.startsWith("sb_publishable_")) return base + "Pegaste la clave publicable (sb_publishable_…); se necesita la secreta (sb_secret_…), en Project Settings → API Keys.";
  if (CLAVE_SB.startsWith("eyJ")) {
    try {
      const rol = JSON.parse(Buffer.from(CLAVE_SB.split(".")[1], "base64url").toString()).role;
      if (rol === "anon") return base + "Pegaste la clave anon; se necesita la service_role o, mejor, la secreta (sb_secret_…), en Project Settings → API Keys.";
    } catch {}
  }
  if (!CLAVE_SB.startsWith("sb_secret_") && !CLAVE_SB.startsWith("eyJ")) return base + "No parece una clave de Supabase: debe empezar con sb_secret_. Cópiala de nuevo, sin espacios ni comillas.";
  return base + "Revisa que sea la clave secreta de este mismo proyecto (paciente-virtual-conversacional) y que no se haya regenerado.";
}

async function pedirSupabase(ruta, opciones = {}) {
  const r = await fetch(`${URL_SB}/rest/v1/${ruta}`, { ...opciones, headers: encabezados(opciones.headers) });
  if (!r.ok) {
    const detalle = (await r.text().catch(() => "")).slice(0, 400);
    console.error("Supabase", r.status, detalle);
    throw new Error(r.status === 401 || r.status === 403 ? diagnosticoClave() : "No se pudo leer la base de datos de Supabase.");
  }
  return r.status === 204 ? null : r.json();
}

// El archivo de respaldo guarda cada guion en un solo texto; aquí se convierte a la misma forma que la tabla.
function desdeArchivo(c, i) {
  return {
    id: c.id, orden: (i + 1) * 10, activo: true, nombre: c.nombre, sexo: c.sexo || "femenino", edad: c.edad, rut: c.rut || "",
    atencion: c.atencion, motivo: c.motivo, nivel_dificultad: c.nivel, desafio: c.desafio, foco_cicaa: c.foco, carreras: [],
    identificacion: c.identificacion || "", guion_completo: c.guion, voz_id: null,
  };
}

let cache = null, cacheHora = 0;
const VIGENCIA_MS = 20_000;
export function olvidarCache() { cache = null; }

// Todos los personajes, ordenados. Con incluirInactivos=false, solo los activos.
// Con usarRespaldo=true (estudiantes), si Supabase falla se usan los personajes del archivo.
export async function listarCasos({ incluirInactivos = false, usarRespaldo = false } = {}) {
  let todos;
  if (!supabaseConfigurado) todos = CASOS.map(desdeArchivo);
  else if (cache && Date.now() - cacheHora < VIGENCIA_MS) todos = cache;
  else {
    try { todos = await pedirSupabase("casos?select=*&order=orden.asc,id.asc"); cache = todos; cacheHora = Date.now(); }
    catch (e) { if (!usarRespaldo) throw e; todos = CASOS.map(desdeArchivo); }
  }
  return incluirInactivos ? todos : todos.filter(c => c.activo);
}

export async function buscarCaso(id) {
  const activos = await listarCasos({ usarRespaldo: true });
  return activos.find(c => c.id === id) || activos.find(c => c.id === "camila") || activos[0] || null;
}

export async function guardarCaso(id, datos) {
  if (!supabaseConfigurado) throw new Error("Para editar personajes falta configurar Supabase en Vercel (SUPABASE_URL y SUPABASE_SECRET_KEY).");
  const fila = { id };
  for (const k of CAMPOS) if (k in datos) fila[k] = datos[k];
  const r = await pedirSupabase("casos?on_conflict=id", {
    method: "POST",
    headers: { Prefer: "resolution=merge-duplicates,return=representation" },
    body: JSON.stringify(fila),
  });
  olvidarCache();
  return Array.isArray(r) ? r[0] : r;
}

// Datos que puede ver el estudiante (nunca las capas del guion ni la voz).
export function datosPublicos(c) {
  return {
    id: c.id, sexo: c.sexo || "femenino", nombre: c.nombre, edad: c.edad, rut: c.rut ? `${c.rut} (ficticio)` : "",
    atencion: c.atencion, motivo: c.motivo, nivel: c.nivel_dificultad, desafio: c.desafio, foco: c.foco_cicaa,
  };
}

// Arma el guion completo a partir de las capas, en el orden en que la paciente lo necesita.
export function guionCompleto(c) {
  if (c.guion_completo) return c.guion_completo;
  const capas = [
    ["IDENTIDAD", c.identidad], ["CÓMO PARTE LA CONSULTA", c.guion_clinico],
    ["LO QUE CUENTA SOLO SI SE LO PREGUNTAN", c.info_condicionada], ["CARGA EMOCIONAL", c.carga_emocional],
    ["FORMA DE HABLAR", c.forma_de_hablar], ["REGLA ADICIONAL", c.reglas_adicionales],
  ];
  return capas.filter(([, t]) => t && t.trim()).map(([n, t]) => `${n}\n${t.trim()}`).join("\n\n");
}
