// Convierte la voz del estudiante en texto con OpenAI (gpt-4o-mini-transcribe; para volver a Whisper, OPENAI_TRANSCRIBE_MODEL=whisper-1).
import { error, verificarAcceso } from "./_lib.js";

const PISTA = "Consulta de salud sexual y reproductiva en Chile. Matrona, pololo, flujo, regla, condón, anticonceptivo, ITS, VIH, PAP, examen.";

export async function POST(request) {
  const denegado = verificarAcceso(request);
  if (denegado) return denegado;
  if (!process.env.OPENAI_API_KEY) return error(500, "Falta configurar OPENAI_API_KEY en Vercel.");

  let audio;
  try { audio = (await request.formData()).get("audio"); } catch { return error(400, "No llegó el audio."); }
  if (!audio || typeof audio === "string" || !audio.size) return error(400, "No llegó el audio.");
  if (audio.size > 4_000_000) return error(413, "La grabación es muy larga. Habla en intervenciones más cortas.");

  const form = new FormData();
  form.append("file", audio, audio.name || "voz.webm");
  form.append("model", process.env.OPENAI_TRANSCRIBE_MODEL || "gpt-4o-mini-transcribe");
  form.append("language", "es");
  form.append("prompt", PISTA);

  const r = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: form,
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    console.error("Whisper", r.status, JSON.stringify(data).slice(0, 500));
    return error(502, "No se pudo transcribir el audio. Vuelve a intentarlo o escribe tu intervención.");
  }
  return Response.json({ texto: String(data.text || "").trim() });
}

// Para "despertar" la función antes del primer turno.
export function GET() { return new Response(null, { status: 204 }); }
