# Claude Code OnyxLink Agent Office Kit

Kit listo para extraer dentro de un proyecto y usar con Claude Code para replicar una **oficina de agentes IA** estilo OnyxLink: coordinador + especialistas + reglas + memoria operativa + handoffs.

## Qué incluye

- `CLAUDE.md` — repertorio maestro para Claude Code
- `AGENTS.md` — reglas operativas multiagente y criterios de implantación
- `docs/architecture.md` — arquitectura de la oficina IA
- `docs/implementation-roadmap.md` — roadmap por fases
- `docs/agent-specs/*.md` — especificación exacta de cada agente
- `docs/workflows/*.md` — handoffs y flujos operativos
- `docs/rules/*.md` — reglas duras de producto, seguridad y calidad
- `docs/templates/*.md` — plantillas de briefs, tareas, PRDs y memory records
- `prompts/*.md` — prompts reutilizables para pedir a Claude Code que implemente cada parte

## Cómo usarlo

1. Extrae este ZIP en la raíz de tu proyecto.
2. Abre Claude Code en ese proyecto.
3. Pide a Claude Code que lea primero:
   - `CLAUDE.md`
   - `AGENTS.md`
   - `docs/architecture.md`
4. Luego usa uno de los prompts de `prompts/`.

## Comando recomendado para empezar

Pega esto en Claude Code:

```text
Lee primero `CLAUDE.md`, `AGENTS.md` y `docs/architecture.md`.
Después implementa la v1 mínima descrita en `docs/implementation-roadmap.md`,
respetando todas las reglas de `docs/rules/` y documentando las decisiones.
Antes de escribir código, crea un plan corto. Después ejecuta la fase 1 completa.
```

## Objetivo del kit

Que Claude Code no improvise un "chatbot genérico", sino una **oficina IA modular** con:

- orquestador
- agentes especialistas
- memoria operativa
- handoffs verificables
- reglas de calidad
- capas de aprobación humana
- instrumentación suficiente para iterar
