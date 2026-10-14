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
api/_caso.js          guion del caso y reglas del rol
api/_lib.js           código de acceso y utilidades
```
