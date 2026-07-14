# Relevo para continuar Agencia IA con Codex

## Prompt listo para enviar

Trabaja sobre el proyecto local `C:\Users\NexorLabs\OneDrive\Desktop\Agencia IA` y continua su desarrollo desde el estado actual.

Antes de editar:

1. Lee este archivo completo.
2. Inspecciona los archivos actuales; no asumas que siguen iguales porque puede haber otro asistente trabajando simultaneamente.
3. Comprueba fechas o hashes de los archivos que vayas a tocar y vuelve a comprobarlos justo antes de aplicar cambios.
4. Conserva los cambios existentes y no reviertas trabajo ajeno.

Actua como desarrollador senior y completa cada peticion de extremo a extremo: implementacion, compilacion, lint y verificacion visual. Habla conmigo en espanol. Si trabajas en la oficina 3D, valida el resultado en escritorio y movil con capturas reales del canvas.

La prioridad es convertir esta interfaz en una oficina virtual real para una agencia de IA, manteniendo una experiencia profesional, clara y visualmente rica. No reconstruyas lo que ya funciona: continua desde los componentes actuales y respeta las reglas visuales y de comportamiento documentadas debajo.

## Estado actual del producto

Aplicacion React 19 + TypeScript + Vite con una oficina 3D construida con Three.js, React Three Fiber y Drei.

La interfaz principal ya incluye:

- Barra lateral con Panel, Agentes, Oficina, Actividad, Memoria, Archivos, Rutinas, Buscar, Analiticas, Informes y Skills.
- Barra superior con modos Isometrica/2D, selector de agentes y creacion de tareas.
- Oficina 3D como vista principal funcional.
- Panel de chat conectado al motor de agentes.
- Siete departamentos/agentes: Coordinacion, Lead Intake, Estrategia, Propuestas, Operaciones, Contenido y Revision/QA.
- Orquestador, schemas Zod, memoria en proceso, prompts por agente y flujo con aprobacion humana.

Las vistas distintas de Oficina todavia pueden ser placeholders. Inspecciona siempre el estado real antes de decidir el siguiente trabajo.

## Reglas visuales ya acordadas

No romper estas decisiones sin una peticion explicita del usuario:

- Los siete despachos tienen exactamente el mismo tamano.
- Cada despacho tiene suelo de madera por lamas, alfombra, escritorio, silla, ordenador encendido, teclado, raton, almacenaje, iluminacion, una baliza luminosa futurista, panel decorativo y ventana pequena.
- Coordinacion tiene doble monitor y permanece sentado frente al ordenador.
- El rotulo `ONYXLINK` aparece en la pared de Coordinacion.
- El archivo original del logo solo contiene graficamente `LINK`; el componente combina `ONYX` con esa imagen para formar el nombre completo.
- La camara es responsive y la oficina se puede rotar con OrbitControls.
- Los especialistas que no trabajan patrullan horizontalmente por su despacho.
- Un especialista con `agent.status === 'working'` deja de patrullar, se coloca en la silla y adopta la misma pose articulada de Coordinacion.
- La pose sentada tiene muslos hacia el escritorio, rodillas flexionadas, pies hacia el suelo y antebrazos extendidos al teclado.
- Al cambiar el estado del especialista a `online`, `idle` u `offline`, debe volver automaticamente a patrullar.

Los estados base se definen en `src/agents.ts`, pero ningun especialista empieza en `working`. `App.tsx` convierte temporalmente en `working` solo al agente cuyo `id` coincide con `typingAgentId`. Coordinacion permanece sentado como caso permanente aunque su estado sea `online`.

## Archivos clave

- `src/App.tsx`: composicion principal, navegacion, vista activa y chat.
- `src/components/Sidebar.tsx`: navegacion lateral.
- `src/components/TopBar.tsx`: controles superiores, agentes y nueva tarea.
- `src/components/ChatPanel.tsx`: conversacion y aprobaciones.
- `src/hooks/useAgentChat.ts`: union entre UI y `OfficeEngine`.
- `src/agents.ts`: apariencia y estado visual inicial de cada agente.
- `src/three/layout.ts`: dimensiones y posiciones de los siete despachos.
- `src/three/Building.tsx`: distribucion, posicion de patrulla/silla y regla `working -> seated`.
- `src/three/MinecraftCharacter.tsx`: animacion al caminar y pose articulada sentada.
- `src/three/OfficeRoom.tsx`: mobiliario, madera, ventanas y rotulo ONYXLINK.
- `src/three/OfficeCanvas.tsx`: luces, sombras, niebla, camara responsive y controles.
- `public/onyxlink-logo.png`: imagen de LINK utilizada por el rotulo.
- `orchestrator/engine.ts`: flujo y enrutamiento de los agentes.
- `agents/registry.ts`: metadatos compartidos por frontend y backend.
- `memory/in-memory-store.ts`: memoria actual en proceso.
- `schemas/`: contratos Zod.
- `prompts/`: instrucciones de cada agente.
- `tests/happy-path.test.ts`: flujo principal de extremo a extremo.
- `estructura/docs/architecture.md`: arquitectura y fases previstas.

## Arquitectura funcional actual

Flujo recomendado de la v1:

`lead intake -> strategy -> proposal -> human approval -> operations -> review/qa`

Estados principales del workflow:

`new_lead`, `qualified`, `strategy_drafted`, `proposal_ready`, `awaiting_approval`, `ops_ready`, `in_execution`, `qa_review`, `completed`, `blocked`.

Limitaciones conocidas que todavia pueden requerir trabajo:

- Los especialistas usan runners deterministas/heuristicos; faltan LLM reales.
- La memoria es local al proceso; falta persistencia en base de datos.
- Faltan adaptadores reales para CRM, email y WhatsApp.
- Varias vistas del dashboard pueden seguir siendo placeholders.
- El estado `working` ya se deriva de `typingAgentId`; una evolucion futura puede conectarlo a eventos mas detallados y persistentes del workflow.
- El bundle de Three.js genera una advertencia por superar 500 kB, aunque la compilacion funciona.

## Protocolo de trabajo simultaneo

Claude Code u otro asistente puede estar editando el proyecto al mismo tiempo.

- Limita cada cambio a los archivos estrictamente necesarios.
- Lee el contenido actual inmediatamente antes de editar.
- Conserva cualquier cambio nuevo que aparezca durante la tarea.
- No uses `git reset`, `git checkout --` ni operaciones destructivas.
- Puede haber servidores ocupando `5173`, `5174` u otros puertos; usa el siguiente disponible y no cierres procesos ajenos.
- Este directorio puede no tener repositorio Git inicializado, por lo que no dependas de Git para detectar concurrencia. Usa hashes, tamanos y fechas de modificacion.

## Validacion obligatoria

Desde la raiz del proyecto:

```powershell
cmd /c npm run build
cmd /c npm run lint
cmd /c npm test
```

En este entorno Vite/Vitest puede fallar dentro del sandbox de Windows con `spawn EPERM`. Si ocurre y la verificacion es necesaria, repite el comando con permisos ampliados en lugar de modificar la configuracion del proyecto.

Para cambios visuales:

1. Inicia `cmd /c npm run dev -- --host 127.0.0.1`.
2. Usa un puerto libre sin detener servidores ajenos.
3. Verifica escritorio y movil.
4. Confirma que el canvas no esta vacio, que no hay solapamientos incoherentes y que los agentes cambian correctamente entre patrulla y postura sentada.

## Siguiente direccion recomendada

Prioridad sugerida: evolucionar el estado visual actual, basado en `typingAgentId`, hacia eventos detallados del orquestador si se necesitan tareas largas o simultaneas.

Comportamiento esperado:

- Al asignarse una tarea a un agente: estado `working`, se sienta y usa el ordenador.
- Al terminar: estado `online` o `idle`, se levanta y vuelve a patrullar.
- Si se bloquea o desconecta: mostrar claramente el estado correspondiente.
- Mantener Coordinacion sentado como puesto permanente, salvo que el usuario solicite otra cosa.

Antes de implementar esta recomendacion, revisa como fluyen actualmente `typingAgentId`, los eventos de `OfficeEngine` y los estados de ejecucion. Elige una unica fuente de verdad para evitar que la UI y el workflow se desincronicen.
