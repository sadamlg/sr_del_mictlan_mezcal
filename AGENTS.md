# Instrucciones del repositorio

## Documentación del proyecto

- `README.md` resume el stack y la arquitectura; `docs/MVP_SCOPE.md` fija los límites funcionales; `docs/ROADMAP.md` organiza fases, dependencias y estado.
- Mantén esos documentos claros, no redundantes y autocontenidos. No menciones sistemas, repositorios ni versiones anteriores.
- Conserva `frontend/AGENTS.md`, generado por Next.js.

## Alcance y medios

- Incorporar o cambiar imágenes, video y otros medios dentro de las superficies aprobadas de landing y catálogo es trabajo de contenido o presentación. No propongas ampliar el alcance por cada recurso visual.
- Revisa `docs/MVP_SCOPE.md` si el cambio agrega una página, un flujo o una capacidad de usuario, o altera una inclusión o exclusión funcional.

## Forma de trabajo

- Avanza una fase del roadmap por chat y en incrementos pequeños y revisables. Al cerrar una fase, sugiere el título y el prompt inicial para la siguiente.
- Aplica TDD a la lógica de producto y completa la parte de frontend correspondiente a cada módulo de backend antes de avanzar al siguiente módulo.
- Respeta el stack acordado: PostgreSQL guarda los trabajos asíncronos y un worker los procesa. No agregues Redis ni BullMQ.
- Crea skills de proyecto solo para procedimientos propios del repositorio que se repitan; no dupliques skills generales de Codex.
