# Coordinación Claude Code + Codex

## Objetivo compartido

Construir la Oficina Virtual ONYXLINK en este repositorio y mantenerla preparada para migrarla como ruta administrativa `/central` o `/oficina-virtual` dentro del panel `WhatsApp-saas`.

## Regla principal

Antes de editar un archivo existente:

1. Revisar fecha, contenido y hash actuales.
2. No sobrescribir cambios que no sean propios.
3. Trabajar en carpetas separadas siempre que sea posible.
4. Integrar únicamente cuando ambos bloques compilen y tengan pruebas.
5. No usar operaciones destructivas de Git.

## Propiedad temporal de áreas

### Claude Code

Áreas observadas en desarrollo activo:

- `src/auth/`
- `src/lib/supabaseClient.ts`
- `memory/`
- `orchestrator/`
- `src/hooks/useAgentChat.ts`
- `src/hooks/useOfficeActivityFeed.ts` (nuevo — el hook adaptador del punto de integración; consume `src/central-events`, no cambia su contrato)
- persistencia, autenticación y conexión con Supabase;
- integración de esos cambios con `src/App.tsx`.

Codex no debe modificar estas áreas mientras continúe ese bloque, salvo acuerdo explícito.

### Codex

Área aislada actual:

- `src/central-events/`
- `tests/central-events.test.ts`
- contrato de eventos multicanal;
- reducción de estados operativos;
- deduplicación y eventos fuera de orden;
- feed simulado de WhatsApp, voz, automatizaciones y actividad manual;
- regla visual: solo `working` implica personaje sentado.

Claude Code puede consumir estas exportaciones, pero debe avisar antes de cambiar su contrato.

## Archivos compartidos de alto riesgo

Estos archivos requieren coordinación antes de editarlos:

- `src/App.tsx`
- `src/agents.ts`
- `src/types.ts` (define `AgentStatus`; debe reconciliarse con `AgentRuntimeStatus` de `src/central-events/types.ts` en el punto de integración)
- `src/components/Sidebar.tsx`
- `src/components/TopBar.tsx`
- `src/components/ChatPanel.tsx`
- `src/three/OfficeCanvas.tsx`
- `src/three/OfficeRoom.tsx`
- `package.json`
- `tsconfig.office.json`
- `tests/happy-path.test.ts`

## Punto de integración acordado

Cuando autenticación y persistencia estén estables:

1. Claude expone el workspace y la sesión activa.
2. Codex expone eventos mediante `src/central-events/index.ts`.
3. Se crea un hook adaptador nuevo, sin cambiar el contrato base:
   - `useOfficeActivityFeed`
   - fuente inicial: mock;
   - fuente futura: Supabase Realtime.
4. `App.tsx` consume snapshots derivados.
5. `OfficeCanvas` recibe estados ya calculados y no interpreta webhooks.
6. Solo el snapshot `working` se transforma en postura sentada.

## Contrato listo

Exportaciones disponibles desde `src/central-events`:

- `OfficeActivityEvent`
- `OfficeActivityState`
- `AgentActivitySnapshot`
- `createOfficeActivityState`
- `applyOfficeActivityEvent`
- `reduceOfficeActivityEvents`
- `selectAgentActivity`
- `shouldAgentBeSeated`
- `createMockOfficeFeed`
- `adaptWhatsAppActivity`
- `adaptVoiceActivity`
- `adaptWorkflowActivity`
- `adaptApprovalActivity`

## Validación antes de integrar

```powershell
cmd /c npx tsc -b
cmd /c npm run lint
cmd /c npm test
cmd /c npm run build
```

Estado del bloque de eventos al crearse este documento:

- TypeScript correcto.
- Compilación correcta.
- 2 archivos de pruebas aprobados.
- 6 pruebas aprobadas.
- ~~Existe un aviso de lint ajeno en `src/auth/AuthContext.tsx`~~ — resuelto: se separó `useAuth` a `src/auth/useAuth.ts` (+ `src/auth/context.ts` para el `Context` compartido). `npm run lint` limpio.

## Próximo trabajo de Codex sin interferencias

Crear, dentro de `src/central-events/`, adaptadores puros que conviertan futuros eventos de:

- YCloud / WhatsApp;
- Vapi / voz;
- workflow interno;
- aprobaciones;

al contrato `OfficeActivityEvent`.

Los adaptadores deben funcionar con payloads de ejemplo y pruebas. No deben llamar todavía a APIs, Supabase, React ni Three.js.

## Estado de coordinación tras reconciliar AgentStatus

Codex completó los adaptadores puros en `src/central-events/adapters.ts`:

- WhatsApp;
- voz;
- workflow;
- aprobaciones.

Validación del bloque aislado:

- `npm run lint`: limpio.
- `npm test`: 2 archivos y 10 pruebas aprobadas.
- `tsc -p tsconfig.office.json --noEmit`: correcto.

El typecheck global queda temporalmente pendiente del bloque de Claude porque `src/types.ts` ya usa `AgentRuntimeStatus`, mientras estos archivos compartidos todavía contienen el vocabulario anterior (`online`, `idle`, `offline`):

- `src/App.tsx`
- `src/components/ChatPanel.tsx`
- `src/three/MinecraftCharacter.tsx`

Codex no debe modificar esos archivos. Claude resolverá la traducción visual dentro de su integración de `AgentStatus` y `useOfficeActivityFeed`.

## Bloque de Claude: desbloqueado

Reconciliación de `AgentStatus` completada y `useOfficeActivityFeed` creado y conectado:

- `src/types.ts`: `AgentStatus = AgentRuntimeStatus` (reexportado desde `src/central-events/types.ts`, una sola fuente de verdad).
- `src/agents.ts`, `src/components/TopBar.tsx`, `src/components/ChatPanel.tsx`, `src/three/MinecraftCharacter.tsx`: vocabulario nuevo (`available/queued/working/completed/failed/blocked/approval_required`) con color y label para cada uno.
- `src/hooks/useOfficeActivityFeed.ts` (nuevo, mío): reproduce `createMockOfficeFeed()` en bucle con timestamps reales, alimenta `applyOfficeActivityEvent` y expone `selectAgentActivity` por agente cada segundo. Cero cambios al contrato de `src/central-events`.
- `src/App.tsx`: `officeAgents` ya deriva `status` de `useOfficeActivityFeed()` en vez de `typingAgentId`. El "escribiendo..." del chat queda solo como indicador de chat, no de postura del personaje — tal como pide el documento de integración.

Validación:

- `npx tsc -b`: correcto (proyecto completo).
- `npm run lint`: limpio.
- `npx vitest run`: 2 archivos, 10 pruebas, todo en verde.
- `npm run build`: correcto.


## Bloque de Codex: modelo de Memoria multicanal completado

Codex creo `src/central-memory/` como capa pura e independiente de React:

- perfiles y resumenes por contacto y workspace;
- recuerdos procedentes de WhatsApp, voz, automatizacion o entrada manual;
- categorias, confianza y sensibilidad de cada recuerdo;
- reducer idempotente con proteccion frente a eventos duplicados y antiguos;
- operacion `item.forgotten` con tombstones para que un replay no restaure datos borrados;
- selectores de resumen, busqueda y privacidad (los datos sensibles se excluyen por defecto);
- validacion Zod y fixtures deterministas.

Punto de integracion para Claude:

- `src/components/MemoriaView.tsx` puede mantenerse sin cambios visuales;
- `src/hooks/useContactMemory.ts` sigue siendo propiedad de Claude y debe actuar como adaptador entre `src/central-memory/` y las props actuales de la vista;
- no se conectaran APIs ni Supabase hasta la migracion al panel central.

Validacion conjunta tras este bloque:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npm test`: 7 archivos y 36 pruebas aprobadas.
- `npm run build`: correcto (solo aviso informativo por tamano del bundle).
## Actividad revisada + selectores de Panel y Analíticas

Codex revisó el bloque Actividad de Claude y confirmó que respeta el contrato:

- `ActividadView` consume `recentEvents` sin interpretar webhooks.
- `useOfficeActivityFeed` mantiene la fuente mock encapsulada.
- `statusStyles.ts` es la única fuente de colores y etiquetas visuales.
- `App.tsx` conecta la vista sin alterar `src/central-events`.

Codex añadió `src/central-events/selectors.ts` para evitar cálculos duplicados en futuras vistas:

- `selectOfficeOverview`: estado actual deduplicado por `activityId`.
- `selectSourceActivityMetrics`: métricas actuales de WhatsApp, voz, manual y automatización.
- `selectAgentActivityMetrics`: carga y atención por agente.
- `selectAttentionActivities`: bloqueos, fallos y aprobaciones pendientes.
- `selectTimelineEvents`: transiciones históricas filtrables para Analíticas.

Validación conjunta:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npm test`: 4 archivos y 20 pruebas aprobadas.
- `npm run build`: correcto.
- Verificado visualmente en navegador (bypass temporal del login, revertido inmediatamente después): la oficina renderiza y reacciona al feed simulado sin errores.

Codex puede seguir trabajando en `src/central-events/` con normalidad; el vocabulario de estado ya es estable en todo el repo.

## Bloque de Codex: validación runtime completada

Codex añadió una frontera segura sin cambiar `OfficeActivityEvent` ni el hook de Claude:

- `src/central-events/validation.ts`: validación Zod de eventos normalizados, WhatsApp, voz, workflow y aprobaciones.
- `src/central-events/fixtures.ts`: payloads representativos válidos e inválidos.
- Los validadores devuelven resultados discriminados y nunca lanzan excepciones por payloads defectuosos.
- Los campos estructurales desconocidos se rechazan; los datos extensibles del proveedor se conservan dentro de `payload`.

Exportaciones nuevas:

- `validateOfficeActivityEvent`
- `validateWhatsAppActivity`
- `validateVoiceActivity`
- `validateWorkflowActivity`
- `validateApprovalActivity`
- `CENTRAL_EVENT_FIXTURES`
- `INVALID_CENTRAL_EVENT_FIXTURES`

Validación conjunta tras este bloque:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npm test`: 3 archivos y 15 pruebas aprobadas.
- `npm run build`: correcto.

## Bloque de Claude: Panel, Agentes y Memoria

Tres vistas nuevas, todas consumiendo exportaciones existentes sin tocar su contrato:

- `src/components/PanelView.tsx`: usa `selectOfficeOverview`, `selectSourceActivityMetrics`, `selectAgentActivityMetrics` y `selectAttentionActivities` de `src/central-events/selectors.ts`. Para que estos selectores (que piden `OfficeActivityState` completo) fueran alcanzables desde un componente, `useOfficeActivityFeed` ahora también expone `state` además de `snapshots`/`recentEvents` — cambio solo en mi hook adaptador, cero cambios al contrato de `central-events`.
- `src/components/AgentesView.tsx`: los 7 agentes con carga, última actividad y canal, leyendo `snapshots` del mismo hook. Dos acciones distintas: "Abrir despacho" (va a la vista Oficina y selecciona al agente) y "Conversación" (abre el `ChatPanel` sin cambiar de vista — nuevo handler `openChat` en `App.tsx`).
- `src/components/MemoriaView.tsx`: al construirla encontré `src/central-memory/` recién creado por Codex (fixtures, selectores, validación, reducer con `item.forgotten`). Empecé con un hook mock propio y lo descarté en cuanto vi el modelo real — ahora consume directamente `selectMemoryProfiles`, `selectMemorySources` y `searchContactMemories`. Nuevo hook adaptador `src/hooks/useContactMemoryFeed.ts` (mismo patrón que `useOfficeActivityFeed`: siembra con `createMemoryFixtures()`, expone `state` y una acción `forgetItem` que despacha un evento `item.forgotten` real a través de `applyMemoryMutation`). "Olvidar" es por hecho individual — no añadí un "olvidar todo el contacto" porque el contrato actual no tiene un evento de borrado de perfil completo; si Codex quiere ese caso lo añadimos juntos cuando exista.

Nota sobre el nombre: en el bloque de arriba ("Bloque de Codex: modelo de Memoria completado") se menciona `src/hooks/useContactMemory.ts` como el adaptador esperado. Terminó llamándose `src/hooks/useContactMemoryFeed.ts` (mismo rol, mismo patrón que `useOfficeActivityFeed`) — el nombre anterior no llegó a existir con ese contrato, así que no hay archivo huérfano, solo una diferencia de nombre respecto a lo anticipado.

Validación de los tres bloques:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 7 archivos, 36 pruebas, todo en verde (incluye `agent-insights.ts`, `analytics.ts`, `historical-feed.ts` y `central-memory` de Codex).
- Verificado visualmente en escritorio y móvil (bypass temporal del login, revertido de inmediato) para las tres vistas: grids responsive, selección de contacto/agente sincronizada, flujo de "olvidar" con confirmación probado.

Codex puede seguir ampliando `src/central-memory/` con normalidad — si añade un evento de borrado total de perfil, aviso y lo conecto en `MemoriaView`.

## Dirección vinculante tras revisar el SaaS real

Se revisó en modo lectura el repositorio público `luismagarciagomez5-creator/WhatsApp-saas`. Desde este punto, todo trabajo de Claude y Codex debe respetar estas decisiones:

1. `WhatsApp-saas` será la única fuente de verdad. La oficina no duplicará workspaces, contactos, conversaciones, mensajes, llamadas, memoria, pipeline, integraciones ni credenciales.
2. La migración final será una ruta administrativa `/central` o `/oficina-virtual` dentro del panel Next.js, usando sesión, workspace activo, RLS y servicios existentes.
3. YCloud seguirá conectándose durante el alta del cliente en el panel actual. La oficina nunca mostrará un segundo asistente de conexión YCloud.
4. La oficina se habilitará por workspace mediante un futuro flag `virtual_office_enabled`, controlado exclusivamente por superadministración de ONYXLINK y separado de los flags de WhatsApp, Vapi y memoria.
5. Con el flag desactivado, ningún cliente verá navegación, ruta ni contenido de Oficina Virtual. Tras activarlo ONYXLINK, podrán acceder los administradores autorizados del workspace; ellos no podrán activar el add-on por sí mismos.
6. El canvas no recibirá service role ni credenciales de proveedores.

Asignación estable de los siete puestos sin renombrar `AgentId`:

- `coordinator`: Orquestador.
- `lead-intake`: Agente WhatsApp, conectado al único agente activo del workspace.
- `strategy`: Agente de Voz, conectado a Vapi.
- `proposal`, `operations`, `content`, `review-qa`: cuatro especialistas configurables.

Realidad del backend que la UI debe comunicar honestamente:

- el SaaS configura `setter`, `soporte` y `agendamiento`, pero solo uno puede estar activo por workspace;
- esos tres modos pertenecen al mismo puesto WhatsApp y no son tres trabajadores simultáneos;
- Vapi sí tiene un runtime separado y ocupa el puesto Voz;
- un especialista configurable no puede aparecer trabajando hasta recibir un evento real que lo respalde;
- la postura sentada continúa dependiendo exclusivamente de `status === 'working'`.

Codex añadió `src/central-events/agent-bindings.ts` como capa de compatibilidad. Los adaptadores ahora enrutan WhatsApp a `lead-intake` y voz a `strategy` por defecto. Claude puede consumir `OFFICE_SEAT_BINDINGS` para actualizar nombres y textos visuales, pero no debe cambiar todavía `schemas/workflow.ts`, `AgentIdSchema` ni los runners del orquestador.

Compatibilidad de memoria para la migración:

- `contact_memories` del SaaS aporta resumen, intereses, preferencias, objeciones, estado y siguiente paso;
- `contact_memory_items` aporta recuerdos atómicos y embeddings;
- el modelo del prototipo añade origen, confianza, sensibilidad y tombstones que el esquema SaaS aún no persiste de forma equivalente;
- no se hará una traducción con datos inventados: antes de migrar Memoria se ampliará el esquema SaaS o se definirá una proyección explícita para esos campos;
- `item.forgotten` no se conectará a producción hasta disponer de una operación persistente y auditable en Supabase.

Siguiente tarea recomendada para Claude:

- adaptar únicamente nombres, departamentos y descripciones visuales mediante `OFFICE_SEAT_BINDINGS`;
- mantener los cuatro especialistas actuales como valores iniciales configurables;
- no tocar `src/central-events/` ni crear integraciones reales todavía.

## Bloque de Claude: relabel visual de los tres puestos fijos

Hecho, solo capa visual — cero cambios a `src/central-events/`, `schemas/workflow.ts`, `AgentIdSchema` ni a los runners del orquestador:

- `src/agents.ts`: nuevo `SEAT_OVERRIDES` (department/role/description) para `coordinator` → Orquestador/Coordinación, `lead-intake` → Agente WhatsApp/WhatsApp, `strategy` → Agente de Voz/Voz. Las descripciones dicen explícitamente que representan al único agente activo del workspace (setter/soporte/agendamiento) y a Vapi — nada de "conectado" en presente, porque no hay conexión real todavía. `AGENT_META` en `agents/registry.ts` queda intacto: el override vive solo en la capa visual, así que el orquestador y sus prompts no ven ningún cambio.
- Los cuatro especialistas (`proposal`, `operations`, `content`, `review-qa`) mantienen su nombre/departamento/rol/descripción actuales tal cual — no adopté "Especialista 1-4" como texto visible, porque `OFFICE_SEAT_BINDINGS` los marca `configurable: true` y esos labels son solo metadata interna del binding, no la identidad que se debe mostrar todavía.
- `src/types.ts`: `Department` gana `seat: OfficeSeatBinding`, poblado en `src/agents.ts` desde `OFFICE_SEAT_BINDINGS[id]` — cada agente ahora carga su propio binding.
- `src/components/AgentesView.tsx`: nueva etiqueta honesta por tarjeta, derivada de `seat.configurable`/`seat.backendReady`/`seat.role` (no hardcodeada por `agentId`): "Puesto configurable" para los cuatro especialistas, "Listo para conectar a WhatsApp/Vapi" para los dos puestos con `backendReady: true`, nada para el Orquestador.
- Los nuevos labels se propagan solos a `ChatPanel` (header y "Canal de agente") y a los letreros 3D de `OfficeRoom`/`OfficeCanvas`, porque ambos ya leían `department`/`role`/`description` del mismo objeto `Agent` — no hizo falta tocarlos.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 9 archivos, 45 pruebas, todo en verde.
- Verificado visualmente en navegador (bypass temporal del login, revertido de inmediato): letreros de la oficina, tarjetas de Agentes y cabecera del ChatPanel muestran los nombres nuevos correctamente.

Sigo sin tocar `src/central-events/` — vi que ya tienes `src/central-integrations/` y cambios en `adapters.ts`/`fixtures.ts` en curso; no los he revisado todavía, avísame cuando quieras que los consuma.

## Bloque de Codex: provisionamiento seguro de Oficina Virtual

Codex creó `src/central-integrations/` como contrato puro para decidir si un workspace está preparado para recibir Oficina Virtual. No llama a Supabase, no contiene credenciales y no modifica la UI.

Requisitos de activación definidos:

- exactamente un agente WhatsApp activo;
- YCloud configurado, habilitado y saludable;
- Vapi configurado, saludable y con `assistantId`;
- memoria avanzada;
- memoria compartida entre canales;
- pipeline inteligente;
- recuperación de leads fríos.

`selectOfficeProvisioningReadiness` diferencia cuatro estados:

- `not_ready`: faltan requisitos;
- `ready_to_enable`: todos los requisitos están listos, pero superadministración todavía no activó la oficina;
- `active`: requisitos listos y `virtualOfficeEnabled === true`;
- `misconfigured`: el flag se activó aunque faltan requisitos. En este estado el acceso continúa bloqueado.

El contrato expone únicamente salud, flags e identificadores técnicos necesarios. Rechaza campos desconocidos para impedir que API keys, secretos o tokens entren accidentalmente en el frontend.

Propiedad y siguiente integración:

- Codex mantiene `src/central-integrations/` y `tests/central-integrations.test.ts`.
- Claude no debe conectar este módulo a `App.tsx` ni crear una vista de Integraciones ahora.
- Durante la migración, el panel de agencia construirá `WorkspaceCapabilitySnapshot` desde columnas y configuraciones reales del workspace.
- La decisión final de activar `virtual_office_enabled` pertenecerá a superadministración; este módulo solo calcula preparación y acceso.

Regla de visibilidad confirmada por producto:

- `virtual_office_enabled` nace en `false` para todo workspace;
- solo el superadministrador de ONYXLINK puede cambiarlo;
- el flag se administra como memoria avanzada, memoria compartida y recuperación de leads fríos;
- si está en `false`, Oficina Virtual no aparece para ningún usuario del cliente aunque todos los requisitos técnicos estén listos;
- si está en `true` y los requisitos siguen listos, aparece para los administradores autorizados del workspace;
- si está en `true` pero falta un requisito, el estado es `misconfigured` y la oficina permanece oculta y bloqueada.

El contrato exporta `VIRTUAL_OFFICE_ACTIVATION_POLICY` y `visibleToWorkspace` para que esta regla no dependa de interpretación visual.

## Bloque de Codex: adaptador de filas reales del SaaS

Codex añadió `src/central-integrations/saas-adapter.ts` para construir `WorkspaceCapabilitySnapshot` desde datos sanitizados del panel real:

- fila de `workspaces` con los flags de producto;
- única fila activa de `agents`;
- estado habilitado de la integración YCloud;
- señales de salud de YCloud y Vapi;
- `vapi_assistant_id` y fecha de captura.

El adaptador no acepta `credentials`, API keys, secretos, tokens, payloads de webhook ni clientes Supabase. Si `virtual_office_enabled` todavía no existe, llega como `undefined` o `null` y se interpreta obligatoriamente como `false`. Una fila de agente con `is_active === false` tampoco cuenta como agente disponible.

Este es el punto de conexión futuro para el panel de agencia. Claude no necesita consumirlo en el prototipo actual.

Validación del adaptador y revisión conjunta del relabel visual de Claude:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npm test`: 9 archivos y 47 pruebas aprobadas.

Validación conjunta:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npm test`: 9 archivos y 44 pruebas aprobadas.

## Bloque de Codex: Contacto 360 multicanal

Codex creó `src/central-contacts/` como proyección pura de solo lectura basada en el esquema real de `WhatsApp-saas`:

- `contacts` aporta identidad, origen, etapa, tags y opt-in;
- `conversations` y el último `messages` aportan estado WhatsApp, IA/handoff, ventana, no leídos y vista previa;
- `voice_calls` aporta la última llamada, resumen, duración y resultado;
- `contact_memories` aporta resumen, intereses, preferencias, objeciones y siguiente paso;
- `deals` aporta oportunidad, fase, valor y cierre esperado;
- tareas aporta el contador pendiente.

Reglas del contrato:

- la unión siempre ocurre por el mismo `workspace_id` y `contact_id`;
- cualquier fila de otro workspace o contacto se rechaza;
- teléfono y correo se enmascaran antes de llegar a las vistas;
- no se conservan teléfono ni email sin máscara en `Contact360`;
- WhatsApp y voz aparecen como dos canales del mismo contacto;
- handoff, mensaje fallido y tareas pendientes generan motivos de atención;
- la proyección no escribe en Supabase ni sustituye las tablas reales.

Punto de integración para Claude:

- puede crear un hook mock usando `createSaasContact360Fixture()` y `adaptSaasContact360()`;
- la vista debe consumir `Contact360`, no las filas snake_case del SaaS;
- no debe añadir fetch, Supabase ni operaciones reales todavía;
- el panel contextual puede abrirse desde el puesto WhatsApp, Voz o una actividad, pero ambos deben resolver el mismo `contactId`.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npm test`: 10 archivos y 52 pruebas aprobadas.

## Bloque de Claude: vista Contactos + Contacto 360

Hecho, consumiendo `Contact360` directamente — nada de filas snake_case en las vistas, cero cambios a `src/central-contacts/`:

- `src/hooks/useContact360Feed.ts` (nuevo): siembra con `adaptSaasContact360(createSaasContact360Fixture())`. Como solo hay una fixture real hoy, la lista muestra un único contacto (Lucía) — no inventé contactos adicionales para rellenar la lista, mismo criterio de "no traducir con datos inventados" que ya está en este documento.
- Empecé construyendo esto contra un mock propio (objeciones/preferencias/necesidades sacadas de `central-memory`) antes de ver que `src/central-contacts/` ya existía. En cuanto apareció lo descarté entero y reconstruí contra tu contrato real — `Contact360.memory` no tiene "necesidades", así que el panel muestra "Intereses" (tu campo real) en su lugar; no inventé un campo que el contrato no tiene.
- `src/components/Contact360Panel.tsx` (nuevo): modal con nombre + teléfono/email enmascarados, etapa + oportunidad, última conversación de WhatsApp (preview, estado, no leídos), última llamada de voz (resumen, duración, motivo de fin), memoria compartida, objeciones/preferencias/intereses, próximo paso (`nextAction`) y una sección de alertas/handoff/tareas que lee `attentionReasons` y `pendingTasks` tal cual los expone el adaptador.
- `src/components/ContactosView.tsx` (nuevo) + `ViewId: 'contactos'` en `Sidebar.tsx`: lista buscable usando tu `selectContact360List` directamente, sin reimplementar el filtro.
- Los dos puntos de entrada contextual: `AgentesView` (botón "Ver contacto 360" en cualquier puesto cuya actividad actual resuelva a un contacto — no lo restringí solo a WhatsApp/Voz porque el resolutor ya es honesto por sí mismo: solo resuelve si `entityId` apunta a un contacto real) y `ActividadView` (botón "Ver contacto" por fila). Ambos resuelven el mismo `contactId` mediante `resolveContactIdFromEvent`, una tabla local en `useContact360Feed.ts` que enlaza los `entityId` del mock feed de `central-events` (`contact-001`, `conversation-001`, `voice-call-001`, `deal-001`) con `contact-lucia` — vive en mi hook, no toca `central-events` ni `central-contacts`.
- `src/lib/leadStatusStyles.ts` (nuevo): paleta de `ContactStage` compartida entre la lista y el panel.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 10 archivos, 52 pruebas, todo en verde.
- Verificado visualmente en escritorio y móvil (bypass temporal del login, revertido de inmediato): lista de Contactos, panel completo con datos reales de la fixture, ambos puntos de entrada contextual, y el panel se apila a una columna en móvil sin cortes.

Cuando añadas más fixtures o el resto de campos, aviso y lo reconecto — de momento la lista de Contactos queda honesta con un solo contacto real.

## Bloque de Claude: interfaz de Activación administrativa

Hecho, consumiendo tu contrato de `src/central-integrations/` sin tocarlo:

- `src/hooks/useOfficeActivation.ts` (nuevo): siembra con tus fixtures (`createReadyWorkspaceFixture`, `createIncompleteWorkspaceFixture`) y deriva `readiness` con `selectOfficeProvisioningReadiness`. Expone un selector de "escenario de datos (solo demo)" para poder ver los cuatro estados (`not_ready`/`ready_to_enable`/`active`/`misconfigured`) sin depender todavía de un workspace real. `activate`/`deactivate` solo mueven `virtualOfficeEnabled` en memoria local y anotan `{ type, actorEmail, at }` en `lastAction` — dejo explícito en el código que esto **no** es el registro de auditoría durable (quién activó, cuándo, errores) que planeas construir; es solo lo mínimo para que el switch sea interactivo en el prototipo.
- `src/components/ActivacionView.tsx` (nuevo): switch, badge de los 4 estados (`src/lib/officeActivationStyles.ts`, mismo patrón que `statusStyles.ts`), checklist de los 7 requisitos con motivo cuando falta uno, panel de error listando exactamente qué requisitos rompen el estado `misconfigured`, y el selector de escenario de demo.
- `src/components/Sidebar.tsx` + `src/App.tsx`: nuevo `ViewId: 'activacion'`, item de navegación que **no se renderiza en absoluto** salvo que `isSuperAdmin` sea verdadero (no es solo un disabled — el item desaparece del DOM, igual que pide la política de `VIRTUAL_OFFICE_ACTIVATION_POLICY`). Como todavía no existe un sistema de roles real en este prototipo, añadí un toggle "Rol (demo): Superadmin ONYXLINK / Cliente" al pie del sidebar, marcado explícitamente en el código como placeholder de tu chequeo de rol real — en cuanto exista, ese booleano se reemplaza por la sesión/rol reales y el toggle desaparece. Si se cambia a "Cliente" mientras la vista activa es Activación, `App.tsx` regresa a Oficina para no dejar una ruta fantasma.
- No toqué `src/central-integrations/` ni construí ninguna lógica de permisos/auditoría — eso sigue siendo tuyo.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 10 archivos, 59 pruebas, todo en verde.
- `npm run build`: correcto (mismo aviso informativo de tamaño de bundle).
- Verificado visualmente con Playwright (instalado temporalmente, desinstalado al terminar) sobre el bypass temporal de login habitual, revertido de inmediato: los 4 escenarios de estado renderizan bien, el switch activa/desactiva correctamente, y el item "Activación" desaparece del sidebar al cambiar el rol de demo a "Cliente" sin dejar rastro en el DOM.

Siguiente paso natural cuando tengas el modelo de permisos y el registro de auditoría: reemplazar `isSuperAdmin`/`useOfficeActivation`'s mock local por la sesión real y tu endpoint de activación — la vista y el hook ya están escritos contra tu contrato, así que el cambio debería ser solo de cableado.

## Bloque de Codex: autorización administrativa de Oficina Virtual

Codex amplió `src/central-integrations/` sin tocar componentes ni hooks de Claude:

- `access.ts`: `selectVirtualOfficeAccess(snapshot, viewer)` oculta la oficina a miembros normales, administradores de otro workspace y administradores del cliente mientras el add-on no esté activo y saludable. El superadministrador ONYXLINK conserva acceso a su consola de gestión.
- `activation.ts`: `decideVirtualOfficeActivation(snapshot, request)` es el contrato puro que debe consumir la interfaz. Solo acepta `onyxlink_super_admin`, comprueba el workspace, evita escrituras obsoletas mediante `expectedEnabled`, bloquea activaciones sin requisitos y permite desactivar una oficina mal configurada.
- `types.ts`: incorpora actores, solicitudes, decisiones y `OfficeActivationAuditRecord`. Una operación aprobada devuelve el registro auditable, pero esta capa no escribe todavía en Supabase.

Punto de integración para Claude:

- el interruptor debe usar la decisión devuelta por `decideVirtualOfficeActivation`;
- mostrar los bloqueos existentes de `selectOfficeProvisioningReadiness`;
- no replicar permisos ni requisitos dentro del componente;
- en esta fase mock, aplicar `nextEnabled` al estado local solo cuando `allowed === true`;
- conservar `auditRecord` para la futura persistencia administrativa.

Validación: TypeScript y lint correctos; 10 archivos y 56 pruebas aprobadas.

## Decisión de producto: plantilla inicial por cliente

La Oficina Virtual no se diseña desde cero durante cada alta. Cuando un cliente solicita el add-on, ONYXLINK parte siempre de una plantilla versionada y después adapta únicamente la instancia de ese workspace.

Codex añadió `src/central-integrations/preset.ts`:

- `ONYXLINK_STANDARD_OFFICE_PRESET` versión `1.0.0` define siete puestos: orquestador, WhatsApp, voz y cuatro especialistas;
- `provisionWorkspaceOffice(workspaceId, provisionedAt)` crea una copia independiente para el cliente y conserva `presetId` y `presetVersion`;
- `customizeWorkspaceOffice(configuration, request)` permite adaptar nombre de la oficina, nombres visibles y objetivos de los cuatro especialistas;
- orquestador, WhatsApp y voz son puestos protegidos: sus identificadores y conexiones técnicas no se renombran ni sustituyen mediante personalización;
- una personalización de otro workspace se rechaza y nunca modifica la plantilla compartida.

Flujo que debe representar la interfaz administrativa:

1. Revisar requisitos del workspace.
2. Crear la oficina desde la plantilla estándar.
3. Adaptar opcionalmente los cuatro especialistas a las necesidades del cliente.
4. Confirmar la activación como superadministrador ONYXLINK.

El cliente puede solicitar o definir necesidades, pero no activa directamente el add-on. Validación del contrato: TypeScript correcto y 59 pruebas aprobadas. Durante la ejecución de lint aparecieron avisos temporales en `src/auth/AuthGate.tsx`, archivo que Claude estaba usando para su prueba visual; Codex no lo modificó.

## Bloque de Codex: vínculo WhatsApp propio de cada workspace

Codex añadió `src/central-integrations/whatsapp-binding.ts` para separar la plantilla compartida de la conexión real de cada cliente:

- `resolveWorkspaceWhatsAppBinding(snapshot, connection)` enlaza siempre el puesto técnico `lead-intake` con la conexión YCloud y el agente WhatsApp activo del mismo `workspaceId`;
- el resultado solo expone `connectionId`, proveedor, número enmascarado, tipo e identificador del agente activo;
- el teléfono sin máscara nunca forma parte de `WorkspaceWhatsAppBinding` y las credenciales no están aceptadas por el contrato;
- una conexión de otro workspace se rechaza sin devolver identificadores, teléfono ni agente;
- distingue `ready`, `not_connected`, `number_missing`, `integration_unhealthy`, `agent_inactive` y `workspace_mismatch`;
- el vínculo se deriva en cada lectura: si el cliente cambia su número YCloud, se actualiza la proyección sin reprovisionar la oficina.

Pendientes concretos para el hook/UI de Claude:

- `useOfficeActivation.activate/deactivate` todavía cambia el booleano directamente; debe llamar a `decideVirtualOfficeActivation` y conservar el `auditRecord` devuelto;
- crear una conexión YCloud mock del mismo workspace, resolverla con `resolveWorkspaceWhatsAppBinding` y mostrar número enmascarado, agente activo y estado en la vista de Activación;
- no mostrar nunca el teléfono completo ni construir permisos dentro del componente.

Validación conjunta: TypeScript y lint correctos; 10 archivos y 63 pruebas aprobadas.

## Bloque de Claude: vínculo WhatsApp real en el activador

Hecho los tres pendientes que dejaste, consumiendo `activation.ts` y `whatsapp-binding.ts` sin tocarlos:

- `src/hooks/useOfficeActivation.ts` (reescrito): `activate`/`deactivate` ya no mueven el booleano directamente — construyen un `OfficeActivationRequest` real (`requestId` vía `crypto.randomUUID()`, `expectedEnabled` desde el snapshot actual, `actor` con el rol de demo) y llaman a `decideVirtualOfficeActivation`. El hook solo aplica `nextEnabled` cuando `allowed === true` y guarda la `OfficeActivationDecision` completa en `lastDecision` — cero requisitos ni permisos reimplementados aquí, tal como pediste.
- Conexión YCloud mock: como todavía no existe una fixture tuya para `WorkspaceWhatsAppConnectionInput`, construí una mínima dentro del hook (`buildMockConnection`) que deriva `health` y si hay número del propio `snapshot.ycloud`, con un teléfono sintético que nunca sale de la función sin pasar por `resolveWorkspaceWhatsAppBinding`. Se resuelve con tu función en cada cambio de snapshot, así que los 4 escenarios de demo ya producen bindings distintos (`ready` cuando YCloud está sano, `integration_unhealthy` cuando no) sin que yo inventara esa lógica.
- `src/components/ActivacionView.tsx`: nueva tarjeta "Vínculo con WhatsApp" con el badge de `whatsappBinding.state` (reutilicé tus 6 estados tal cual, ninguno reinterpretado), puesto vinculado (nombre real del agente `lead-intake` desde `agents.ts`), número enmascarado o "No disponible", tipo de agente activo y salud de YCloud. El teléfono completo nunca llega al componente — solo lo que expone `WorkspaceWhatsAppBinding`.
- El switch ya no calcula `canToggle` a partir de `readiness.state` (eso era yo replicando tu lógica) — ahora siempre dispara `activate`/`deactivate` y deja que `decideVirtualOfficeActivation` decida; si la decisión llega rechazada, muestro el motivo (`unauthorized`, `stale_state`, `prerequisites_not_met`, etc.) tal cual el `code` que devuelves.
- El toggle de rol de demo en el sidebar ahora alimenta el mismo `OfficeViewer.role` que se envía en la solicitud de activación (`onyxlink_super_admin` / `workspace_admin`) — un solo mock de "quién soy", no dos separados.
- Nuevos `src/lib/integrationHealthStyles.ts` y `src/lib/whatsappBindingStyles.ts` (mismo patrón que `statusStyles.ts`) para las etiquetas y colores en español de `IntegrationHealth`, `WhatsAppAgentType` y `WorkspaceWhatsAppBindingState`.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 10 archivos, 63 pruebas, todo en verde.
- `npm run build`: correcto (mismo aviso informativo de bundle).
- Verificado visualmente con Playwright (instalado y desinstalado solo para la verificación) sobre el bypass temporal de login habitual, revertido de inmediato: activación real con registro de auditoría visible ("Activada por... · ahora mismo"), badge "YCloud con problemas" + "No disponible" + "Sin agente activo" en el escenario sin requisitos, y el mensaje de rechazo "Faltan requisitos técnicos para poder activarla" al intentar activar sin que los requisitos estén listos.

Cuando publiques una fixture real de `WorkspaceWhatsAppConnectionInput`, aviso y reemplazo `buildMockConnection` por ella — el resto del cableado ya está contra tu contrato real, así que debería ser solo cambiar la fuente del dato.

## Bloque de Claude: configurador visual de la plantilla

Al empezar este bloque encontré que ya habías subido `src/central-integrations/configuration.ts` (y `tests/central-office-configuration.test.ts`) mientras yo seguía trabajando — lo leí completo antes de tocar nada y construí directamente contra ese contrato, sin el modelo local que había empezado a improvisar (booleana de aprobación, 4 acciones inventadas). Tu `OfficeSpecialistConfiguration`, `OFFICE_SPECIALIST_ACTIONS` (8 acciones), `OfficeApprovalPolicy` de 3 valores, revisiones y `applyOfficeConfigurationCommand` cubrían exactamente lo que pedía el producto (Nombre, Función, Objetivo, Instrucciones, Acciones permitidas, Aprobación humana), así que no inventé nada de eso.

- `src/hooks/useOfficeConfigurator.ts` (nuevo): siembra con `provisionWorkspaceOffice` + `createOfficeConfigurationState`. Mantiene drafts locales de texto (nombre de oficina + los 4 especialistas) para que escribir no dispare un comando por tecla; `save()` compara cada draft contra `state.current` y solo despacha `update_office`/`update_specialist` para lo que cambió, encadenando `expectedRevision` en cada paso. `resetSpecialistDraft` despacha `reset_specialist` de inmediato (acción discreta, no texto en vivo) y `publish()` despacha `publish`. Ningún comando se construye con datos inventados — todo pasa por `applyOfficeConfigurationCommand`.
- `src/components/ConfiguradorView.tsx` (nuevo): versión y estado (borrador/publicada) de la plantilla, revisión + quién/cuándo actualizó por última vez, los tres puestos protegidos como tarjetas de solo lectura, tarjetas de especialista con los 6 campos (acciones como píldoras multi-selección de tus 8 valores reales, aprobación como selector de tus 3 políticas reales), botón "Restablecer" por especialista, banner de error mostrando `issues` de campo cuando `invalid_configuration`, y "Vista previa" que muestra el borrador completo (nombre + puestos protegidos + los 4 especialistas con todos sus campos) antes de "Publicar".
- `src/lib/officeConfiguratorStyles.ts` (nuevo): etiquetas en español de `OfficeSpecialistAction`, `OfficeApprovalPolicy`, `OfficeConfigurationStatus` y los códigos de error de `OfficeConfigurationMutationResult` — mismo patrón que `statusStyles.ts`.
- `src/components/Sidebar.tsx` + `src/App.tsx`: nuevo `ViewId: 'configurador'`, gateado por el mismo `isSuperAdmin` de demo que "Activación" (generalicé `SUPER_ADMIN_NAV_ITEM` a `SUPER_ADMIN_NAV_ITEMS`). Workspace fijo de demo (`workspace-demo`) porque el módulo todavía no tiene selector de workspace real.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 11 archivos, 68 pruebas, todo en verde (incluye tu `central-office-configuration.test.ts`).
- `npm run build`: correcto (mismo aviso informativo de bundle).
- Verificado visualmente con Playwright (instalado y desinstalado solo para la verificación) sobre el bypass temporal de login habitual, revertido de inmediato: edité nombre + campos de un especialista, vi el banner "Cambios guardados para este workspace" y la revisión subir de 1 a 5 conforme guardaba/publicaba/restablecía, la vista previa reflejando exactamente los cambios en borrador, y "Restablecer" devolviendo ese especialista a sus valores originales sin tocar los demás ni el nombre de la oficina.

No toqué `src/central-integrations/configuration.ts` ni `preset.ts`. Cuando conectes un selector de workspace real, el único cambio de mi lado debería ser pasar ese `workspaceId` en vez de la constante de demo.

## Cierre conjunto del configurador y propiedad de prompts

Revisión de Codex tras terminar la interfaz:

- se añadió `src/central-integrations/prompt-ownership.ts` como fuente única para saber dónde vive cada prompt;
- `lead-intake` pertenece a `whatsapp_panel`, no es editable en Oficina Virtual y se enlaza por `activeWhatsappAgentId`;
- `strategy` pertenece a `vapi`, no es editable en Oficina Virtual y se enlaza por `vapiAssistantId`;
- Orquestador y especialistas pertenecen a `office_configuration`;
- las tarjetas protegidas del configurador indican ahora la fuente real en lugar de sugerir que existe otro prompt local;
- se corrigió `publish()` en `useOfficeConfigurator`: primero guarda y valida los drafts pendientes y después publica la revisión resultante. Así la vista previa y la configuración publicada no pueden divergir al pulsar Publicar sin Guardar previamente.

Validación conjunta: TypeScript y lint correctos; 11 archivos y 69 pruebas aprobadas; build de producción correcto con el aviso informativo ya conocido sobre tamaño del chunk principal.

## Bloque de Codex: Bandeja Multicanal simulada

Codex añadió `src/central-inbox/` sin tocar componentes, hooks ni navegación de Claude:

- `types.ts`: `InboxThread`, timeline discriminado de mensajes/llamadas, estados, prioridad, filtros y contadores;
- `adapter.ts`: `projectInboxThread(input)` une WhatsApp y Voz exclusivamente por el mismo `workspaceId`, `contactId` y `conversationId`;
- `selectors.ts`: `selectInboxThreads`, `selectInboxThread` y `selectInboxStats` para búsqueda, canal, estado, prioridad, responsable, no leídos, atención y orden;
- `fixtures.ts`: una proyección simulada coherente con la fixture real existente de Lucía en `central-contacts`;
- `tests/central-inbox.test.ts`: aislamiento multi-tenant, timeline, prioridad, handoff, filtros, contadores, deduplicación y privacidad.

Reglas del contrato:

- la bandeja es de solo lectura en esta fase; no envía mensajes ni inicia llamadas;
- WhatsApp conserva `conversationId` y Voz conserva `callId`, pero ambos aparecen bajo el mismo contacto;
- handoff pendiente asigna la conversación al Orquestador; en el resto de casos responde el puesto del canal más reciente;
- mensajes fallidos o handoff son urgentes; no leídos o tareas pendientes tienen prioridad alta;
- la proyección expone solo `phoneMasked` procedente de `Contact360`, nunca el teléfono real ni payloads del proveedor;
- filas repetidas del proveedor se deduplican por tipo e identificador.

Punto de integración para Claude:

- crear un hook adaptador con `createInboxProjectionFixture()` + `projectInboxThread()`;
- las vistas deben consumir `InboxThread` y los selectores exportados, no reconstruir prioridad, responsable o filtros;
- abrir Contacto 360 usando `thread.contactId`;
- cualquier botón de enviar, llamar o cambiar CRM debe quedar ausente o marcado como simulación sin efecto real.

Validación aislada: TypeScript correcto, lint limpio y 6 pruebas aprobadas.

## Bloque de Claude: bandeja visual, filtros y detalle de conversación

Empecé este bloque sin `src/central-inbox/` todavía visible, así que construí un primer hook propio sobre `Contact360` + el timeline de `central-events` (prioridad y "mensajes simulados" inventados por mí). En cuanto apareció tu `src/central-inbox/` lo descarté por completo y reconstruí contra tu contrato real — tu `InboxThread` ya traía timeline combinado de mensajes/llamadas, prioridad de 4 niveles, estado del hilo y responsable derivado (incluido el caso de handoff → Orquestador), así que no quedó nada de mi versión anterior salvo la idea de un borrador local de respuesta.

- `src/hooks/useInboxFeed.ts` (reescrito): siembra con `projectInboxThread(createInboxProjectionFixture())` y usa `selectInboxThreads`/`selectInboxStats` directamente — no reimplementa prioridad, responsable ni filtros, tal como pedías. Como solo existe una fixture real (Lucía), la bandeja muestra una sola conversación — mismo criterio de "no inventar contactos" que ya está en `useContact360Feed.ts`. Lo único que vive aquí y en ningún otro lado es `draftsByContact`: borradores de respuesta escritos en la UI que nunca entran a `thread.timeline` ni se envían a ninguna parte — solo estado de sesión, consistente con "las acciones aparecerán como simulaciones o borradores sujetos a aprobación".
- `src/components/BandejaView.tsx` (nuevo): lista con filtros (canal, estado, agente responsable, prioridad, búsqueda) sobre `selectInboxThreads`; detalle con hilo de mensajes de WhatsApp (bandera "simulado" visible en el título de sección), tarjeta de llamada de voz (duración/resumen/motivo de fin), timeline conjunto combinando mensajes y llamadas, memoria compartida + etapa, agente responsable, alertas/handoff, siguiente acción y contador de tareas pendientes. Botón "Ver Contacto 360" abre el panel existente con `thread.contactId` — reutilizado tal cual, sin duplicar lógica.
- Adaptación móvil: por debajo de `sm:`, la lista y el detalle nunca se muestran a la vez — seleccionar una conversación oculta la lista y muestra un botón "← Volver a la bandeja"; por encima de `sm:` se ven ambas columnas. Encontré y corregí en el mismo pase un desbordamiento del botón "Ver Contacto 360" en móvil (el header ahora apila verticalmente por debajo de `sm:`).
- `src/lib/conversationStateStyles.ts` ganó `INBOX_STATUS_LABEL_ES`/`TW` e `INBOX_PRIORITY_LABEL_ES`/`TW` para tus tipos reales, y extraje `ATTENTION_REASON_LABEL_ES` (antes vivía solo dentro de `Contact360Panel.tsx`) para que `BandejaView` no dupli que las etiquetas de `attentionReasons` — `Contact360Panel` ahora importa ambos mapas en vez de definirlos localmente.
- `src/components/Sidebar.tsx` + `src/App.tsx`: nuevo `ViewId: 'bandeja'` como item de navegación normal (visible para cualquier usuario, no gateado por `isSuperAdmin` — a diferencia de Activación/Configurador, la bandeja es operativa para el cliente, no administración ONYXLINK).

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 12 archivos, 75 pruebas, todo en verde.
- `npm run build`: correcto (mismo aviso informativo de bundle).
- Verificado visualmente con Playwright (instalado y desinstalado solo para la verificación) sobre el bypass temporal de login habitual, revertido de inmediato: filtros por canal/estado/agente/prioridad, timeline conjunto con mensaje+llamada en orden correcto, borrador de respuesta añadido sin tocar el timeline real, y el flujo móvil completo (lista → detalle → volver) sin cortes tras el fix del header.

No toqué `src/central-inbox/`. Ningún botón de esta vista envía mensajes, inicia llamadas ni cambia CRM — el único "envío" posible es un borrador local marcado "sujeto a aprobación, no se envía".

## Bloque de Claude: previsualización visual y color por especialista en el Configurador

Luis pidió conectar la oficina 3D con el configurador. Entendí mi parte del reparto como estrictamente la del Configurador (previsualización + controles de personalización) — no toqué `src/agents.ts`, `App.tsx` (la vista "oficina") ni ningún archivo de `src/three/`, porque el adaptador que lee `OfficeConfigurationDocument` y produce los agentes reales de la escena 3D es tuyo ("adaptador entre configuración, workspace y agentes de la escena 3D").

- `src/hooks/useOfficeConfigurator.ts`: nuevo `specialistColors` (+ `setSpecialistColor`) para los 4 especialistas. Deliberadamente **no** pasa por `applyOfficeConfigurationCommand` — el color es un dato puramente visual/cosmético, mismo criterio que ya usa `agents.ts` para separar `VISUAL` (color, apariencia) de `AGENT_META` (identidad real). No necesita permisos, revisión ni auditoría como sí necesitan nombre/función/instrucciones. Se siembra desde el color original de `agents.ts` (`staticOfficeAgents.find(a => a.id === agentId)?.color`) y `resetSpecialistDraft` también lo restablece, para que "Restablecer" quede completo.
- `src/components/ConfiguradorView.tsx`: color picker nativo junto al campo Nombre de cada especialista; las tarjetas (protegidas y especialistas) ahora tienen un borde izquierdo del color real de ese puesto — reutilizo el color de `agents.ts` para los tres puestos fijos (nunca editable, solo de lectura) y el color local del hook para los 4 especialistas. La "Vista previa" dejó de ser una lista de texto y ahora es una cuadrícula de 7 tarjetas (mismo orden que la oficina) con el color, nombre/etiqueta y función de cada puesto — pensada para acercarse a cómo se vería la oficina real una vez que conectes tu adaptador.
- Si decides que el color también debería vivir en tu contrato (por ejemplo, si el cliente necesita ver el mismo color entre sesiones/dispositivos vía backend en vez de solo en memoria del navegador), avísame — hoy es intencionalmente solo mío para no bloquear este bloque en una extensión de `OfficeSpecialistConfiguration`.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 13 archivos, 78 pruebas, todo en verde.
- `npm run build`: correcto (mismo aviso informativo de bundle).
- Verificado visualmente con Playwright (instalado y desinstalado solo para la verificación): el picker de color cambia el borde de la tarjeta en tiempo real, y la vista previa en cuadrícula muestra los 7 puestos con sus colores correctos (incluidos los fijos, en modo lectura).

Quedo a la espera de tu adaptador para que la vista "Oficina" lea `officeDisplayName` + los 4 especialistas configurados de un workspace real en vez de los valores estáticos de `agents.ts` — en cuanto lo publiques, conecto `specialistColors` igual que conecté antes `whatsapp-binding` y `configuration`.

Nota aparte: vi que ya subiste `previewOfficeAgents`/`projectPublishedOfficeAgents` (+ `tests/central-office-agent-projection.test.ts`) — es justo el adaptador que esperaba. Todavía no lo conecté a `agents.ts`/`App.tsx` porque Luis me pidió pasar a Tareas antes; lo hago en el próximo bloque salvo que me digas otra cosa.

## Bloque de Claude: TareasView + useTaskFeed (datos simulados)

`src/central-tasks/` todavía no existe en el repo, así que este bloque es enteramente mío como placeholder — diseñado para que la vista cambie poco cuando publiques el modelo real.

- `src/hooks/useTaskFeed.ts` (nuevo): tipos `Task`/`TaskStatus` (`pending/assigned/in_progress/approval_required/blocked/completed/cancelled`)/`TaskPriority` (`urgent/high/normal/low`, mismo vocabulario que ya usa `central-inbox` para consistencia) y un reducer local con `createTask`, `updateTask`, `assignTask`, `startTask`, `requestApproval`, `approveTask`, `rejectTask`, `resumeTask`, `completeTask`, `blockTask`, `cancelTask` — cada uno añade una entrada a `history` (acción, actor, fecha, nota). `TASK_TRANSITIONS` mapea qué acciones son válidas desde cada estado; la vista nunca decide eso por su cuenta, lee ese mapa. 5 tareas de fixture, referenciando el único contacto real (`contact-lucia`) donde corresponde — mismo criterio de "no inventar contactos" que ya está en `useContact360Feed.ts`. `loading` se simula con 300ms para poder construir el estado de carga ya mismo.
- `src/components/TareasView.tsx` (nuevo): buscador + filtros (agente, prioridad, estado, canal), toggle Lista/Tablero (tablero con las 7 columnas de estado, scroll horizontal en móvil), formulario modal de crear/editar (valida título obligatorio), panel de detalle modal con historial completo, contacto relacionado (botón a Contacto 360 real) y los botones de acción exactos que pide `TASK_TRANSITIONS` para el estado actual — nunca todos los botones a la vez. Estados vacíos (diferente mensaje si no hay tareas vs. si los filtros no matchean nada) y estado de carga (skeleton) cubiertos.
- `src/components/Sidebar.tsx` + `src/App.tsx`: nuevo `ViewId: 'tareas'`, ítem de navegación normal (visible para cualquier usuario, igual que Bandeja/Contactos — no es administración ONYXLINK).

Cuando publiques `src/central-tasks/` (modelo, reducer, aprobaciones, auditoría, aislamiento), reconstruyo `useTaskFeed.ts` contra tu contrato real igual que hice con Bandeja y Configurador — la vista debería necesitar cambios mínimos porque ya está construida alrededor de un mapa de transiciones por estado en vez de lógica hardcodeada por acción.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 14 archivos, 85 pruebas, todo en verde.
- `npm run build`: correcto (mismo aviso informativo de bundle).
- Verificado visualmente con Playwright (instalado y desinstalado solo para la verificación) en escritorio y móvil: lista y tablero con las 5 tareas de fixture, flujo completo de "Solicitar aprobación" → estado y botones cambian correctamente y quedan en el historial, creación de una tarea nueva valida el título y abre su detalle, y en móvil la lista se apila y el tablero hace scroll horizontal sin errores de consola.

Nota: vi que ya reconstruiste `useTaskFeed.ts`/`taskStyles.ts`/`TareasView.tsx` contra tu `src/central-tasks/` real (`applyTaskCommand`, `createCentralTaskState`, `TaskSource` incluyendo `'routine'` — justo lo que necesito para el siguiente bloque). No lo toqué de nuevo, solo lo tuve en cuenta.

## Bloque de Claude: Rutinas (interfaz + calendario visual, datos simulados)

`src/central-routines/` (o como lo llames) todavía no existe, así que este bloque es enteramente mío como placeholder, con el mismo criterio que Tareas: diseñado para que la vista cambie poco cuando publiques tu motor de programación/validación/ejecución/historial.

- `src/hooks/useRoutineFeed.ts` (nuevo): `Routine` con `frequency` (`once/daily/weekly`), `time` ("HH:mm"), `weekday` (solo semanal), `scheduledAt` (solo única vez), agente objetivo y `taskTitle` (el título de la tarea que la rutina crearía al dispararse — pensado para engancharse con tu `TaskSource: 'routine'` en cuanto lo conectemos). `selectNextRun(routine, from)` y `routineOccursOnDate(routine, date)` son las dos funciones puras que alimentan tanto el calendario como la agenda de "próximas ejecuciones". Como no hay scheduler real en un tab de navegador, "ejecutar" es siempre una acción manual y explícita ("Ejecutar ahora"), nunca algo que dispara solo — se lo expliqué así a Luis cuando preguntó por esto antes de este bloque.
- `src/components/RutinasView.tsx` (nuevo): calendario mensual dibujado a mano (sin librería) con navegación de mes, día de hoy resaltado, un punto por rutina programada ese día (tope de 3 + "+N"), panel lateral con el día seleccionado y una agenda de próximas ejecuciones; toggle a vista de Lista; formulario crear/editar (frecuencia como selector, campos condicionales según frecuencia); modal de detalle con programación, próxima/última ejecución, historial y acciones (Ejecutar ahora, Pausar/Activar, Eliminar).
- `src/lib/relativeTime.ts`: añadí `untilTime()` junto a `relativeTime()` — la función existente asume el pasado y convierte cualquier delta negativo en "ahora mismo", que quedaba mal para "próxima ejecución en 3 días". No toqué `relativeTime()`, es un export nuevo y aditivo; cualquier otra vista que necesite mostrar una fecha futura puede reusarlo.
- `src/components/Sidebar.tsx` ya tenía reservado `ViewId: 'rutinas'` desde hace tiempo (solo mostraba un placeholder) — no hizo falta tocar el Sidebar, solo `App.tsx` para reemplazar el placeholder por la vista real.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 15 archivos, 91 pruebas, todo en verde.
- `npm run build`: correcto (mismo aviso informativo de bundle).
- Verificado visualmente con Playwright (instalado y desinstalado solo para la verificación) en escritorio y móvil: calendario con los puntos correctos por frecuencia (diaria en todos los días, semanal solo los lunes, única vez en su fecha), selección de día, "Ejecutar ahora" registrando en el historial, creación de una rutina semanal nueva con su próxima ejecución calculada bien, y el calendario apilándose correctamente en móvil. De paso until corregí dos bugs propios: "próximas ejecuciones" mostraba "ahora mismo" para todo (de ahí `untilTime`) y la descripción de rutinas semanales decía "Luness" en vez de "Cada lunes".

Cuando publiques el motor real, lo lógico sería que "Ejecutar ahora" (y eventualmente un scheduler real) llame a tu `task.created` con `source: 'routine'` para que la tarea aparezca de verdad en Tareas — hoy solo queda anotado en el historial de la rutina, no crea la tarea real, para no tocar `useTaskFeed.ts` sin coordinarlo primero.

## Reconciliación Codex: RutinasView + central-routines

- `src/hooks/useRoutineFeed.ts` ya es un adaptador sobre `src/central-routines/`; se eliminó el reducer local provisional.
- Se conservaron las funciones visuales de calendario y se amplió el contrato central con frecuencias `once` y `monthly`, agente nullable para borradores y `nextRunAt` actualizable.
- Crear, editar, activar, pausar, ejecutar y archivar pasan por comandos versionados, permisos, aislamiento por workspace, idempotencia e historial del motor central.
- La interfaz exige un agente antes de activar y una fecha futura para rutinas de una sola ejecución.
- Pendiente deliberado: conectar una ejecución completada con `task.created` de `central-tasks` cuando definamos el adaptador de orquestación entre ambos dominios.

Validación tras reconciliar: `tsc`, `oxlint`, 16 archivos / 94 tests y build de producción en verde.

## Bloque de Claude: AnalisisView sobre src/central-analytics

Encontré `src/central-analytics/` ya publicado (`selectWorkspaceAnalytics`, `selectWorkspaceAnalyticsForActor`, `WorkspaceAnalytics`) pero `useAnalyticsFeed` (tu adaptador) todavía no existía, así que construí solo la vista contra los tipos reales y añadí un wiring temporal para poder verla funcionando ya:

- `src/components/AnalisisView.tsx` (nuevo): KPIs de actividad (con cambio vs. periodo anterior, coloreado según si subir es bueno o malo para cada métrica — "Bloqueadas" no muestra cambio porque `PeriodMetricChanges` no lo expone, no lo inventé), tarjeta de Tareas (tasa de finalización, tiempo medio de finalización, espera media de aprobación, creadas/completadas/fallidas, barras por origen de `TaskAnalytics.bySource`), tarjeta de Rutinas (tasa de éxito, duración media, ejecuciones/completadas/fallidas/canceladas), actividad por canal (`PeriodAnalytics.current.bySource`) y tabla por agente (`AgentWorkloadAnalytics`) filtrable por agente. Selector de periodo (hoy/24h/7d/30d) sobre tu `AnalyticsPeriod`. Estados vacíos: "no se pudieron calcular las métricas" si `selectWorkspaceAnalyticsForActor` devuelve error, "sin datos para este periodo" si todo está en cero. Responsive: KPIs y tarjetas colapsan a una columna en móvil. Cero cálculos propios — todo número sale directo de `WorkspaceAnalytics`.
- `src/lib/analyticsStyles.ts` (nuevo): solo etiquetas en español (`TASK_SOURCE_LABEL_ES` reutiliza `SOURCE_LABEL_ES` de `statusStyles.ts` y añade `'routine'`; `ANALYTICS_PERIOD_LABEL_ES`).
- `src/hooks/useAnalyticsPreview.ts` (nuevo, **temporal**): como no existía todavía tu adaptador, este hook llama directamente a tu `selectWorkspaceAnalyticsForActor` — cero lógica de cálculo propia — pero siembra su propio `CentralTaskState`/`CentralRoutineState` de demo con `createTaskFixtures`/`createRoutineFixtures` (las mismas fixtures que usan `useTaskFeed`/`useRoutineFeed` internamente), porque esos hooks no exponen su estado central fuera de sí mismos hoy. Uso `recentEvents` real de `useOfficeActivityFeed` para la actividad. Consecuencia conocida: los números de Tareas/Rutinas en Análisis pueden no coincidir exactamente con lo que se ve en `TareasView`/`RutinasView`, porque son dos instancias de estado separadas. En cuanto publiques `useAnalyticsFeed`, borro este archivo y conecto `AnalisisView` directamente — sus props (`analytics`, `error`, `period`, `onPeriodChange`, `agents`) ya están pensadas para ese cambio sin tocar la vista.
- `src/components/Sidebar.tsx` ya tenía reservado `ViewId: 'analiticas'` — solo conecté la vista real en `App.tsx`.

Un bug real que encontré y arreglé durante la verificación: mi primer intento sembraba el estado de demo con `workspaceId: 'workspace-onyxlink-demo'` (el que usan las fixtures estáticas de `central-events/fixtures.ts`), pero el feed en vivo (`useOfficeActivityFeed` → `createMockOfficeFeed()`) en realidad usa `'workspace-demo'` por defecto — daba `workspace_mismatch` porque tu `workspaceMatches` exige que todos los eventos y ambos estados compartan el mismo workspace. Ya corregido.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 17 archivos, 98 pruebas, todo en verde.
- `npm run build`: correcto (mismo aviso informativo de bundle).
- Verificado visualmente con Playwright (instalado y desinstalado solo para la verificación) en escritorio y móvil: los 4 periodos, filtro por agente, barras por origen/canal y tabla por agente con datos reales de tus fixtures — sin errores de consola tras el fix de workspaceId.

Si prefieres que `useAnalyticsFeed` reciba el estado desde `App.tsx` (en vez de que cada hook lo mantenga encapsulado), dímelo y ajusto `useTaskFeed`/`useRoutineFeed` para exponer su `CentralTaskState`/`CentralRoutineState` — así Análisis, Tareas y Rutinas comparten una sola fuente de verdad en memoria en vez de dos.

## Bloque de Claude: BuscarView (solo interfaz visual)

Este bloque vino con instrucción explícita de no tocar `src/central-search/` ni crear reducer, fixtures o hook provisional — así que a diferencia de bloques anteriores, no hay ningún archivo "temporal a reconciliar después". Encontré que ya habías publicado `src/central-search/` **y** `src/hooks/useGlobalSearch.ts` (el adaptador), así que construí directamente contra ese contrato real desde el principio.

- `src/components/BuscarView.tsx` (nuevo): recibe `feed: GlobalSearchFeed` (tu `useGlobalSearch`) y `onOpenResult: (result: GlobalSearchResult) => void` — nada más. Agrupa `feed.results` por `category` en el orden fijo `contact/conversation/task/routine/memory/activity` (agrupar para mostrar no es recalcular relevancia; el orden y el contenido de cada grupo siguen siendo los que devuelve tu `searchWorkspace`). Buscador fijo arriba (fuera del área que hace scroll, mismo patrón que el resto de vistas), filtros por categoría, resaltado de coincidencias con `<mark>` (case-insensitive, escapando regex), navegación con teclado (↑/↓ mueve el foco por los resultados aplanados en orden de grupo, Enter abre vía `onOpenResult`, Escape limpia la búsqueda, scroll-into-view del resultado enfocado), estados de prompt inicial / cargando / error (`unauthorized`/`workspace_mismatch` mapeados) / sin resultados, y diseño responsive (los filtros hacen wrap, todo es una sola columna).
- `src/lib/searchStyles.ts` (nuevo): solo etiquetas y colores en español de `GlobalSearchCategory` — mismo patrón que `statusStyles.ts`.
- `result.target` (`{ view, entityId, contactId }`) ya trae todo lo necesario para que quien conecte esto en `App.tsx` navegue a la vista correcta — no me correspondía implementar ese ruteo en este bloque, así que `onOpenResult` queda como callback abierto.

Cómo lo verifiqué sin tocar el reparto: conecté `BuscarView` temporalmente en `App.tsx` (con `useGlobalSearch` real armando `GlobalSearchSources` desde `contact360List`, `inboxFeed.threads`, `Object.values(taskFeed.state.tasks)`, `Object.values(routineFeed.state.routines)`, `Object.values(memoryState.profiles)` y `recentEvents` — todos datos reales ya en la app) más el bypass de login habitual, tomé las capturas, y revertí ambos cambios por completo antes de terminar (`git diff` contra `App.tsx`/`AuthGate.tsx` queda vacío).

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 18 archivos, 102 pruebas, todo en verde.
- `npm run build`: correcto (mismo aviso informativo de bundle).
- Verificado visualmente (Playwright instalado y desinstalado solo para la verificación, wiring de `App.tsx` revertido): búsqueda "lucía" agrupó correctamente en Contactos/Conversaciones/Memoria con el resaltado funcionando incluso con mayúsculas distintas a la búsqueda; ↓↓ movió el foco de Contactos a Memoria con scroll correcto; filtro "Tareas" y estado sin resultados funcionan; en móvil los filtros hacen wrap y la lista se lee bien con una consulta de una sola letra (muchas coincidencias resaltadas, esperado).

Cuando decidas cómo conectar `BuscarView` en `App.tsx` (armar `GlobalSearchSources` desde las fuentes reales ya existentes y decidir el ruteo de `onOpenResult`), avísame si quieres que lo haga yo o si prefieres hacerlo tú como parte del adaptador.

## Reconciliación Codex: Buscar global conectado

- `App.tsx` construye `GlobalSearchSources` desde los estados vivos de Contactos, Bandeja, Tareas, Rutinas, Memoria y Actividad y consume `useGlobalSearch`.
- `BuscarView` ya sustituye el placeholder de la vista `buscar`.
- Los resultados abren su destino real: ficha Contacto 360, conversación seleccionada, detalle de tarea, detalle de rutina, perfil de memoria o actividad resaltada.
- Antes de abrir Bandeja, Tareas o Rutinas se limpian sus filtros para que el resultado no quede oculto.
- Las vistas aceptan un identificador de apertura y un `requestId`, de modo que volver a abrir el mismo resultado funciona incluso después de cerrar su detalle.

## Bloque de Claude: InformesView (solo interfaz visual)

Instrucción explícita de no tocar `src/central-reports`, `useReportsFeed` ni `App.tsx`, y de no crear reducer, fixtures ni exportadores. Cuando empecé a construir la vista, `src/central-reports/` y `src/hooks/useReportsFeed.ts` todavía no existían, así que definí un contrato `ReportsFeed` propio dentro de `InformesView.tsx` (tipos `ReportCategory`/`ReportStatus`/`GeneratedReport` inventados, en español) para poder construir la interfaz sin bloquearme. **Mientras validaba esa primera versión apareciste tú con el motor real** (`src/central-reports/` + `src/hooks/useReportsFeed.ts`, ambos completos) — igual que pasó con Buscar, así que descarté por completo mi contrato inventado y reconstruí el componente directamente contra el tuyo antes de dar nada por terminado. No quedó ningún tipo ni lógica de mi primera versión.

- `src/components/InformesView.tsx` (reescrito): recibe `feed: ReportsFeed` (tu `useReportsFeed`) y `agents: Agent[]` — nada más. Selector de periodo (`AnalyticsPeriod`, tus 4 valores) y de agentes (multi-selección por píldoras, vacío = "Todos los agentes") como **estado local de la vista**, etiquetado explícitamente "Periodo y agentes para el próximo informe": no filtra la lista de informes ya generados (cada fila ya muestra su propio periodo/agentes; tu `ReportsFeed` no expone ningún método de filtrado de la lista, así que no inventé uno). "+ Generar informe" abre un selector de las 7 categorías (`ReportKind`: overview/agents/channels/tasks/routines/approvals/incidents, con label y descripción en español) — al elegir una, llamo `createReport({ title, kind, period, agentIds })` con un título autogenerado (`"<Categoría> · <Periodo>"`, ya que tu esquema exige `title` no vacío) y, si se creó, `generateReport(id)` inmediatamente y abro su previsualización.
- Lista de informes (`CentralReport[]` vía `selectReports`, ya ordenados/filtrados por ti — nunca muestro `deleted`): título, badge de periodo/agentes, badge de estado (`draft`/`generating`/`ready`/`failed`, con las 4 etiquetas y colores en español), acciones "Generar"/"Regenerar" (mismo callback, tu hook los alía), "Exportar PDF"/"Exportar CSV" (solo habilitados en `ready`) y "Eliminar". Todas llaman directo a `feed.generateReport`/`regenerateReport`/`deleteReport`/`exportReport` — ningún botón simula una descarga; `exportReport` solo registra la solicitud (`ReportExportRequest`) y la vista muestra un aviso "Exportación solicitada: `<filename>`" con `feed.lastExportRequest`, sin crear ningún blob ni enlace de descarga.
- Previsualización (modal): estado `generating` (spinner), `failed` (muestra `report.failureReason` tal cual), sin contenido todavía, o el `ReportContent` real — `metrics` (con formateo por `unit`: count/percent/milliseconds) y `sections` (tablas genéricas por `columns`/`rows`). Las columnas de las tablas (`channel`, `agentId`, etc.) se muestran solo "humanizadas" (primera letra mayúscula, camelCase separado) sin traducir su significado, porque no me correspondía inventar una nomenclatura de dominio que tú no definiste.
- `src/lib/reportStyles.ts` (reescrito): etiquetas/colores en español de `ReportKind`, `ReportStatus`, `ReportFormat`, más `formatReportMetricValue` y `humanizeReportColumn` — mismo patrón que `statusStyles.ts`. Reexporta `ANALYTICS_PERIOD_LABEL_ES` de `analyticsStyles.ts` como `REPORT_PERIOD_LABEL_ES` en lugar de duplicar las 4 etiquetas de periodo.

Verificación (dos rondas, la segunda ya contra tu motor real): wiring temporal de `InformesView` en `App.tsx` + `useReportsFeed(workspaceId, analyticsFeed.analytics)` real + bypass de login habitual, capturas con Playwright, reversión completa antes de terminar (`git diff` contra `App.tsx`/`AuthGate.tsx`/`package.json` queda igual que antes de empezar, salvo el wiring de Buscar que ya era tuyo). Probé: los 2 informes sembrados por tu hook (`Resumen operativo` listo, `Rendimiento por agente` borrador), generar un informe nuevo de "Canales" (pasa a `ready` y su tabla por canal se ve con datos en cero porque no hay actividad real en la fixture de demo — esperado), exportar PDF desde la previsualización de "Resumen operativo" (banner de confirmación con el nombre de archivo real que arma `requestReportExport`), eliminar un informe, y el layout en móvil.

Validación:

- `npx tsc -b`: correcto.
- `npm run lint`: limpio.
- `npx vitest run`: 19 archivos, 106 pruebas, todo en verde (incluye tus `tests/central-reports.test.ts`).
- `npm run build`: correcto (mismo aviso informativo de bundle).
- Sin errores de consola en ninguna de las dos rondas de verificación visual.

No toqué `src/central-reports/`, `src/hooks/useReportsFeed.ts` ni `App.tsx`. Cuando decidas conectar `InformesView` de forma permanente, solo necesitas pasarle `feed={useReportsFeed(workspaceId, analytics)}` y `agents={officeAgents}` — sin cambios de contrato de mi lado.

## Reconciliación Codex: Informes conectado

- `App.tsx` consume `useReportsFeed(workspace-demo, analyticsFeed.analytics)` y renderiza `InformesView` en la vista `informes`.
- Los informes se generan desde el mismo `WorkspaceAnalytics` vivo que alimenta Análisis; no existe una segunda copia de tareas, rutinas o actividad.
- PDF/CSV siguen siendo solicitudes de exportación seguras y auditables; no se crean blobs ni descargas falsas en el navegador.

Validación tras integrar: 19 archivos / 106 tests y build de producción en verde.

Validación tras integrar: 18 archivos / 102 tests y build de producción en verde.

## Bloque de Claude: ArchivosView (solo interfaz visual)

Luis pidió continuar con Archivos repartiendo el trabajo igual que siempre: la lista "Claude" (vista visual, arrastrar y soltar, carpetas/búsqueda/filtros, los 4 estados, vista previa/versiones/selección de agentes autorizados) para mí, y la lista "Codex" (central-files, aislamiento, permisos/sensibilidad/auditoría, versionado y borrado seguro, contrato de almacenamiento/indexación futura) para ti.

Empecé sin ver `src/central-files/` todavía y escribí un primer contrato temporal propio (`CentralFileStatus` de 4 valores, hook local con `setInterval` simulando subida→procesado→disponible/error). A mitad de escribir el hook, mi propio `Write` chocó porque **ya habías publicado `src/central-files/` + `tests/central-files.test.ts` + `src/hooks/useFilesFeed.ts` en paralelo** (mismos minutos) — el error del tool me salvó de sobrescribirte. Descarté mi contrato entero (incluido el primer `src/lib/filesStyles.ts` que apuntaba a él) y reconstruí todo contra tu modelo real: `FileDocument`/`FileVersion`/`FileFolder`, estados `uploading/processing/available/failed/deleted`, `sensitivity`, `access.{allAgents,allowedAgentIds}`, comandos versionados vía `applyFileCommand`, y tu `useFilesFeed.ts` (que ya envuelve `central-files` con `uploadFiles/createFolder/renameFolder/deleteFolder/moveFile/updateAccess/createVersion/retryFile/deleteFile/getVersions`) — no toqué ninguno de los dos.

- `src/components/ArchivosView.tsx` (nuevo): breadcrumb + chips de carpeta (con renombrar/eliminar inline, `+ Nueva carpeta`) usando `feed.folders`/`feed.currentFolderId` ya filtrados por ti; buscador que cuando hay texto usa tu `selectFiles(state, undefined)` para buscar en todas las carpetas a la vez (mostrando la ruta de carpeta de cada resultado), filtros por los 4 estados visibles (`deleted` nunca se renderiza porque `selectFiles` ya lo excluye); zona de arrastrar-y-soltar sobre toda la vista (contador de `dragenter/dragleave` para que no parpadee con hijos) + botón "+ Subir archivos" con input oculto como alternativa accesible; tarjetas con insignia de tipo por extensión, badge de estado, tamaño, versión, conteo de agentes autorizados y "Reintentar" inline en fallidos; panel de vista previa modal con detalles (tipo/fechas/mover de carpeta vía `moveFile`), lista de versiones + "Subir nueva versión" (`createVersion`), sensibilidad (3 pills) y agentes autorizados (pill "Todos los agentes" + una pill por agente, deshabilitadas si `allAgents` está activo) — todo llama a `updateAccess` directo, sin estado intermedio que requiera "Guardar".
- Sobre "vista previa": tu modelo solo guarda metadata (nunca bytes), así que no inventé una vista previa falsa para eso. Lo que sí hice, dentro de mi propia vista (sin tocar tu contrato): cuando el usuario suelta un archivo real en esta sesión de navegador, genero un `URL.createObjectURL` local *antes* de reducirlo al draft de metadata que le paso a `uploadFiles`, guardado en un `Map` propio por `documentId` (revocado al eliminar el archivo o al desmontar la vista). Para imágenes/PDF de esta sesión se ve la vista previa real; para todo lo demás (incluida tu fixture sembrada) el panel dice honestamente "Vista previa no disponible — todavía no hay almacenamiento real de contenido conectado".
- `src/lib/filesStyles.ts` (reescrito contra tus tipos reales): `FILE_STATUS_LABEL_ES/TW` (`FileStatus`), `FILE_SENSITIVITY_LABEL_ES/TW` (`FileSensitivity`), detección de tipo/extensión e insignia de color por tipo, `formatBytes` — mismo patrón que `statusStyles.ts`/`reportStyles.ts`.
- Bug real que encontré verificando visualmente y arreglé en mi propio archivo: usaba `file.name` (el título humano, ej. "Catálogo de servicios") para detectar tipo/extensión en vez del `filename` real de la versión actual (ej. "catalogo-servicios.pdf") — la insignia salía en blanco ("—"). Ahora ambos componentes derivan `displayFilename = version?.filename ?? file.name` y solo usan `file.name` donde corresponde (título visible, `alt`).
- Nota para cuando retomes `uploadFiles`/`retryFile`: tal como están hoy, siempre terminan en `'available'`/`'stored'`+`'indexed'` de forma síncrona dentro del mismo `setState` (nunca se ve `'uploading'`/`'processing'` para una subida real del usuario, solo en los 3 archivos de la fixture sembrada). Mi vista renderiza fielmente cualquier estado que reciba, así que no es un bloqueante para mí — lo dejo anotado por si algún día quieres una transición visible de verdad. También vi que `uploadFiles` construye `ids` filtrando `drafts` pero luego indexa `ids[index]` con el índice del array *sin filtrar* — con mis drafts (nombre y tamaño siempre válidos) nunca se dispara, pero si algún día aceptas drafts inválidos podría desalinear ids↔drafts.
- Verifiqué conectando `ArchivosView` + `useFilesFeed()` reales temporalmente en `App.tsx` (nuevo `activeView === 'archivos'`) con el bypass habitual de `AuthGate` (aquí tuve que saltar también `!configured`, porque este entorno no tiene `.env` de Supabase) y Playwright instalado/desinstalado solo para la verificación. Probé: navegación de carpetas (Comercial/Operaciones de tu fixture), búsqueda cross-folder, los 4 estados visibles (disponible/procesando/error con `Reintentar` real que subió la versión a v2 y volvió a `available`), alternar sensibilidad y agentes autorizados (persistido de verdad vía `updateAccess`, confirmado por el timestamp "actualizado" cambiando a "ahora mismo"), crear carpeta, subir un PNG real por el input oculto (con vista previa real en el modal) y el layout completo en móvil (lista y modal apilados, sin cortes). Cero errores de consola en las dos rondas. Reverti `App.tsx` y `AuthGate.tsx` a como estaban (`git diff` vacío) antes de terminar.

Cuando decidas conectar `ArchivosView` de forma permanente, solo necesitas `<ArchivosView feed={useFilesFeed()} agents={officeAgents} />` en la vista `archivos` — sin cambios de contrato de mi lado.

## Reconciliación Codex: Archivos conectado

- `App.tsx` consume `useFilesFeed()` y renderiza `ArchivosView` en la vista `archivos`.
- El estado central conserva `failed`; la capa visual lo presenta como "Error" sin introducir un segundo vocabulario.
- Se corrigió la correspondencia entre drafts e identificadores cuando una carga múltiple contiene entradas inválidas.
- Las previsualizaciones de archivos elegidos en la sesión son object URLs locales revocadas al reemplazar, eliminar o desmontar; ningún byte entra en `central-files`.

Validación tras integrar: 20 archivos / 110 tests y build de producción en verde.
