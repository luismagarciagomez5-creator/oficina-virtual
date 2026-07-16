# Activación futura de llamadas salientes

## Objetivo

Permitir que el CEO o su socio ordenen desde Telegram a Hermes un recordatorio
de cita y que el agente de Voz lo ejecute mediante Vapi. No se habilitan
campañas automáticas ni llamadas iniciadas por rutinas.

```text
CEO/socio en Telegram
  -> identidad vinculada y verificada por backend
  -> Hermes solicita un recordatorio de una cita concreta
  -> Oficina Virtual resuelve contacto, teléfono, cita y consentimiento
  -> agente de Voz realiza la llamada con Vapi
  -> el resultado actualiza tarea, actividad, cita y memoria
```

## Estado preparado

`src/central-voice-outbound/` contiene:

- Política independiente por workspace.
- Autorización limitada a propietarios verificados del workspace.
- Lista opcional de identidades concretas para restringirlo al CEO y su socio.
- Único propósito inicial: `appointment_reminder`.
- Consentimiento obligatorio y teléfono E.164 obtenido desde datos confiables.
- Cita futura, horario local, máximo de intentos e idempotencia.
- Referencias sanitizadas de Vapi: `assistantId`, `phoneNumberId`, estado y
  presencia de credencial; nunca la API key.
- Payload server-side con variables dinámicas para reutilizar el prompt de Vapi.
- Registro idempotente del resultado de la llamada y protección entre workspaces.

## Datos que se conectarán desde el panel real

1. Vincular las cuentas del CEO y su socio con sus identidades de Telegram.
2. Confirmar que únicamente esas cuentas tienen rol de propietario o añadir
   sus identificadores internos a `authorizedPrincipalIds`.
3. Leer `assistantId` del asistente de Voz ya configurado en Vapi.
4. Añadir y verificar el número emisor; guardar únicamente `phoneNumberId`.
5. Mantener la API key cifrada en el backend y reportar solo `hasApiKey`.
6. Resolver contacto, teléfono, cita y consentimiento desde el SaaS.
7. Enviar el payload a Vapi desde un worker backend y procesar sus webhooks.

## Variables esperadas en el asistente de Vapi

El prompt continúa viviendo exclusivamente en Vapi. Puede utilizar:

- `{{purpose}}`
- `{{customerName}}`
- `{{appointmentAt}}`
- `{{contactId}}`
- `{{appointmentId}}`
- `{{voiceJobId}}`

Estas variables llegan mediante `assistantOverrides.variableValues`; no se
duplica el prompt dentro de Oficina Virtual.

## Condición de activación

Una llamada solo queda lista cuando se cumplen simultáneamente:

- Hermes es el Orquestador activo y su bridge está conectado.
- La orden procede de una identidad de Telegram verificada y autorizada.
- La política de recordatorios está habilitada.
- Vapi tiene credencial, asistente y número emisor verificados.
- El contacto y la cita pertenecen al mismo workspace.
- Existe consentimiento para llamada saliente.
- El teléfono es válido, la cita es futura y la hora está permitida.

Hasta entonces el selector de readiness devuelve bloqueos concretos y no se
crea ningún trabajo para Vapi.
