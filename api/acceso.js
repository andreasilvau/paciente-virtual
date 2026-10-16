// Comprueba el código del estudiante al entrar y dice cómo funciona la guía de la entrevista con ese código.
import { error, modoDeAcceso } from "./_lib.js";

export async function POST(request) {
  let codigo = "";
  try { codigo = String((await request.json()).codigo || ""); } catch { return error(400, "Solicitud inválida."); }
  if (!process.env.ACCESS_CODE && !process.env.SUPABASE_URL) return error(500, "Falta configurar ACCESS_CODE en Vercel.");
  const modo = await modoDeAcceso(codigo);
  if (!modo) return error(401, "El código de acceso no es correcto.");
  return Response.json(modo);
}
