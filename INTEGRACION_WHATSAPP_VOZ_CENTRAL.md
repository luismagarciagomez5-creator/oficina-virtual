# Integración de WhatsApp y voz en la Central ONYXLINK

## Objetivo

Convertir la oficina virtual en el centro operativo de ONYXLINK, usando los datos y servicios reales del panel `WhatsApp-saas` sin duplicar su lógica de negocio.

La oficina debe ser una representación visual y operable de lo que ocurre en WhatsApp, voz, CRM, pipeline, agenda, proyectos y automatizaciones. No debe convertirse en una segunda base de datos ni en otro backend independiente.

## Hallazgos del repositorio WhatsApp-saas

El repositorio ya implementa una plataforma SaaS multi-tenant bastante completa:

- Next.js 16, React 19 y TypeScript.
- Supabase para autenticación, PostgreSQL, RLS, Realtime y Storage.
- Un workspace aislado por cliente.
- Roles `admin`, `manager`, `agent` y `viewer`, además de superadministración.
- Inbox de WhatsApp en tiempo real.
- Integración por workspace con YCloud.
- Firma de webhooks, credenciales cifradas y deduplicación por `wamid`.
- Estados de conversación: IA activa, humano, handoff y control de transiciones.
- Buffer para agrupar mensajes consecutivos antes de responder.
- Mensajes de texto, audios, imágenes, documentos y plantillas.
- Transcripción de audios y análisis de imágenes.
- Ventana de 24 horas de WhatsApp y estados de entrega monotónicos.
- CRM de contactos y empresas.
- Pipeline de oportunidades y clasificación asistida por IA.
- Proyectos, tareas, subtareas y agenda.
- Google Calendar, HighLevel y Airtable.
- Knowledge Base con búsqueda semántica.
- Memoria resumida y memoria avanzada por elementos.
- Memoria cruzada entre WhatsApp y llamadas.
- Recuperación de leads fríos y recordatorios de citas.
- Registro de costes, límites de uso y observabilidad.
- Agentes configurables, prompts versionados y catálogo de modelos.
- Herramientas configurables con registro central y protección SSRF.
- Vapi para el asistente de voz, llamadas, transcripción, resumen, coste y vinculación con contactos.
- Auditoría y eventos operativos.

## Decisión de arquitectura recomendada

### Fuente de verdad

`WhatsApp-saas` debe ser la fuente de verdad para:

- usuarios, roles y workspaces;
- contactos y empresas;
- conversaciones y mensajes;
- llamadas de voz;
- memoria de contacto;
- pipeline, proyectos y tareas;
- integraciones, herramientas y automatizaciones;
- costes, auditoría y eventos.

La Central ONYXLINK debe consumir esos datos mediante APIs autenticadas y Supabase Realtime.

### Destino final recomendado

La opción más sólida es portar la oficina 3D a una ruta de `WhatsApp-saas`, por ejemplo `/central`, reutilizando sus componentes React/Three.js. Así la central hereda directamente:

- sesión y permisos;
- workspace activo;
- RLS;
- navegación del producto;
- servicios de servidor;
- suscripciones Realtime;
- despliegue en Vercel.

Mantener dos frontends separados obligaría a resolver autenticación compartida, CORS, sincronización de navegación y versionado duplicado. Puede servir durante el prototipo, pero no debería ser el diseño final.

## Contrato de actividad para la oficina

La interfaz no debe deducir el estado de los agentes a partir de animaciones o temporizadores. Debe recibir eventos operativos normalizados.

Evento recomendado:

```ts
type OfficeActivityEvent = {
  id: string;
  workspaceId: string;
  runId?: string;
  agentId: 'coordinator' | 'lead-intake' | 'strategy' | 'proposal' |
    'operations' | 'content' | 'review-qa';
  status: 'queued' | 'working' | 'completed' | 'failed' | 'blocked' |
    'approval_required';
  source: 'whatsapp' | 'voice' | 'manual' | 'automation';
  entityType?: 'contact' | 'conversation' | 'voice_call' | 'deal' |
    'project' | 'task' | 'appointment' | 'template';
  entityId?: string;
  title: string;
  payload?: Record<string, unknown>;
  occurredAt: string;
  dedupeKey?: string;
};
```

Para la primera versión se puede reutilizar la tabla `events` existente y añadir tipos de actividad. Si el volumen aumenta, conviene usar un patrón outbox y una vista específica para la central.

## Correspondencia entre departamentos y eventos reales

### Coordinación

- Enruta entradas de WhatsApp, voz, tareas manuales y automatizaciones.
- Muestra batches pendientes, fallos, bloqueos y aprobaciones.
- Resume la carga global del workspace.
- Permite preguntar por cualquier contacto, conversación, llamada o proyecto.

### Lead Intake

- Se activa al entrar un contacto nuevo por WhatsApp o voz.
- Normaliza teléfono, crea o actualiza contacto y registra origen.
- Extrae nombre, necesidad, empresa, presupuesto e intención.
- Unifica a la persona por `workspace_id + phone` para evitar duplicados entre canales.

### Estrategia

- Se activa durante calificación y clasificación del pipeline.
- Analiza memoria, resumen de conversación, KB y contexto empresarial.
- Sugiere siguiente etapa, prioridad, seguimiento y mejor canal.

### Propuestas

- Genera propuestas desde contacto, deal, memoria y necesidad detectada.
- Crea versiones, importes y entregables.
- Solicita aprobación humana antes de enviar o avanzar.
- Esta capacidad no está completa en WhatsApp-saas y sería una ampliación propia de la central.

### Operaciones

- Convierte acuerdos en proyectos, tareas, subtareas, citas y eventos de calendario.
- Ejecuta herramientas autorizadas.
- Muestra actividad de Google Calendar, HighLevel, Airtable y webhooks.

### Contenido

- Gestiona plantillas de WhatsApp, KB, campañas y recuperación de leads.
- Puede generar mensajes de seguimiento y material de apoyo.
- Debe respetar plantillas aprobadas y la ventana de 24 horas.

### Revisión / QA

- Revisa propuestas, respuestas sensibles, acciones externas y ejecuciones fallidas.
- Supervisa handoffs, auditoría, calidad, coste y cumplimiento.
- Es el punto natural para las aprobaciones humanas.

## Uso de las secciones actuales de la central

| Sección | Datos o función real |
| --- | --- |
| Panel | Métricas del workspace, conversaciones recientes, llamadas y tareas críticas |
| Agentes | Configuración de agentes, modelo, prompt, avatar, herramientas y pruebas |
| Oficina | Actividad operativa en tiempo real y acceso contextual a cada agente |
| Actividad | Timeline unificado de WhatsApp, voz, CRM, herramientas y automatizaciones |
| Memoria | Resumen y elementos de memoria por contacto, con opción de olvidar |
| Archivos | Knowledge Base, documentos, imágenes, audios y archivos de conversaciones |
| Rutinas | Reglas de automatización, recordatorios, recuperación de leads y crons |
| Buscar | Búsqueda global de contactos, conversaciones, llamadas, deals, proyectos y tareas |
| Analíticas | Conversión, tiempos de respuesta, handoffs, costes, uso por canal y rendimiento |
| Informes | Informes periódicos por workspace, cliente, agente y canal |
| Skills | Registro de tools, configuración, permisos, sensibilidad y estado |

## Experiencias de producto recomendadas

1. Al llegar un WhatsApp, Lead Intake se sienta y su monitor muestra el nombre del contacto.
2. Al comenzar una llamada Vapi, aparece un indicador de llamada activa y el agente correspondiente trabaja.
3. Cuando termina una llamada, se muestra resumen, sentimiento, duración, coste y siguiente acción.
4. Un mismo contacto conserva memoria entre llamada y WhatsApp.
5. Al detectar intención comercial, Estrategia se activa y el deal cambia de fase.
6. Cuando hay que enviar algo sensible, QA solicita aprobación en la central.
7. Un handoff hace visible una alerta y permite a una persona tomar la conversación.
8. Al agendar una cita, Operaciones actualiza agenda y calendario desde la misma central.
9. Los fallos de integración, rate limits o mensajes no entregados aparecen como bloqueos reales.
10. El coordinador permite consultas como “¿qué leads están esperando respuesta?” o “resume las llamadas de hoy”.
11. Cada despacho abre una vista contextual, no un chat aislado: contacto, conversación, memoria, deal, tareas y acciones.
12. El color y postura del personaje representan estados del backend: disponible, en cola, trabajando, bloqueado o desconectado.

## Integración de voz

El repositorio ya recibe `end-of-call-report` de Vapi y guarda llamadas con transcripción, resumen, duración, coste y payload original. También intenta vincular la llamada con el mismo contacto de WhatsApp usando el teléfono.

Para una experiencia verdaderamente en tiempo real deben añadirse eventos Vapi de baja frecuencia:

- llamada iniciada;
- llamada conectada;
- herramienta ejecutada;
- llamada finalizada;
- error.

No conviene enviar cada fragmento de transcripción al canvas. Generaría ruido y demasiados renders. Las transcripciones parciales pueden permanecer en un panel de detalle.

## Seguridad y reglas no negociables

- Nunca exponer `SUPABASE_SERVICE_ROLE_KEY` en el navegador.
- Mantener RLS por workspace en todas las lecturas y escrituras.
- Verificar firmas de YCloud y el secreto de Vapi antes de procesar eventos.
- Mantener credenciales de integraciones cifradas.
- Aplicar idempotencia a webhooks y acciones.
- Exigir aprobación para envíos, cambios de pipeline, citas, propuestas y acciones sensibles.
- Registrar actor, entrada, salida, herramienta, coste, duración y resultado.
- Respetar roles antes de mostrar datos o permitir acciones.
- La oficina 3D nunca debe ser la única forma de operar; las vistas tabulares siguen siendo necesarias.

## Qué no hacer

- No copiar las tablas de WhatsApp-saas a otra base de datos.
- No crear un segundo modelo de contactos o memoria.
- No conectar el canvas directamente con service-role.
- No convertir animaciones en fuente de verdad.
- No mezclar el motor de workflow de la agencia con el state machine de conversaciones sin un contrato de eventos.
- No migrar todo el repositorio de una vez.
- No intentar que cada evento técnico produzca una animación.

## Hoja de ruta recomendada

### Fase 1: central de lectura

- Crear `/central` dentro de WhatsApp-saas.
- Portar la escena y el shell visual ONYXLINK.
- Leer workspace, roles y métricas reales.
- Sustituir datos estáticos de agentes por configuración real.
- Abrir contactos, conversaciones, llamadas y tareas en paneles contextuales.

### Fase 2: actividad en tiempo real

- Definir `OfficeActivityEvent`.
- Publicar eventos desde WhatsApp, Vapi, pipeline, tools y automatizaciones.
- Suscribir la oficina mediante Supabase Realtime.
- Derivar postura, monitor y estado únicamente de eventos reales.
- Añadir timeline y alertas.

### Fase 3: acciones con aprobación

- Enviar mensajes y plantillas.
- Tomar o devolver conversaciones a IA.
- Mover deals.
- Crear tareas, proyectos y citas.
- Ejecutar tools.
- Añadir Approval Center y auditoría.

### Fase 4: voz en vivo

- Procesar eventos de inicio, conexión, tool y fin de llamada.
- Mostrar llamadas activas y cola.
- Abrir transcripción y resumen contextual.
- Compartir memoria y siguiente acción con WhatsApp.

### Fase 5: orquestación ONYXLINK

- Persistir `workflow_runs` y trazas dentro del modelo multi-tenant.
- Reemplazar agentes deterministas por adaptadores reales.
- Conectar propuestas, ejecución y QA al CRM/proyectos.
- Permitir que Coordinación planifique trabajos multicanal completos.

## Primer corte recomendado

El primer entregable debería ser una central de lectura real, no una integración completa:

1. Ruta `/central` protegida dentro de WhatsApp-saas.
2. Oficina 3D portada sin cambiar su aspecto.
3. Workspace y agentes reales.
4. Contadores de conversaciones, handoffs, llamadas y tareas.
5. Actividad reciente desde `events` y `voice_calls`.
6. Clic en agente para abrir contexto real en modo solo lectura.

Este corte valida la experiencia y la arquitectura sin arriesgar envíos, citas o cambios de CRM. Después se añaden acciones una por una con permisos, idempotencia y aprobación.

