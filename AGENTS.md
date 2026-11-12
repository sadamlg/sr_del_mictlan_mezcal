# Instrucciones del repositorio

## Fuentes de verdad

- `README.md`: stack, arquitectura y entorno local.
- `docs/MVP_SCOPE.md`: alcance objetivo aprobado.
- `docs/ROADMAP.md`: estado y próximos hitos.
- `docs/contracts/`: comportamiento previsto y criterios de cada módulo; consultar el roadmap para conocer su estado de implementación y validación.
- `docs/architecture/`: diagrama del sistema, Docker Compose, servicios externos, costos y rutas de acceso.
- `docs/DESIGN.md`: sistema visual; `frontend/src/app/globals.css` implementa sus tokens.
- Mantén cada hecho en su fuente principal. En otros documentos, enlázala en vez de copiar su contenido. Distingue funciones implementadas, pendientes y dependientes de configuración externa.

## Idioma

- Mantén la documentación del proyecto en español como idioma principal.
- Redacta en inglés los mensajes de commit y los títulos y descripciones de PR para facilitar la revisión internacional.
- Si se añade una traducción, identifícala claramente y enlázala con la versión en español para que ambas se puedan encontrar.

## Conservación de la documentación

- Trata el README, las guías y los contratos existentes como material aprobado. Antes de reescribirlos, revisa su contenido y su historial.
- Simplificar significa mejorar el orden y eliminar duplicación sin perder instrucciones útiles, decisiones, ejemplos, criterios de cierre ni información necesaria para reproducir el proyecto.
- No elimines, reduzcas drásticamente ni sustituyas una guía, sección sustancial o diagrama sin presentar antes qué contenido se perdería, dónde quedaría y obtener autorización explícita del usuario. Si el usuario ya autorizó ese cambio concreto, no vuelvas a pedirla.
- Conserva las carpetas que agrupan documentación por tema o proveedor. Al mover o renombrar archivos, actualiza y comprueba sus enlaces.
- El README es un documento protegido: no lo reestructures ni reduzcas sin una solicitud explícita. Los enlaces rotos pueden corregirse sin alterar su contenido.
- Al actualizar una guía, conserva sus pasos para construir desde cero y distingue los ejemplos históricos del estado actual. Contrasta comandos, variables y comportamiento con los archivos y el código vigentes.
- Antes de cerrar un cambio documental, compara la versión anterior y la nueva. Informa qué contenido se conservó, trasladó, actualizó o retiró. Verificar enlaces o levantar contenedores no demuestra por sí solo que se haya preservado la información.

## Planificación y estado del roadmap

- Para cada fase nueva o modificada, documenta: objetivo, fases o servicios que necesita antes de empezar, resultado esperado y comprobaciones concretas para darla por terminada.
- Si una fase requiere una cuenta, dominio, configuración DNS, credencial o recurso externo, indica quién debe prepararlo y en qué momento. Incluye ese requisito antes del paso que lo utiliza y enlaza la guía correspondiente.
- Al actualizar el estado de una fase, distingue si el código está implementado, si el servicio externo está configurado y si el recorrido completo se ha probado. Indica el entorno y la fecha de la evidencia; marca como pendiente lo que no se haya comprobado.
- Conserva los resultados, dependencias y criterios de las fases anteriores. Si una decisión posterior los cambia, actualízalos y explica qué cambió sin borrar el contexto necesario para reconstruir el proyecto.
- Antes de proponer la siguiente fase, comprueba sus requisitos contra el roadmap, el código y la configuración conocida. Señala lo que falte o no puedas verificar; no lo presentes como ya disponible.

## Alcance y frontend

- No amplíes el MVP por agregar o cambiar medios en una superficie aprobada; revisa el contrato si cambia una página, un flujo o una capacidad de usuario.
- Usa Tailwind CSS 4 como opción predeterminada. Agrupa componentes por responsabilidades claras y evita un archivo por elemento visual.
- Sigue `docs/DESIGN.md` y sus tokens `mictlan-*`; no sustituyas los colores de marca con colores cromáticos genéricos de Tailwind. Si falta un rol cromático, actualiza `docs/DESIGN.md` y `globals.css` juntos.
- Usa Lucide React para iconos. Valida en navegador cambios de interfaz, estados relevantes, accesibilidad, responsividad y consola.

- Antes de implementar una sección de la landing, revisa su estructura, recursos, estilos, interacciones y tamaños definidos. Conserva el comportamiento aprobado y señala ambigüedades antes de cambiarlo.

## Pruebas y ejecución

- Sigue [Calidad y validación antes de Producción](docs/quality/QUALITY-AND-RELEASE.md): CI con lint desde la fase 01; agrega pruebas y build al implementar módulos. La fase 09 comienza cuando el proyecto llegue a Staging. Registra evidencia por entorno, fecha y commit.

- Los cambios de lógica o comportamiento incluyen pruebas del contrato afectado y siguen TDD. Los cambios sólo documentales o visuales no requieren pruebas unitarias artificiales.
- Usa `node:test` para el backend y pruebas unitarias del frontend en `frontend/tests/`.
- Usa Docker Compose como entorno local de referencia. Antes de builds, revisa memoria con `free -h` y carga con `docker stats --no-stream`; ejecuta cargas intensivas en serie.
- Usa el nivel de prueba más bajo que dé confianza: unitarias para lógica aislada, integración para límites de API y navegador para recorridos críticos. Las pruebas generadas sólo cuentan si se revisan, versionan y pueden reproducirse.
- Antes de cerrar cambios visuales, revisa los estados y tamaños afectados en navegador, incluida la consola; no declares validaciones que falten.
- No afirmes que verificaste algo si no ejecutaste la comprobación.

## Flujo de trabajo

- Al informar el estado del proyecto, revisa los PR abiertos y señala cuáles están pendientes o desactualizados. Si no puedes consultar GitHub, indícalo; no cierres ni fusiones un PR por tu cuenta al hacer esa revisión.
- Trabaja en modo supervisado salvo delegación explícita: deja los cambios revisables y no hagas commits sin autorización explícita. Una autorización de commit no autoriza push, PR ni despliegue.
- Mantén los cambios limitados a la solicitud. No agregues Redis ni BullMQ: PostgreSQL persiste los trabajos asíncronos y el worker los procesa.
- Completa la parte de frontend de cada módulo antes de avanzar al siguiente. Mantén una fase del roadmap por chat salvo indicación del usuario.
- Conserva `frontend/AGENTS.md`, generado por Next.js.
