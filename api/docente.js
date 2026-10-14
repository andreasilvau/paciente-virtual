// Página de docente: ver y editar personajes, listar voces de ElevenLabs y probarlas.
// Protegida con DOCENTE_CODE (distinto del código de los estudiantes).
import { error } from "./_lib.js";
import { listarCasos, guardarCaso, supabaseConfigurado, CAMPOS } from "./_datos.js";
import { sintetizar } from "./hablar.js";

function verificarDocente(request) {
  const esperado = (process.env.DOCENTE_CODE || "").trim();
  if (!esperado) return error(500, "Falta configurar DOCENTE_CODE en Vercel.");
  const recibido = (request.headers.get("x-docente") || "").trim();
  if (recibido !== esperado) return error(401, "El código de docente no es correcto.");
  return null;
}

async function vocesElevenLabs() {
  if (!process.env.ELEVENLABS_API_KEY) return [];
  const r = await fetch("https://api.elevenlabs.io/v1/voices", { headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY.trim() } });
  if (!r.ok) { console.error("ElevenLabs voces", r.status); throw new Error("No se pudo obtener la lista de voces de ElevenLabs."); }
  const d = await r.json();
  return (d.voices || []).map(v => ({
    id: v.voice_id, nombre: v.name, vista_previa: v.preview_url || "",
    detalle: [v.labels && v.labels.gender, v.labels && v.labels.age, v.labels && v.labels.accent, v.category].filter(Boolean).join(" · "),
  })).sort((a, b) => a.nombre.localeCompare(b.nombre, "es"));
}

export async function GET(request) {
  const denegado = verificarDocente(request);
  if (denegado) return denegado;
  try {
    const q = new URL(request.url).searchParams;
    if (q.get("voces")) return Response.json({ voces: await vocesElevenLabs() });
    return Response.json({ casos: await listarCasos({ incluirInactivos: true }), editable: supabaseConfigurado });
  } catch (e) { return error(502, e.message); }
}

const NIVELES = ["Básico", "Intermedio", "Avanzado"];

function limpiar(datos) {
  const fila = {};
  for (const k of CAMPOS) {
    if (!(k in datos)) continue;
    let v = datos[k];
    if (k === "orden") v = Number.isFinite(Number(v)) ? Math.round(Number(v)) : 100;
    else if (k === "activo") v = Boolean(v);
    else if (k === "carreras") v = (Array.isArray(v) ? v : String(v || "").split(",")).map(x => String(x).trim()).filter(Boolean).slice(0, 20);
    else if (k === "voz_id") v = String(v || "").trim() || null;
    else v = String(v ?? "").slice(0, 8000);
    fila[k] = v;
  }
  if ("sexo" in fila && !["femenino", "masculino"].includes(fila.sexo)) fila.sexo = "femenino";
  if ("nivel_dificultad" in fila && !NIVELES.includes(fila.nivel_dificultad)) fila.nivel_dificultad = "Intermedio";
  return fila;
}

export async function POST(request) {
  const denegado = verificarDocente(request);
  if (denegado) return denegado;
  let body;
  try { body = await request.json(); } catch { return error(400, "Solicitud inválida."); }

  if (body.accion === "probar") {
    const texto = String(body.texto || "Hola, buenas tardes. Vengo a la consulta.").slice(0, 300);
    return sintetizar(texto, body.caso, body.voz_id);
  }

  const id = String(body.id || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(id)) return error(400, "El identificador debe tener solo letras minúsculas sin tildes, números o guiones (por ejemplo: rosa-58).");
  const fila = limpiar(body.datos || {});
  for (const k of ["nombre", "edad", "atencion", "motivo", "desafio", "foco_cicaa"]) {
    if (body.nuevo && !String(fila[k] || "").trim()) return error(400, `Falta completar el campo «${k.replace("_", " ")}».`);
  }
  try {
    if (body.nuevo) {
      const existentes = await listarCasos({ incluirInactivos: true });
      if (existentes.some(c => c.id === id)) return error(409, "Ya existe un personaje con ese identificador.");
    }
    return Response.json({ caso: await guardarCaso(id, fila) });
  } catch (e) { return error(502, e.message); }
}
