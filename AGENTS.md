# Instrucciones del repositorio

## Documentación del proyecto

- `README.md` resume el stack y la arquitectura; `docs/MVP_SCOPE.md` fija los límites funcionales; `docs/ROADMAP.md` organiza fases, dependencias y estado.
- Mantén esos documentos claros, no redundantes y autocontenidos. No menciones sistemas, repositorios ni versiones anteriores.
- Conserva `frontend/AGENTS.md`, generado por Next.js.

## Alcance y medios

- Incorporar o cambiar imágenes, video y otros medios dentro de las superficies aprobadas de landing y catálogo es trabajo de contenido o presentación. No propongas ampliar el alcance por cada recurso visual.
- Revisa `docs/MVP_SCOPE.md` si el cambio agrega una página, un flujo o una capacidad de usuario, o altera una inclusión o exclusión funcional.

## Estilos del frontend

- Usa Tailwind CSS 4 como sistema predeterminado para los estilos del frontend. Recurre a CSS escrito a mano sólo para necesidades puntuales que no puedan resolverse razonablemente con sus utilidades; mantén esas reglas mínimas y acotadas.

## Forma de trabajo

- Si el usuario no especifica modalidad, trabaja de forma supervisada.
- **Supervisada:** avanza en incrementos pequeños y revisables. Ante una solicitud del usuario, no hagas commits: presenta el cambio para que lo revise. Sólo después de su autorización explícita crea los commits locales que hagan falta, agrupados en resultados atómicos y coherentes. Autorizar commits no autoriza push, PR, despliegue ni acciones en servicios externos.
- **No supervisada:** cuando el usuario delegue explícitamente una fase o contrato para completarlo sin revisión intermedia, itera hasta cumplir sus criterios de cierre. Analiza si el trabajo se beneficia de varios agentes; si los usas, conserva un agente orquestador responsable de coordinar, revisar e integrar. Registra mini tareas o mini fases cerradas con commits locales atómicos que representen resultados coherentes; no dividas commits sólo por archivo.
- Avanza una fase del roadmap por chat. Al cerrar una fase, sugiere el título y el prompt inicial para la siguiente.
- Aplica TDD a la lógica de producto y completa la parte de frontend correspondiente a cada módulo de backend antes de avanzar al siguiente módulo.
- Respeta el stack acordado: PostgreSQL guarda los trabajos asíncronos y un worker los procesa. No agregues Redis ni BullMQ.
