// Recibe un reporte de problema desde la página de estudiante o desde el panel docente.
// Exige un código válido (de estudiante, de actividad, de docente o de administración) y guarda solo la etiqueta, nunca el código.
import { error, modoDeAcceso } from "./_lib.js";
import { buscarDocente, guardarReporte } from "./_datos.js";

const TIPOS = ["Voz o micrófono", "Respuestas de la paciente", "Evaluación o retroalimentación", "Pantalla o diseño", "Ingreso o códigos", "Otro"];
const PANTALLAS = ["seleccion", "entrevista", "retroalimentacion", "panel"];

async function etiquetaDe(request) {
  const docente = (request.headers.get("x-docente") || "").trim();
  if (docente) {
    const admin = (process.env.DOCENTE_CODE || "").trim();
    if (admin && docente === admin) return "Administración";
    try { const d = await buscarDocente(docente); if (d) return d.etiqueta; } catch (e) { console.error("Docentes", e.message); }
    return null;
  }
  const modo = await modoDeAcceso(request.headers.get("x-codigo"));
  if (!modo) return null;
  // «Prueba interna D3» se guarda como «D3»; el resto, con el nombre de la actividad o «Práctica libre».
  return (modo.actividad || "Práctica libre").replace(/^Prueba interna\s+/, "");
}

const corto = (v, n) => String(v ?? "").trim().slice(0, n);

export async function POST(request) {
  const etiqueta = await etiquetaDe(request);
  if (!etiqueta) return error(401, "El código no es correcto. Vuelve a entrar para enviar el reporte.");
  let b;
  try { b = await request.json(); } catch { return error(400, "Solicitud inválida."); }
  const texto = corto(b.texto, 3000);
  if (texto.length < 5) return error(400, "Cuéntanos qué pasó, aunque sea en una frase.");
  const d = b.detalle && typeof b.detalle === "object" ? b.detalle : {};
  const detalle = { navegador: corto(d.navegador, 300), ventana: corto(d.ventana, 30), intervenciones: Math.max(0, Math.round(Number(d.intervenciones) || 0)) };
  if (Array.isArray(d.conversacion)) {
    detalle.conversacion = d.conversacion.slice(-60)
      .filter(t => t && (t.role === "user" || t.role === "assistant"))
      .map(t => ({ role: t.role, content: corto(t.content, 1500) }));
  }
  try {
    await guardarReporte({
      etiqueta: corto(etiqueta, 120),
      tipo: TIPOS.includes(b.tipo) ? b.tipo : "Otro",
      pantalla: PANTALLAS.includes(b.pantalla) ? b.pantalla : "",
      caso: corto(b.caso, 80), texto, detalle,
    });
    return Response.json({ ok: true });
  } catch (e) { console.error("Reporte", e.message); return error(502, "No se pudo guardar el reporte. Vuelve a intentarlo."); }
}
