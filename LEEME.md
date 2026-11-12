# Paciente Virtual Conversacional

Aplicación web para entrenar anamnesis con una paciente simulada por voz.

- **Claude** (Anthropic) genera las respuestas de la paciente y la retroalimentación final según las tareas CICAA.
- **Whisper** (OpenAI) transcribe lo que dice el estudiante.
- **Azure Speech** lee la respuesta con voz chilena (Catalina, `es-CL-CatalinaNeural`).

El guion del caso queda en el servidor (`api/_caso.js`), así que el estudiante no puede leerlo desde la página. La aplicación no guarda las conversaciones: la transcripción solo existe en el navegador mientras dura la entrevista.

## Cuentas y claves que necesitas

| Servicio | Dónde se crea | Variable en Vercel |
|---|---|---|
| Claude | console.anthropic.com → API Keys (requiere cargar saldo) | `ANTHROPIC_API_KEY` |
| Whisper | platform.openai.com → API keys (requiere cargar saldo) | `OPENAI_API_KEY` |
| Azure Speech | portal.azure.com → crear recurso "Speech" (plan gratuito F0) → Claves y punto de conexión | `AZURE_SPEECH_KEY` y `AZURE_SPEECH_REGION` (por ejemplo `brazilsouth` o `eastus`) |
| Código de acceso | Lo inventas tú y se lo das a los estudiantes | `ACCESS_CODE` |

Variables opcionales:

- `AZURE_VOICE`: otra voz de Azure. Por defecto `es-CL-CatalinaNeural`; la masculina chilena es `es-CL-LorenzoNeural`.
- `CLAUDE_MODEL`: modelo para la paciente. Por defecto `claude-haiku-5-5`, el más rápido para conversar.
- `CLAUDE_MODEL_FEEDBACK`: modelo para la retroalimentación. Por defecto `claude-sonnet-5-5`.

Las claves se escriben solo en Vercel (Project → Settings → Environment Variables), nunca en el código. Después de agregarlas o cambiarlas, hay que volver a publicar (Redeploy).

## Cambiar el caso

Edita `GUION` y `PACIENTE` en `api/_caso.js` y vuelve a publicar.

## Estructura

```
index.html            la página que ve el estudiante
api/chat.js           respuestas de la paciente y retroalimentación (Claude)
api/transcribir.js    voz a texto (Whisper)
api/hablar.js         texto a voz chilena (Azure)
api/estado.js         indica qué servicios están configurados
api/reporte.js        recibe los reportes de problemas
api/_caso.js          guion del caso y reglas del rol
api/_lib.js           código de acceso y utilidades
```

## Personajes en Supabase

Los personajes viven en la tabla `casos` del proyecto de Supabase `paciente-virtual-conversacional` (región São Paulo). Cada capa va en su propia columna: identificación, identidad, cómo parte la consulta, información condicionada, carga emocional, forma de hablar, reglas adicionales y voz (`voz_id`). La tabla tiene RLS activado y sin políticas: solo el servidor, con la clave secreta, puede leerla.

Variables en Vercel:

| Variable | Valor |
|---|---|
| `SUPABASE_URL` | `https://ykahennqppthymcwbwlr.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → clave secreta (`sb_secret_…`) |
| `DOCENTE_CODE` | Código de administración para entrar a `/docente.html`, distinto del de los estudiantes |

Si faltan las variables de Supabase, la aplicación usa los personajes de `api/_casos.js` como respaldo (sin poder editarlos).

En `/docente.html` se editan las capas, se activa o desactiva cada personaje y se elige su voz de ElevenLabs desde una lista con las voces de la cuenta, con botones para escucharla.

## Códigos individuales por docente

- `DOCENTE_CODE` es el código de **administración**: puede todo, incluida la pestaña «Docentes».
- En «Docentes» (solo administración) se crean los códigos individuales D1 a D6 con un clic. Cada fila muestra el código, el último ingreso, un interruptor para activarlo o desactivarlo y los botones para copiarlo o borrarlo. Los códigos no llevan nombres, solo etiqueta.
- Con un código individual el panel muestra «Sesión D3» y es de **lectura y prueba**: se pueden ver personajes, entrevistas y evaluaciones, y probar la voz. Para **conversar con la paciente**, el mismo código sirve en la pestaña Estudiante de la pantalla de inicio (práctica libre); esas entrevistas quedan con la actividad «Prueba interna D1», para separarlas de las de estudiantes. Editar o borrar personajes y entrevistas, cambiar el consentimiento, las actividades y la pronunciación, y administrar códigos queda solo para administración (el servidor lo exige, no solo la pantalla).
- Cada fila tiene «Enviar con Gmail / Outlook»: se escribe el correo de la persona y se prepara el mensaje (enlace, código y cómo usarlo) en Gmail, en Outlook web, en tu programa de correo o se copia al portapapeles. La app no guarda ni envía el correo; tú lo revisas y lo envías. Si «Programa de correo» no hace nada, tu computador no tiene uno configurado: usa Gmail, Outlook o Copiar mensaje.
- Un código desactivado o borrado deja de funcionar en menos de un minuto.
- La tabla se crea con `sql/2026-11-12_docentes_codigos.sql`.

## Reportar un problema

- El botón «Reportar un problema» está en la selección de paciente, en la sala de entrevista, en la retroalimentación y en el panel docente. Lo puede usar cualquier persona con un código válido.
- Cada reporte guarda la etiqueta del código (D1…D6, el nombre de la actividad o «Práctica libre»; nunca el código ni un nombre), el tipo de problema, la pantalla, la paciente, el navegador y, si la persona lo deja marcado, la conversación en curso.
- En el panel, «Reportar un problema» muestra a administración los reportes recibidos: se marcan como resueltos o se borran. Los códigos D1 a D6 pueden enviar, pero no ver los de otras personas.
- La tabla se crea con `sql/2026-11-12_reportes.sql`.

## Actividades y guía de la entrevista

- El código general (`ACCESS_CODE`) sirve para practicar fuera del aula: cada estudiante decide si usa la guía de los tres momentos.
- En el panel docente, «Actividades y guía» crea códigos para cada clase o evaluación, cada uno con su regla: guía siempre visible, oculta (evaluación) o a elección del estudiante. Se pueden desactivar o borrar.
- Los códigos de actividad se guardan en la tabla `actividades` de Supabase.

## Evaluación: lo que ve cada quien

- **Estudiante:** al terminar ve su porcentaje de logro (Parte A, comunicación clínica CICAA; Parte B, contenido clínico) y una retroalimentación breve (2 fortalezas, 2 aspectos a mejorar, 1 sugerencia). La versión breve no revela la información oculta del caso, para que se pueda repetir en el postest.
- **Docente (panel → Entrevistas):** cada entrevista queda guardada con un código seudónimo que genera la app (P-XXXXXX, sin nombre ni correo): transcripción, rúbrica completa con evidencia y retroalimentación detallada. Se puede filtrar por caso, actividad o participante y descargar una planilla .csv con el puntaje de cada ítem.
- **Consentimiento (panel → Consentimiento):** si se activa, se muestra antes de la primera entrevista. Quien no acepta puede practicar, pero no se guarda nada. Al cambiar el texto se vuelve a pedir.
- Las tablas se crean con `sql/2026-11-11_entrevistas_ajustes.sql`. Los casos de esa fecha están en `sql/2026-11-11_casos.sql`; los casos anteriores quedaron respaldados en la tabla `casos_archivo`.

## Avatar 3D

En el panel, pestaña «3. Lingüística» → «Avatar 3D (opcional)», se elige si el personaje aparece con cuerpo. Los modelos son archivos `.glb` en la carpeta `modelos/`; por ahora hay uno (`valentina.glb`). Para sumar otro, hay que agregar el archivo a esa carpeta y su opción a la lista de `docente.html`. La elección se guarda en la columna `modelo_3d` de `casos` (`sql/2026-11-12_limpieza_y_modelo_3d.sql`).

## Casos pediátricos

Se entrevista a la persona cuidadora (por ejemplo, el nombre del caso termina en «(entrevista a la madre)»). La niña o el niño interviene con frases cortas que el modelo escribe entre dobles llaves, `{{Florencia: …}}`: se muestran en la transcripción, pero no se leen en voz alta.
