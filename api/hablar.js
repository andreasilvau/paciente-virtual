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

  const regionLimpia = region.trim().toLowerCase().replace(/\s+/g, "");
  let r;
  try {
    r = await fetch(`https://${regionLimpia}.tts.speech.microsoft.com/cognitiveservices/v1`, {
      method: "POST",
      headers: {
        "Ocp-Apim-Subscription-Key": clave.trim(),
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-24khz-48kbitrate-mono-mp3",
        "User-Agent": "paciente-virtual",
      },
      body: ssml,
    });
  } catch {
    return error(502, `Azure: no se encontró la región "${region}". Revisa AZURE_SPEECH_REGION (por ejemplo brazilsouth o eastus).`);
  }
  if (!r.ok) {
    console.error("Azure", r.status, (await r.text().catch(() => "")).slice(0, 500));
    const causa = {
      400: "la voz o el texto no son válidos. Revisa AZURE_VOICE o bórrala.",
      401: "la clave no corresponde a esa región. Revisa AZURE_SPEECH_KEY y AZURE_SPEECH_REGION.",
      403: "la clave no tiene permiso o el recurso está deshabilitado.",
      404: "la región no es correcta. Revisa AZURE_SPEECH_REGION.",
      429: "se alcanzó el límite del plan gratuito por ahora.",
    }[r.status] || "error del servicio.";
    return error(502, `Azure (código ${r.status}): ${causa}`);
  }
  return new Response(r.body, { headers: { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" } });
}
