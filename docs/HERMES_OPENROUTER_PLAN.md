# Plan de Orquestación: Hermes y OpenRouter

## Decisión principal

Cada workspace puede utilizar un único modo de Orquestador activo:

1. `openrouter`: el usuario conversa desde Oficina Virtual y un modelo de OpenRouter organiza el trabajo.
2. `hermes_telegram`: el CEO da órdenes por Telegram y Hermes dirige la Oficina Virtual como Orquestador.

Los modos son excluyentes, configurables por workspace y administrados desde el panel.

## Flujo de Hermes

```text
CEO da una orden en Telegram
  -> Hermes interpreta el objetivo como Orquestador
  -> Hermes activa un flujo completo en Oficina Virtual
  -> Los especialistas colaboran, revisan y solicitan aprobación cuando corresponde
  -> La acción final llega a su destino operativo: WhatsApp, Voz, CRM, archivos o informes
  -> La oficina registra tareas, actividad, memoria y resultados
```

Hermes no es llamado automáticamente por el Coordinador interno. En modo
`hermes_telegram`, Hermes sustituye al Orquestador. Telegram es el canal de
mando ejecutivo, no el destino obligatorio de los resultados. Hermes puede
enviar por Telegram confirmaciones, solicitudes de aprobación o resúmenes,
pero el trabajo termina en el canal o sistema que corresponda.

WhatsApp y Voz mantienen sus prompts y conexiones independientes. No se
configuran como especialistas editables, pero pueden recibir acciones ya
preparadas y aprobadas dentro del flujo. Por ejemplo, Propuestas crea una
campaña, Revisión/QA la valida y el agente de WhatsApp la envía mediante YCloud.

## Entrada segura desde Hermes

Toda orden debe incluir un identificador idempotente, workspace, conexión
autenticada, canal de mando, conversación, especialista, instrucciones y
acciones solicitadas.

- Hermes delega trabajo especializado en `proposal`, `operations`, `content` y `review-qa`.
- El canal de mando puede ser `telegram_private`, `telegram_group` o `voice`: algunas empresas hablarán con Hermes por voz y otras, como ONYXLINK, trabajarán en un grupo de Telegram donde el bot está incluido.
- La conexión autenticada se deriva de `WorkspaceOrchestratorBinding.hermesTelegram`: modo activo `hermes_telegram`, estado `connected`, `hasSecret`, endpoint backend y `connectionId` opaco reportado por backend.
- Coordinador, WhatsApp y Voz son puestos protegidos; los canales ejecutan las acciones finales autorizadas.
- La configuración de la oficina debe estar publicada.
- Las acciones deben estar permitidas para el especialista.
- Las acciones sensibles respetan la política de aprobación humana.
- Un reintento de Telegram o Hermes nunca duplica una tarea.
- Los eventos y resultados deben conservar `dispatchId`, `conversationId`, `taskId` y workspace para mantener trazabilidad, aunque no regresen a Telegram.

El contrato inicial está en `src/central-orchestration/hermes-dispatch.ts`.
La frontera pura para el futuro bridge es `acceptHermesSpecialistDispatch(...)`: valida el modo Hermes del workspace, resuelve la conexión autenticada y materializa una tarea idempotente sin HTTP, Telegram ni Supabase reales.
El contrato backend normalizado es `handleHermesBridgeRequest(...)`: recibe `HermesBridgeRequest`, separa errores del sobre (`invalid_bridge_request`) de errores de la orden (`invalid_dispatch`), verifica `authenticatedConnectionId` y responde `accepted`, `duplicate` o `rejected`.
El estado de una orden se consulta con `selectHermesBridgeDispatchStatus(...)` y los callbacks/entregas del bridge se registran con `recordHermesBridgeResultEvent(...)`; ambos conservan `dispatchId`, `conversationId`, `taskId`, `workspaceId` y `commandChannel` sin enviar nada real al canal de mando.

La conexión técnica se gestiona desde backend. El administrador no debe tener
que pegar manualmente un endpoint interno: la interfaz muestra bot, workspace,
estado del bridge y acciones de conexión o verificación.

## Conexión de OpenRouter

OpenRouter se configura una vez por workspace en el backend. La API key nunca
se guarda en el navegador, en variables `VITE_*` ni dentro de la configuración
de un agente.

El administrador puede elegir:

- Reutilizar la conexión OpenRouter ya existente en el panel.
- Utilizar una API key dedicada a Oficina Virtual dentro de la misma cuenta.

Para las primeras pruebas de ONYXLINK se recomienda una clave dedicada, por
ejemplo `oficina-virtual-onyxlink`, para separar gasto, límites, auditoría y
revocación sin afectar al agente de WhatsApp.

No se configura una API key por agente. Una conexión alimenta varios modelos.

El contrato backend puro de esta conexión vive en
`src/central-orchestration/openrouter-connection.ts`. Distingue conexión
`shared` o `dedicated` y mantiene los estados `not_configured`, `pending`,
`connected`, `error` y `revoked`. Las solicitudes administrativas solo pueden
pedir `connect`, `verify` o `revoke`; no aceptan API keys ni permiten elegir un
`connectionId`. El identificador opaco y `hasCredential` solo llegan mediante
un reporte autenticado del sistema, correlacionado con la solicitud pendiente.
Solicitudes y reportes son estrictos, idempotentes y aislados por workspace.
Este contrato todavía no llama a OpenRouter ni guarda secretos reales.

## Modelo por especialista

La oficina tendrá un modelo predeterminado y una configuración opcional por
puesto:

- Modelo principal.
- Modelo alternativo ante error o indisponibilidad.
- Perfil de coste: económico, equilibrado o premium.
- Límite diario y mensual.
- Longitud máxima de respuesta y parámetros permitidos.
- Permiso para utilizar modelos de coste elevado.
- Consumo, coste, latencia y tasa de éxito por agente.

El contrato puro inicial ya vive en `src/central-orchestrator/`: `OpenRouterConfig`
mantiene el modelo predeterminado del workspace, fallback, perfil de coste,
límites diarios/mensuales, permiso premium y overrides por `AgentId`. El selector
`selectOpenRouterModelForAgent(...)` resuelve el modelo efectivo de cada puesto y
devuelve bloqueos explícitos (`api_key_missing`, `model_missing`,
`premium_not_allowed`) sin llamar a OpenRouter ni transportar API keys.

El preflight backend inicial ya vive en `src/central-orchestration/openrouter-run.ts`:
`prepareOpenRouterAgentRun(...)` recibe una `OpenRouterRunRequest`, exige workspace
correcto, estado `connected` y modelo resuelto listo. El Coordinador requiere
`activeMode: openrouter`; los cuatro especialistas también pueden ejecutarse cuando
Hermes es el orquestador activo. WhatsApp y Voz quedan fuera porque conservan sus
propias conexiones y políticas. Si
todo está preparado devuelve `PreparedOpenRouterRun` con `runId`, `workspaceId`,
`agentId`, entrada, contexto, modelo/fallback, perfil de coste, límites y trazabilidad
para el backend. La salida no transporta API key, token, secret, streaming, prompt
real, coste real ni logs de tokens. Los rechazos son explícitos:
`workspace_mismatch`, `agent_not_openrouter_managed`, `orchestrator_not_openrouter`, `openrouter_not_connected`,
`api_key_missing`, `model_missing`, `premium_not_allowed` o `invalid_run_request`.

El Orquestador interno también puede tener su propio modelo. En modo Hermes,
Hermes organiza el trabajo, pero cada especialista continúa ejecutando con el
modelo de OpenRouter asignado a su puesto.

## Propiedad de prompts

- WhatsApp conserva su prompt en el panel de WhatsApp.
- Voz conserva su prompt en Vapi.
- Los cuatro especialistas se configuran en Oficina Virtual.
- No se copian ni duplican prompts entre productos.
- Compartir una conexión OpenRouter no significa compartir prompts ni modelos.

## Orden de implementación

1. Terminar y probar el contrato de modos por workspace.
2. Reconciliar el binding `hermes_telegram` con la entrada segura de órdenes.
3. Construir el bridge backend Telegram/Hermes sin secretos en frontend.
4. Añadir conexión OpenRouter compartida o dedicada por workspace.
5. Añadir modelo predeterminado y override por especialista.
6. Incorporar presupuestos, límites, fallback y métricas de coste.
7. Activar primero el workspace de ONYXLINK en modo de prueba.
8. Verificar el flujo completo Telegram -> Hermes -> Oficina Virtual -> especialistas/canales -> destino final.
9. Probar el modo alternativo Oficina Virtual -> OpenRouter -> especialistas.
10. Solo después preparar la plantilla replicable para clientes.

## Criterios de aceptación

- Ningún workspace puede acceder a credenciales, tareas o resultados de otro.
- Solo existe un modo de Orquestador activo por workspace.
- Ningún secreto llega al frontend o al registro de eventos.
- Los reintentos no duplican tareas ni acciones externas.
- Las acciones sensibles quedan detenidas hasta aprobación.
- Telegram funciona como mando ejecutivo y no como bandeja obligatoria de resultados.
- WhatsApp, Voz y otros canales solo ejecutan acciones autorizadas y trazables.
- El gasto puede consultarse por workspace, agente y modelo.
- Cambiar o revocar la clave de Oficina Virtual no rompe WhatsApp cuando se usa
  una conexión dedicada.
