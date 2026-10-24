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

## Migración de secciones de la landing

- Antes de implementar una sección, inspecciona su implementación de referencia completa en `../sr_del_mictlan/frontend/src`: estructura, estilos, assets, breakpoints, interacciones y estados. Resume qué se conserva y detecta diferencias entre el original y el nuevo proyecto antes de editar.
- Conserva el diseño y comportamiento de referencia. No rediseñes ni agregues interacciones por criterio propio; señala primero cualquier ambigüedad o limitación técnica que cambie el resultado.
- Mantén una estructura profesional y compacta: agrupa por responsabilidades claras y evita crear un archivo o componente para cada elemento visual. Aplica las clases Tailwind directamente en JSX y usa Lucide React para iconos; usa CSS o SVG manual sólo cuando exista una necesidad concreta.
- Para cada cambio de lógica o interacción, sigue TDD y guarda las pruebas frontend en `frontend/tests/`. Para cambios sólo visuales, valida la presentación en navegador sin crear pruebas unitarias artificiales.
- Cierra cada sección sólo después de ejecutar las pruebas y la compilación disponibles, abrir la landing en navegador y revisar los estados relevantes en escritorio y móvil, incluida la interacción afectada. Compara el resultado con la referencia y revisa errores de consola.
- Al reportar, enumera brevemente los archivos o responsabilidades migradas, las diferencias intencionales, las verificaciones ejecutadas y cualquier pendiente. No declares completa una sección si falta una verificación requerida.

## Componentes del frontend

- Agrupa cada componente compuesto en una carpeta propia. Extrae sólo piezas con una responsabilidad clara y reutilizable o comportamiento propio; evita un archivo por elemento visual. Escribe las utilidades de Tailwind en las etiquetas JSX y coloca las pruebas del frontend en `frontend/tests/`.

## Pruebas automatizadas

- Todo cambio que agregue, modifique o elimine lógica o comportamiento del producto debe incluir o actualizar pruebas automatizadas que expresen el contrato afectado. No cierres un cambio lógico cubierto sólo con verificación manual.
- Aplica TDD a esos cambios: define primero una prueba que falle por el comportamiento faltante, implementa el cambio y vuelve a ejecutar la prueba.
- Usa el nivel más bajo que dé confianza: pruebas unitarias para lógica aislada, integración para límites entre módulos/API y pruebas de navegador para recorridos críticos visibles para clientes. Mantén las pruebas versionadas y ejecutables desde el repositorio.
- Conserva `node:test` para las pruebas actuales del backend y usa Playwright Test para automatizar los recorridos críticos del frontend cuando se establezca su suite de navegador.
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
- Aplica TDD a todo cambio de lógica o comportamiento y completa la parte de frontend correspondiente a cada módulo de backend antes de avanzar al siguiente módulo.
- Respeta el stack acordado: PostgreSQL guarda los trabajos asíncronos y un worker los procesa. No agregues Redis ni BullMQ.
