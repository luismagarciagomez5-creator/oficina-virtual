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
- Verificado visualmente en navegador (bypass temporal del login, revertido inmediatamente después): la oficina renderiza y reacciona al feed simulado sin errores.

Codex puede seguir trabajando en `src/central-events/` con normalidad; el vocabulario de estado ya es estable en todo el repo.
