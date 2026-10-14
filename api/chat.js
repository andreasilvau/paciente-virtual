// Respuestas de la paciente y retroalimentación final, con la API de Claude.
import { error, verificarAcceso } from "./_lib.js";
import { REGLAS_PACIENTE, REGLAS_FEEDBACK } from "./_caso.js";

const MODELO_PACIENTE = process.env.CLAUDE_MODEL || "claude-haiku-5-5";
const MODELO_FEEDBACK = process.env.CLAUDE_MODEL_FEEDBACK || "claude-sonnet-5-5";

function limpiarTurnos(turnos) {
  const limpios = [];
  for (const t of Array.isArray(turnos) ? turnos.slice(-40) : []) {
    if (!t || (t.role !== "user" && t.role !== "assistant")) continue;
    const content = String(t.content || "").trim().slice(0, 2000);
    if (!content) continue;
    const anterior = limpios[limpios.length - 1];
    if (anterior && anterior.role === t.role) anterior.content += "\n" + content;
    else limpios.push({ role: t.role, content });
  }
  while (limpios.length && limpios[0].role !== "user") limpios.shift();
  return limpios;
}

async function preguntarAClaude(modelo, system, messages, maxTokens) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({ model: modelo, max_tokens: maxTokens, system, messages }),
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Claude", r.status, JSON.stringify(data).slice(0, 500));
    throw new Error(r.status === 429 ? "limite" : "fallo");
  }
  return (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
}

export async function POST(request) {
  const denegado = verificarAcceso(request);
  if (denegado) return denegado;
  if (!process.env.ANTHROPIC_API_KEY) return error(500, "Falta configurar ANTHROPIC_API_KEY en Vercel.");

  let body;
  try { body = await request.json(); } catch { return error(400, "Solicitud inválida."); }
  const turnos = limpiarTurnos(body.turnos);

  try {
    if (body.modo === "feedback") {
      if (turnos.filter(t => t.role === "user").length < 3) return error(400, "Haz al menos tres intervenciones antes de pedir retroalimentación.");
      const transcripcion = turnos.map(t => (t.role === "user" ? "Estudiante: " : "Paciente: ") + t.content).join("\n");
      const texto = await preguntarAClaude(MODELO_FEEDBACK, REGLAS_FEEDBACK,
        [{ role: "user", content: "Transcripción de la entrevista:\n\n" + transcripcion }], 1200);
      return Response.json({ texto });
    }
    if (!turnos.length || turnos[turnos.length - 1].role !== "user") return error(400, "No llegó tu intervención.");
    const texto = await preguntarAClaude(MODELO_PACIENTE, REGLAS_PACIENTE, turnos, 300);
    if (!texto) return error(502, "La paciente no alcanzó a responder. Vuelve a intentarlo.");
    return Response.json({ texto });
  } catch (e) {
    return error(502, e.message === "limite"
      ? "Se alcanzó el límite de uso de la API de Claude. Espera un momento."
      : "No se pudo obtener respuesta de Claude. Vuelve a intentarlo.");
  }
}
