// Indica qué servicios están configurados (nunca muestra las claves) y los personajes que puede elegir el estudiante.
import { listarCasos, datosPublicos, supabaseConfigurado } from "./_datos.js";

export async function GET() {
  let casos = [], errorCasos = "";
  try { casos = (await listarCasos({ usarRespaldo: true })).map(datosPublicos); } catch (e) { errorCasos = e.message; }
  return Response.json({
    casos,
    errorCasos,
    servicios: {
      codigo: Boolean(process.env.ACCESS_CODE),
      claude: Boolean(process.env.ANTHROPIC_API_KEY),
      whisper: Boolean(process.env.OPENAI_API_KEY),
      voz: Boolean(process.env.ELEVENLABS_API_KEY || (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)),
      proveedorVoz: process.env.ELEVENLABS_API_KEY ? "ElevenLabs" : (process.env.AZURE_SPEECH_KEY ? "Azure" : ""),
      supabase: supabaseConfigurado,
    },
  });
}
