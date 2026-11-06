// Rúbrica de evaluación de la anamnesis (V1, proyecto Paciente Clínica Virtual).
// Parte A: comunicación clínica, CICAA adaptada a entrevista por voz (29 ítems, 0-1-2 o NP).
// Parte B: contenido clínico, lista de cotejo general SÍ/NO ponderada (18 ítems, NA si no corresponde al caso).
// Ambas son iguales para todos los casos y se informan por separado.
import { guionCompleto } from "./_datos.js";

export const PARTE_A = [
  { grupo: "Conectar", items: [
    ["A1", "Recibe adecuadamente a la paciente: saluda, se presenta, verifica su identidad y explica el objetivo de la atención."],
    ["A2", "Se muestra cortés y amable durante toda la entrevista."],
    ["A3", "Muestra empatía verbal en los momentos oportunos (nombra o valida la emoción de la paciente)."],
    ["A4", "Muestra una reactividad adecuada: da tiempo para responder, no interrumpe ni se superpone al relato."],
    ["A5", "Facilita el discurso de la paciente (silencios, frases de continuación, repeticiones, «cuénteme más»)."],
    ["A6", "Se comunica de forma asertiva: plantea preguntas sensibles de manera directa, respetuosa y sin juicios."],
  ] },
  { grupo: "Identificar y comprender", items: [
    ["A7", "Emplea preguntas abiertas, especialmente al inicio y al abordar temas nuevos."],
    ["A8", "Avanza de preguntas abiertas a cerradas (técnica de cono) para precisar datos."],
    ["A9", "Capta y responde a las pistas verbales o emocionales que ofrece la paciente."],
    ["A10", "Explora las emociones y sentimientos que el problema le ha provocado."],
    ["A11", "Explora las expectativas de la paciente para esta consulta."],
    ["A12", "Explora cómo afecta el problema su vida diaria."],
    ["A13", "Explora las ideas de la paciente sobre el origen o la causa de su problema."],
    ["A14", "Explora el estado de ánimo de la paciente."],
    ["A15", "Explora posibles acontecimientos vitales estresantes."],
    ["A16", "Explora el entorno sociofamiliar (con quién vive, red de apoyo, pareja)."],
    ["A17", "Explora factores de riesgo o realiza actividades preventivas no relacionadas con la demanda inicial."],
    ["A18", "Resume la información obtenida y la confirma con la paciente."],
  ] },
  { grupo: "Acordar y ayudar", items: [
    ["A19", "Explica el problema o proceso principal."],
    ["A20", "Explica la evolución esperable del proceso."],
    ["A21", "Ofrece información adaptada a los problemas y necesidades de la paciente."],
    ["A22", "Entrega la información de forma clara, con lenguaje comprensible y sin tecnicismos."],
    ["A23", "Permite que la paciente exprese sus dudas y las responde."],
    ["A24", "Comprueba que la paciente comprendió la información (le pide que lo explique con sus palabras)."],
    ["A25", "Da a la paciente la oportunidad de participar en la toma de decisiones."],
    ["A26", "Si hay discrepancia o desacuerdo, busca el acuerdo (NP si no hay desacuerdo)."],
    ["A27", "Obtiene compromisos explícitos de la paciente respecto del plan a seguir."],
    ["A28", "Deja una red de seguridad: indica señales de alarma y cuándo y dónde volver a consultar."],
    ["A29", "Cierra adecuadamente la entrevista (resume lo acordado y se despide)."],
  ] },
];

export const PARTE_B = [
  { grupo: "Caracterización de la situación clínica actual", items: [
    ["B1", 1, "Indaga el motivo de consulta aparente con preguntas abiertas y deja que la persona lo relate."],
    ["B2", 2, "Caracteriza el problema actual: inicio, evolución, características y síntomas asociados."],
    ["B3", 2, "Indaga los datos clínicos actuales que el caso requiere para orientar la conducta (p. ej., FUR y posibilidad de embarazo, tratamiento en curso, signos de alarma)."],
  ] },
  { grupo: "Antecedentes relevantes", items: [
    ["B4", 2, "Obtiene antecedentes mórbidos, quirúrgicos y familiares pertinentes al motivo de consulta."],
    ["B5", 1, "Obtiene antecedentes farmacológicos y de alergias."],
    ["B6", 2, "Obtiene los antecedentes propios de la disciplina pertinentes al caso (p. ej., gineco-obstétricos, perinatales, del desarrollo, laborales)."],
  ] },
  { grupo: "Motivo de consulta real", items: [
    ["B7", 1, "Explica la confidencialidad de la atención y sus límites antes de abordar temas sensibles."],
    ["B8", 2, "Pregunta de forma directa y sin juicios por los aspectos sensibles que la persona no menciona espontáneamente."],
    ["B9", 2, "Identifica y explicita el motivo real de consulta."],
  ] },
  { grupo: "Factores de riesgo", items: [
    ["B10", 2, "Pesquisa factores de riesgo biomédicos pertinentes (p. ej., comorbilidades, riesgo cardiovascular, contraindicaciones)."],
    ["B11", 1, "Pesquisa hábitos y conductas de riesgo (p. ej., tabaco, alcohol u otras drogas, relaciones sexuales sin protección)."],
    ["B12", 2, "Pesquisa factores psicosociales y de seguridad: red de apoyo, violencia o coerción, barreras de acceso a la atención."],
  ] },
  { grupo: "Uso de lenguaje comprensible", items: [
    ["B13", 2, "Entrega información clínicamente correcta sobre el problema y los pasos a seguir (exámenes, tratamiento o cuidados)."],
    ["B14", 1, "Adapta la explicación al nivel de alfabetización en salud de la persona (frases cortas, ejemplos concretos, sin tecnicismos)."],
  ] },
  { grupo: "Consejería centrada en la persona", items: [
    ["B15", 2, "Ofrece alternativas basadas en evidencia y considera las preferencias de la persona en la decisión."],
    ["B16", 1, "Realiza consejería preventiva o de autocuidado pertinente al caso."],
    ["B17", 2, "Propone un plan de seguimiento o una derivación a la red cuando corresponde."],
    ["B18", 1, "Respeta los derechos y la autonomía de la persona, sin juicios sobre sus decisiones o su estilo de vida."],
  ] },
];

export function reglasRubrica(c) {
  const listaA = PARTE_A.map(g => `${g.grupo.toUpperCase()}\n` + g.items.map(([id, t]) => `${id}. ${t}`).join("\n")).join("\n");
  const listaB = PARTE_B.map(g => `${g.grupo.toUpperCase()}\n` + g.items.map(([id, , t]) => `${id}. ${t}`).join("\n")).join("\n");
  return `Eres docente evaluadora de comunicación clínica. Aplica una rúbrica a la transcripción de una entrevista (anamnesis) entre una estudiante de salud y una paciente simulada. La entrevista fue solo por voz: no evalúes conducta no verbal.

PARTE A — Comunicación clínica (CICAA adaptada a voz). Puntúa cada ítem:
0 = no lo realiza · 1 = lo realiza de forma parcial, tardía o poco adecuada · 2 = lo realiza de forma adecuada y oportuna · "NP" = no procede (la situación no se presentó en la entrevista; por ejemplo, A26 si no hubo desacuerdo).
${listaA}

PARTE B — Contenido clínico (lista de cotejo general). Marca cada ítem:
"SI" = la conducta está presente en la transcripción · "NO" = no está · "NA" = no corresponde a este caso. La docente definió qué ítems no aplican: ${(c.rubrica_na || []).length ? (c.rubrica_na || []).join(", ") + " (márcalos NA)" : "ninguno"}. No marques NA ningún otro ítem.
${listaB}

Criterios:
- Evalúa solo lo que consta en la transcripción. Si no hay evidencia, puntúa 0 o "NO".
- Sé exigente y consistente: 2 o "SI" solo si se cumple claramente.
- Usa NP y NA con moderación.
- Para cada ítem escribe una evidencia muy breve (máximo 15 palabras): una cita corta de la estudiante o lo que faltó.

Responde SOLO con un objeto JSON válido, sin texto antes ni después, con esta forma:
{"A":[{"id":"A1","p":2,"e":"..."}, ...29 ítems...],"B":[{"id":"B1","r":"SI","e":"..."}, ...18 ítems...]}

Contexto del caso (para saber qué era pertinente, cuál era el motivo real y qué información guardaba la paciente):
Desafío: ${c.desafio || ""}
Motivo en la ficha: ${c.motivo || ""}
Hitos del caso:
${(c.hitos || "").trim() || "(sin hitos)"}
${(c.rubrica || "").trim() ? `Criterios propios del caso definidos por la docente:\n${c.rubrica.trim()}\n` : ""}
Guion de la paciente:
${guionCompleto(c)}`;
}

// Lee la respuesta del modelo y calcula los puntajes con las reglas de la rúbrica.
export function calcularRubrica(texto, noAplican = []) {
  const na = new Set((noAplican || []).map(x => String(x).toUpperCase()));
  const ini = texto.indexOf("{"), fin = texto.lastIndexOf("}");
  if (ini < 0 || fin < ini) throw new Error("La evaluación no llegó en el formato esperado.");
  const datos = JSON.parse(texto.slice(ini, fin + 1));
  const porIdA = new Map((datos.A || []).map(x => [String(x.id).toUpperCase(), x]));
  const porIdB = new Map((datos.B || []).map(x => [String(x.id).toUpperCase().replace(/^(\d+)$/, "B$1"), x]));
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : null);

  let obtA = 0, maxA = 0;
  const gruposA = PARTE_A.map(g => {
    let o = 0, m = 0;
    const items = g.items.map(([id, texto]) => {
      const x = porIdA.get(id) || {};
      const np = String(x.p).toUpperCase() === "NP";
      const p = np ? null : Math.max(0, Math.min(2, Math.round(Number(x.p) || 0)));
      if (!np) { o += p; m += 2; }
      return { id, texto, puntaje: np ? "NP" : p, evidencia: String(x.e || "").slice(0, 200) };
    });
    obtA += o; maxA += m;
    return { grupo: g.grupo, obtenido: o, maximo: m, logro: pct(o, m), items };
  });

  let obtB = 0, maxB = 0;
  const gruposB = PARTE_B.map(g => {
    let o = 0, m = 0;
    const items = g.items.map(([id, peso, texto]) => {
      const x = porIdB.get(id) || {};
      // NA solo si la docente lo definió para este caso; así el denominador no depende de la IA.
      let r = ["SI", "SÍ", "NO"].includes(String(x.r).toUpperCase()) ? String(x.r).toUpperCase().replace("SÍ", "SI") : "NO";
      if (na.has(id)) r = "NA";
      if (r !== "NA") { m += peso; if (r === "SI") o += peso; }
      return { id, peso, texto, respuesta: r, evidencia: String(x.e || "").slice(0, 200) };
    });
    obtB += o; maxB += m;
    return { grupo: g.grupo, obtenido: o, maximo: m, logro: pct(o, m), items };
  });

  return {
    comunicacion: { obtenido: obtA, maximo: maxA, logro: pct(obtA, maxA), grupos: gruposA },
    contenido: { obtenido: obtB, maximo: maxB, logro: pct(obtB, maxB), grupos: gruposB },
  };
}
