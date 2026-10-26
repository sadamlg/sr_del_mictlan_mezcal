# Instrucciones del repositorio

## Documentación del proyecto

- `README.md` resume el stack y la arquitectura; `docs/MVP_SCOPE.md` fija los límites funcionales; `docs/ROADMAP.md` organiza fases, dependencias y estado.
- Mantén esos documentos claros, no redundantes y autocontenidos. No menciones sistemas, repositorios ni versiones anteriores.
- Conserva `frontend/AGENTS.md`, generado por Next.js.

## Alcance y medios

- Incorporar o cambiar imágenes, video y otros medios dentro de las superficies aprobadas de landing y catálogo es trabajo de contenido o presentación. No propongas ampliar el alcance por cada recurso visual.
- Revisa `docs/MVP_SCOPE.md` si el cambio agrega una página, un flujo o una capacidad de usuario, o altera una inclusión o exclusión funcional.

## Frontend

- Usa Tailwind CSS 4 como sistema predeterminado para estilos. Agrupa componentes compuestos por responsabilidades claras y reutilizables; evita crear un archivo por elemento visual. Prefiere clases Tailwind en JSX y Lucide React para iconos; usa CSS o SVG manual sólo cuando exista una necesidad concreta.
- Para cambios visuales, revisa la interfaz en navegador y en los tamaños afectados. No agregues pruebas unitarias artificiales a cambios que no alteran comportamiento.

## Pruebas automatizadas

- Todo cambio que agregue, modifique o elimine lógica o comportamiento del producto debe incluir o actualizar pruebas automatizadas que expresen el contrato afectado. No cierres un cambio lógico cubierto sólo con verificación manual.
- Aplica TDD a esos cambios: define primero una prueba que falle por el comportamiento faltante, implementa el cambio y vuelve a ejecutar la prueba.
- Usa el nivel más bajo que dé confianza: `node:test` para lógica aislada y límites de módulos/API. Mantén las pruebas versionadas y ejecutables desde el repositorio.
- Playwright permanece como herramienta opcional de aceptación E2E para la fase 08; no es un servicio de la aplicación ni un requisito para cada módulo. Su servicio Compose usa el perfil `e2e`, por lo que el arranque local normal no ejecuta pruebas. Cuando corresponda, ejecútalo explícitamente con `docker compose run --build --rm frontend-e2e`.
- TestSprite u otro generador de pruebas puede ayudar a descubrir recorridos o proponer casos, pero no sustituye la suite del proyecto. Una prueba generada sólo cuenta después de revisión, incorporación al repositorio y ejecución reproducible con datos de prueba.
- Los cambios sólo de contenido o presentación que no alteren comportamiento no necesitan pruebas unitarias artificiales; verifica su resultado visual y las interacciones que sí cambien.

## Forma de trabajo

- Si el usuario no especifica modalidad, trabaja de forma supervisada.
- **Supervisada:** avanza en incrementos pequeños y revisables. Ante una solicitud del usuario, no hagas commits: presenta el cambio para que lo revise. Sólo después de su autorización explícita crea los commits locales que hagan falta, agrupados en resultados atómicos y coherentes. Autorizar commits no autoriza push, PR, despliegue ni acciones en servicios externos.
- **No supervisada:** cuando el usuario delegue explícitamente una fase o contrato para completarlo sin revisión intermedia, itera hasta cumplir sus criterios de cierre. Analiza si el trabajo se beneficia de varios agentes; si los usas, conserva un agente orquestador responsable de coordinar, revisar e integrar. Registra mini tareas o mini fases cerradas con commits locales atómicos que representen resultados coherentes; no dividas commits sólo por archivo.
- Avanza una fase del roadmap por chat. Al cerrar una fase, sugiere el título y el prompt inicial para la siguiente.
- Mantén los cambios limitados a la solicitud: evita reescrituras de estilo o modificaciones en módulos ajenos, y agrega dependencias sólo cuando exista una necesidad concreta.
- No afirmes que una prueba, compilación o validación pasó si no la ejecutaste y terminó correctamente.
- Usa Docker Compose como fuente de verdad para ejecutar el proyecto y sus dependencias locales; no trates instalaciones en el host como el entorno canónico.
- Completa la parte de frontend correspondiente a cada módulo de backend antes de avanzar al siguiente módulo.
- Respeta el stack acordado: PostgreSQL guarda los trabajos asíncronos y un worker los procesa. No agregues Redis ni BullMQ.
