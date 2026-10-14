// Utilidades compartidas. Vercel no publica como ruta los archivos que empiezan con "_".

export function error(status, mensaje) {
  return Response.json({ error: mensaje }, { status });
}

// Código de acceso simple para que nadie más use tus claves de API.
export function verificarAcceso(request) {
  const esperado = process.env.ACCESS_CODE;
  if (!esperado) return error(500, "Falta configurar ACCESS_CODE en Vercel.");
  const recibido = request.headers.get("x-codigo") || "";
  if (recibido.trim() !== esperado.trim()) return error(401, "El código de acceso no es correcto.");
  return null;
}

export function escaparXml(texto) {
  return texto
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}
