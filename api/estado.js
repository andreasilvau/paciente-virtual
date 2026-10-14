// Indica qué servicios están configurados (nunca muestra las claves) y los datos visibles de la ficha.
import { PACIENTE } from "./_caso.js";

export function GET() {
  return Response.json({
    paciente: PACIENTE,
    servicios: {
      codigo: Boolean(process.env.ACCESS_CODE),
      claude: Boolean(process.env.ANTHROPIC_API_KEY),
      whisper: Boolean(process.env.OPENAI_API_KEY),
      voz: Boolean(process.env.ELEVENLABS_API_KEY || (process.env.AZURE_SPEECH_KEY && process.env.AZURE_SPEECH_REGION)),
      proveedorVoz: process.env.ELEVENLABS_API_KEY ? "ElevenLabs" : (process.env.AZURE_SPEECH_KEY ? "Azure" : ""),
    },
  });
}
