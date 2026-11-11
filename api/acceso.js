// Comprueba el código del estudiante al entrar y dice cómo funciona la guía de la entrevista con ese código.
import { error, modoDeAcceso } from "./_lib.js";
import { leerAjuste } from "./_datos.js";

export async function POST(request) {
  let codigo = "";
  try { codigo = String((await request.json()).codigo || ""); } catch { return error(400, "Solicitud inválida."); }
  if (!process.env.ACCESS_CODE && !process.env.SUPABASE_URL) return error(500, "Falta configurar ACCESS_CODE en Vercel.");
  const modo = await modoDeAcceso(codigo);
  if (!modo) return error(401, "El código de acceso no es correcto.");
  // Si la docente activó el consentimiento informado, la app lo muestra antes de la primera entrevista.
  let consentimiento = null;
  try { const c = await leerAjuste("consentimiento"); if (c && c.activo && String(c.texto || "").trim()) consentimiento = { texto: c.texto, version: c.version || "" }; } catch (e) { console.error("Consentimiento", e.message); }
  return Response.json({ ...modo, consentimiento });
}
