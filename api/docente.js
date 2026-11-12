// Página de docente: ver y editar personajes, listar voces de ElevenLabs y probarlas.
// Dos tipos de código, ambos distintos del de los estudiantes:
// - DOCENTE_CODE (administración): puede todo, incluida la creación de códigos individuales.
// - Códigos individuales de la tabla «docentes_codigos» (etiqueta D1…D6): pueden entrevistar y ver personajes, entrevistas y evaluaciones, pero no editar ni borrar.
import { error } from "./_lib.js";
import { PARTE_A, PARTE_B } from "./_rubrica.js";
import { listarCasos, guardarCaso, supabaseConfigurado, CAMPOS, listarActividades, guardarActividad, borrarActividad, normalizarCodigo, GUIAS, borrarCaso, listarPronunciacion, guardarPronunciacion, listarEntrevistas, verEntrevista, borrarEntrevista, leerAjuste, guardarAjuste, listarDocentes, buscarDocente, crearDocente, cambiarEstadoDocente, borrarDocente, registrarAccesoDocente, listarReportes, cambiarEstadoReporte, borrarReporte } from "./_datos.js";
import { sintetizar } from "./hablar.js";

// Devuelve { rol, etiqueta } o una respuesta de error.
async function verificarDocente(request) {
  const admin = (process.env.DOCENTE_CODE || "").trim();
  const recibido = (request.headers.get("x-docente") || "").trim();
  if (admin && recibido === admin) return { rol: "admin", etiqueta: "Administración" };
  if (recibido) {
    try {
      const d = await buscarDocente(recibido);
      if (d) { await registrarAccesoDocente(d.codigo); return { rol: "docente", etiqueta: d.etiqueta }; }
    } catch (e) { console.error("Docentes", e.message); }
  }
  if (!admin) return error(500, "Falta configurar DOCENTE_CODE en Vercel.");
  return error(401, "El código de docente no es correcto.");
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
  const sesion = await verificarDocente(request);
  if (sesion instanceof Response) return sesion;
  const admin = sesion.rol === "admin";
  const editable = supabaseConfigurado && admin;
  try {
    const q = new URL(request.url).searchParams;
    if (q.get("voces")) return Response.json({ voces: await vocesElevenLabs() });
    if (q.get("rubrica")) return Response.json({ parteA: PARTE_A, parteB: PARTE_B });
    if (q.get("pronunciacion")) return Response.json({ lista: await listarPronunciacion() });
    if (q.get("docentes")) { if (!admin) return error(403, "Los códigos de docente los administra solo administración."); return Response.json({ docentes: await listarDocentes(), editable }); }
    if (q.get("reportes")) { if (!admin) return error(403, "Los reportes los revisa solo administración."); return Response.json({ reportes: await listarReportes(), editable }); }
    if (q.get("actividades")) { if (!admin) return error(403, "Las actividades las administra solo administración."); return Response.json({ actividades: await listarActividades(), editable }); }
    if (q.get("entrevistas")) return Response.json({ entrevistas: await listarEntrevistas({ completo: q.get("completo") === "1" }), editable });
    if (q.get("entrevista")) return Response.json({ entrevista: await verEntrevista(q.get("entrevista")) });
    if (q.get("consentimiento")) return Response.json({ consentimiento: (await leerAjuste("consentimiento")) || { activo: false, texto: "" }, editable });
    return Response.json({ casos: await listarCasos({ incluirInactivos: true }), editable, rol: sesion.rol, etiqueta: sesion.etiqueta });
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
    else if (k === "grupo") { v = String(v || "").trim().toLowerCase(); v = /^[a-z0-9-]{2,40}$/.test(v) ? v : null; }
    else if (k === "modelo_3d") { v = String(v || "").trim(); v = /^\/modelos\/[a-z0-9-]+\.glb$/.test(v) ? v : null; }
    else if (k === "rubrica_na") v = (Array.isArray(v) ? v : []).map(x => String(x).toUpperCase()).filter(x => /^B([1-9]|1[0-8])$/.test(x));
    else if (k === "estilo") {
      // Solo las claves conocidas, como texto corto.
      const e = {};
      if (v && typeof v === "object") for (const c of ["largo", "informacion", "registro", "trato", "muletillas", "usa", "evita", "ejemplo"]) if (v[c]) e[c] = String(v[c]).slice(0, 400);
      v = e;
    }
    else v = String(v ?? "").slice(0, 8000);
    fila[k] = v;
  }
  if ("sexo" in fila && !["femenino", "masculino"].includes(fila.sexo)) fila.sexo = "femenino";
  if ("nivel_dificultad" in fila && !NIVELES.includes(fila.nivel_dificultad)) fila.nivel_dificultad = "Intermedio";
  return fila;
}

export async function POST(request) {
  const sesion = await verificarDocente(request);
  if (sesion instanceof Response) return sesion;
  const admin = sesion.rol === "admin";
  let body;
  try { body = await request.json(); } catch { return error(400, "Solicitud inválida."); }

  // Con un código individual solo se puede probar la voz; todo lo demás (editar, borrar, crear códigos) es de administración.
  if (!admin && body.accion !== "probar") return error(403, "Esta acción la hace solo administración.");

  if (body.accion === "probar") {
    const texto = String(body.texto || "Hola, buenas tardes. Vengo a la consulta.").slice(0, 300);
    return sintetizar(texto, body.caso, body.voz_id);
  }

  if (body.accion === "docenteCrear") {
    const etiqueta = String(body.etiqueta || "").trim();
    if (!/^[A-Za-z0-9 -]{1,20}$/.test(etiqueta)) return error(400, "La etiqueta debe tener hasta 20 caracteres: letras, números, espacios o guiones (por ejemplo, D1). No uses nombres de personas.");
    try {
      const existentes = await listarDocentes();
      if (existentes.some(d => d.etiqueta.toLowerCase() === etiqueta.toLowerCase())) return error(409, "Ya existe un docente con esa etiqueta.");
      return Response.json({ docente: await crearDocente(etiqueta) });
    } catch (e) { return error(502, e.message); }
  }
  if (body.accion === "docenteEstado") {
    try { await cambiarEstadoDocente(body.codigo, body.activo !== false); return Response.json({ ok: true }); } catch (e) { return error(502, e.message); }
  }
  if (body.accion === "docenteBorrar") {
    try { await borrarDocente(body.codigo); return Response.json({ ok: true }); } catch (e) { return error(502, e.message); }
  }
  if (body.accion === "reporteEstado") {
    try { await cambiarEstadoReporte(body.id, body.resuelto !== false); return Response.json({ ok: true }); } catch (e) { return error(502, e.message); }
  }
  if (body.accion === "reporteBorrar") {
    try { await borrarReporte(body.id); return Response.json({ ok: true }); } catch (e) { return error(502, e.message); }
  }
  if (body.accion === "actividad") {
    const codigo = normalizarCodigo(body.codigo);
    if (!/^[a-z0-9-]{4,40}$/.test(codigo)) return error(400, "El código debe tener entre 4 y 40 caracteres: letras minúsculas sin tildes, números o guiones.");
    const reservados = [process.env.ACCESS_CODE, process.env.DOCENTE_CODE].map(normalizarCodigo);
    if (reservados.includes(codigo)) return error(400, "Ese código ya se usa como código general o de docente. Elige otro.");
    const guia = GUIAS.includes(body.guia) ? body.guia : "libre";
    try {
      return Response.json({ actividad: await guardarActividad({ codigo, nombre: String(body.nombre || "").slice(0, 120), guia, activa: body.activa !== false }) });
    } catch (e) { return error(502, e.message); }
  }
  if (body.accion === "pronunciacion") {
    try { return Response.json({ lista: await guardarPronunciacion(body.lista) }); } catch (e) { return error(502, e.message); }
  }
  if (body.accion === "borrarCaso") {
    try { await borrarCaso(body.id); return Response.json({ ok: true }); } catch (e) { return error(502, e.message); }
  }
  if (body.accion === "borrarEntrevista") {
    try { await borrarEntrevista(body.id); return Response.json({ ok: true }); } catch (e) { return error(502, e.message); }
  }
  if (body.accion === "consentimiento") {
    const valor = { activo: Boolean(body.activo), texto: String(body.texto || "").slice(0, 6000), version: new Date().toISOString().slice(0, 10) };
    try { await guardarAjuste("consentimiento", valor); return Response.json({ consentimiento: valor }); } catch (e) { return error(502, e.message); }
  }
  if (body.accion === "borrarActividad") {
    try { await borrarActividad(body.codigo); return Response.json({ ok: true }); } catch (e) { return error(502, e.message); }
  }

  const id = String(body.id || "").trim().toLowerCase();
  if (!/^[a-z0-9-]{2,40}$/.test(id)) return error(400, "El identificador debe tener solo letras minúsculas sin tildes, números o guiones (por ejemplo: rosa-58).");
  const fila = limpiar(body.datos || {});
  for (const k of ["nombre", "edad", "atencion", "motivo", "desafio", "foco_cicaa"]) {
    if (body.nuevo && !String(fila[k] || "").trim()) return error(400, `Falta completar el campo «${k.replace("_", " ")}».`);
  }
  try {
    const existentes = await listarCasos({ incluirInactivos: true });
    if (body.nuevo && existentes.some(c => c.id === id)) return error(409, "Ya existe un personaje con ese identificador.");
    // Un caso clínico tiene, como máximo, una versión por nivel de dificultad.
    const previo = existentes.find(c => c.id === id) || {};
    const grupo = ("grupo" in fila ? fila.grupo : previo.grupo) || id, nivel = fila.nivel_dificultad || previo.nivel_dificultad;
    const choque = existentes.find(c => c.id !== id && (c.grupo || c.id) === grupo && c.nivel_dificultad === nivel);
    if (choque) return error(409, `Este caso ya tiene una versión de nivel ${String(nivel).toLowerCase()} («${choque.nombre}», ${choque.id}). Cambia el nivel o edita esa versión.`);
    return Response.json({ caso: await guardarCaso(id, fila) });
  } catch (e) { return error(502, e.message); }
}
