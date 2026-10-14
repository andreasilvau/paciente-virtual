// Convierte la respuesta de la paciente en voz chilena, con Azure Speech.
import { error, escaparXml, verificarAcceso } from "./_lib.js";

export async function POST(request) {
  const denegado = verificarAcceso(request);
  if (denegado) return denegado;
  const clave = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!clave || !region) return error(500, "Falta configurar AZURE_SPEECH_KEY y AZURE_SPEECH_REGION en Vercel.");

  let texto;
  try { texto = String((await request.json()).texto || "").trim(); } catch { return error(400, "Solicitud inválida."); }
  if (!texto) return error(400, "No hay texto que leer.");

  const voz = process.env.AZURE_VOICE || "es-CL-CatalinaNeural";
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-CL"><voice name="${escaparXml(voz)}">${escaparXml(texto.slice(0, 1500))}</voice></speak>`;

  const r = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
    method: "POST",
    headers: {
      "Ocp-Apim-Subscription-Key": clave,
      "Content-Type": "application/ssml+xml",
      "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
      "User-Agent": "paciente-virtual",
    },
    body: ssml,
  });
  if (!r.ok) {
    console.error("Azure", r.status, (await r.text().catch(() => "")).slice(0, 500));
    return error(502, "No se pudo generar la voz de la paciente.");
  }
  return new Response(r.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
