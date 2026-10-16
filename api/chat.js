// Respuestas de la paciente y retroalimentación final, con la API de Claude.
import { error, verificarAcceso } from "./_lib.js";
import { buscarCaso } from "./_datos.js";
import { reglasPaciente, reglasFeedback } from "./_reglas.js";

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

// El guion va marcado para la caché de Claude: en los turnos siguientes no se vuelve a procesar y responde antes.
function pedirAClaude(modelo, system, messages, maxTokens, stream = false) {
  return fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": process.env.ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: modelo, max_tokens: maxTokens, messages, stream,
      system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
    }),
  });
}

// Entrega la respuesta de la paciente a medida que Claude la escribe (texto plano, trozo a trozo).
async function responderEnVivo(modelo, system, messages, maxTokens) {
  const r = await pedirAClaude(modelo, system, messages, maxTokens, true);
  if (!r.ok) {
    const data = await r.json().catch(() => ({}));
    console.error("Claude", r.status, JSON.stringify(data).slice(0, 500));
    throw new Error(r.status === 429 ? "limite" : "fallo");
  }
  const lector = r.body.getReader(), dec = new TextDecoder(), enc = new TextEncoder();
  let resto = "";
  const salida = new ReadableStream({
    async pull(ctrl) {
      while (true) {
        const { value, done } = await lector.read();
        if (done) { ctrl.close(); return; }
        resto += dec.decode(value, { stream: true });
        const lineas = resto.split("\n"); resto = lineas.pop();
        let enviado = false;
        for (const l of lineas) {
          if (!l.startsWith("data:")) continue;
          let ev; try { ev = JSON.parse(l.slice(5)); } catch { continue; }
          if (ev.type === "content_block_delta" && ev.delta && ev.delta.type === "text_delta") { ctrl.enqueue(enc.encode(ev.delta.text)); enviado = true; }
          else if (ev.type === "message_delta" && ev.delta && ev.delta.stop_reason === "max_tokens") console.error("Respuesta cortada por largo", modelo);
          else if (ev.type === "error") console.error("Claude (en vivo)", JSON.stringify(ev).slice(0, 300));
        }
        if (enviado) return;
      }
    },
    cancel() { lector.cancel().catch(() => {}); },
  });
  return new Response(salida, { headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store", "X-Accel-Buffering": "no" } });
}

async function preguntarAClaude(modelo, system, messages, maxTokens) {
  const r = await pedirAClaude(modelo, system, messages, maxTokens);
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Claude", r.status, JSON.stringify(data).slice(0, 500));
    throw new Error(r.status === 429 ? "limite" : "fallo");
  }
  const texto = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("").trim();
  if (data.stop_reason === "max_tokens") console.error("Respuesta cortada por largo", modelo);
  return texto;
}

export async function POST(request) {
  const denegado = await verificarAcceso(request);
  if (denegado) return denegado;
  if (!process.env.ANTHROPIC_API_KEY) return error(500, "Falta configurar ANTHROPIC_API_KEY en Vercel.");

  let body;
  try { body = await request.json(); } catch { return error(400, "Solicitud inválida."); }
  const turnos = limpiarTurnos(body.turnos);

  try {
    const caso = await buscarCaso(String(body.caso || ""));
    if (!caso) return error(500, "No hay personajes activos.");
    if (body.modo === "feedback") {
      if (turnos.filter(t => t.role === "user").length < 3) return error(400, "Haz al menos tres intervenciones antes de pedir retroalimentación.");
      const transcripcion = turnos.map(t => (t.role === "user" ? "Estudiante: " : "Paciente: ") + t.content).join("\n");
      const texto = await preguntarAClaude(MODELO_FEEDBACK, reglasFeedback(caso),
        [{ role: "user", content: "Transcripción de la entrevista:\n\n" + transcripcion }], 4000);
      return Response.json({ texto });
    }
    if (!turnos.length || turnos[turnos.length - 1].role !== "user") return error(400, "No llegó tu intervención.");
    if (body.enVivo) return await responderEnVivo(MODELO_PACIENTE, reglasPaciente(caso), turnos, 350);
    const texto = await preguntarAClaude(MODELO_PACIENTE, reglasPaciente(caso), turnos, 350);
    if (!texto) return error(502, "La paciente no alcanzó a responder. Vuelve a intentarlo.");
    return Response.json({ texto });
  } catch (e) {
    if (/Supabase/.test(e.message)) return error(502, e.message);
    return error(502, e.message === "limite"
      ? "Se alcanzó el límite de uso de la API de Claude. Espera un momento."
      : "No se pudo obtener respuesta de Claude. Vuelve a intentarlo.");
  }
}

// Al elegir paciente, la página "despierta" esta función para que el primer turno no espere el arranque.
export function GET() { return new Response(null, { status: 204 }); }
