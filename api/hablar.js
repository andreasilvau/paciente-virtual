// Convierte la respuesta de la paciente en voz.
// Si existe ELEVENLABS_API_KEY usa ElevenLabs; si no, usa Azure Speech con voz chilena.
import { error, escaparXml, verificarAcceso } from "./_lib.js";

const AUDIO = { "Content-Type": "audio/mpeg", "Cache-Control": "no-store" };

async function conElevenLabs(texto) {
  const voz = (process.env.ELEVENLABS_VOICE_ID || "").trim();
  if (!voz) return error(500, "ElevenLabs: falta configurar ELEVENLABS_VOICE_ID en Vercel.");
  const modelo = process.env.ELEVENLABS_MODEL || "eleven_multilingual_v2";
  let r;
  try {
    r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voz)}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: {
        "xi-api-key": process.env.ELEVENLABS_API_KEY.trim(),
        "Content-Type": "application/json",
        Accept: "audio/mpeg",
      },
      body: JSON.stringify({
        text: texto,
        model_id: modelo,
        language_code: "es",
        voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true },
      }),
    });
  } catch {
    return error(502, "ElevenLabs: no se pudo conectar con el servicio.");
  }
  if (!r.ok) {
    const detalle = (await r.text().catch(() => "")).slice(0, 500);
    console.error("ElevenLabs", r.status, detalle);
    let causa = {
      401: "la clave no es válida. Revisa ELEVENLABS_API_KEY.",
      404: "no se encontró la voz. Revisa ELEVENLABS_VOICE_ID.",
      422: "la configuración de la voz no es válida.",
      429: "se alcanzó el límite de uso por ahora.",
    }[r.status] || "error del servicio.";
    if (/quota|credits/i.test(detalle)) causa = "se acabaron los créditos del mes.";
    if (/language_code/i.test(detalle)) return conElevenLabsSinIdioma(texto, voz, modelo);
    return error(502, `ElevenLabs (código ${r.status}): ${causa}`);
  }
  return new Response(r.body, { headers: AUDIO });
}

// Algunos modelos no aceptan language_code; se reintenta una vez sin él.
async function conElevenLabsSinIdioma(texto, voz, modelo) {
  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voz)}?output_format=mp3_44100_128`, {
    method: "POST",
    headers: { "xi-api-key": process.env.ELEVENLABS_API_KEY.trim(), "Content-Type": "application/json", Accept: "audio/mpeg" },
    body: JSON.stringify({ text: texto, model_id: modelo, voice_settings: { stability: 0.4, similarity_boost: 0.75, style: 0.3, use_speaker_boost: true } }),
  });
  if (!r.ok) return error(502, `ElevenLabs (código ${r.status}): error del servicio.`);
  return new Response(r.body, { headers: AUDIO });
}

async function conAzure(texto) {
  const clave = process.env.AZURE_SPEECH_KEY;
  const region = process.env.AZURE_SPEECH_REGION;
  if (!clave || !region) return error(500, "Falta configurar la voz: ELEVENLABS_API_KEY, o AZURE_SPEECH_KEY y AZURE_SPEECH_REGION.");
  const voz = process.env.AZURE_VOICE || "es-CL-CatalinaNeural";
  const ssml = `<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xml:lang="es-CL"><voice name="${escaparXml(voz)}">${escaparXml(texto)}</voice></speak>`;
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
  return new Response(r.body, { headers: AUDIO });
}

export async function POST(request) {
  const denegado = verificarAcceso(request);
  if (denegado) return denegado;

  let texto;
  try { texto = String((await request.json()).texto || "").trim().slice(0, 1500); } catch { return error(400, "Solicitud inválida."); }
  if (!texto) return error(400, "No hay texto que leer.");

  return process.env.ELEVENLABS_API_KEY ? conElevenLabs(texto) : conAzure(texto);
}
