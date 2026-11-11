// Utilidades compartidas. Vercel no publica como ruta los archivos que empiezan con "_".

export function error(status, mensaje) {
  return Response.json({ error: mensaje }, { status });
}

import { buscarActividad, buscarDocente } from "./_datos.js";

// Qué permite un código: el general (práctica libre, fuera del aula) o el de una actividad que creó la docente.
// Devuelve { guia, actividad } o null si el código no sirve.
export async function modoDeAcceso(codigo) {
  codigo = String(codigo || "").trim();
  if (!codigo) return null;
  const general = (process.env.ACCESS_CODE || "").trim();
  if (general && codigo === general) return { guia: "libre", actividad: "" };
  try {
    const a = await buscarActividad(codigo);
    if (a) return { guia: a.guia, actividad: a.nombre || "" };
  } catch (e) { console.error("Actividades", e.message); }
  // Códigos individuales de docentes (D1 a D6): pueden conversar con la paciente como práctica libre.
  // Las entrevistas quedan marcadas «Prueba interna D1» para separarlas de las de estudiantes.
  try {
    const d = await buscarDocente(codigo);
    if (d) return { guia: "libre", actividad: "Prueba interna " + d.etiqueta, id: "prueba-" + String(d.etiqueta).toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 30) };
  } catch (e) { console.error("Docentes", e.message); }
  return null;
}

// Código de acceso para que nadie más use tus claves de API.
export async function verificarAcceso(request) {
  // El código llega en el encabezado, o en la dirección cuando el navegador pide el audio directamente.
  const recibido = request.headers.get("x-codigo") || new URL(request.url).searchParams.get("c") || "";
  if (await modoDeAcceso(recibido)) return null;
  if (!process.env.ACCESS_CODE) return error(500, "Falta configurar ACCESS_CODE en Vercel.");
  return error(401, "El código de acceso no es correcto.");
}

export function escaparXml(texto) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
