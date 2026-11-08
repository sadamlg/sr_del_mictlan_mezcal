# Instrucciones del repositorio

## Fuentes de verdad

- `README.md`: stack, arquitectura y entorno local.
- `docs/MVP_SCOPE.md`: alcance objetivo aprobado.
- `docs/ROADMAP.md`: estado y próximos hitos.
- `docs/contracts/`: comportamiento actual de cada módulo.
- `docs/docker/`, `docs/cloudflare/`, `docs/stripe/`, `docs/resend/`, `docs/neubox/` y `docs/deployment/`: guías para reproducir infraestructura e integraciones.
- `design.md`: sistema visual; `frontend/src/app/globals.css` implementa sus tokens.
- Mantén cada hecho en su fuente principal. En otros documentos, enlázala en vez de copiar su contenido. Distingue funciones implementadas, pendientes y dependientes de configuración externa.

## Referencia del proyecto anterior

- Al iniciar una fase funcional, si está disponible `../sr_del_mictlan`, revisa sus contratos, decisiones, flujos, casos límite, pruebas y código relacionados. Es una referencia, no la fuente de verdad: adapta sólo lo compatible con la arquitectura y el alcance actuales.
- Registra en el contrato del módulo qué se reutilizó, adaptó o rehízo y por qué no conviene portar el resto.

## Alcance y frontend

- No amplíes el MVP por agregar o cambiar medios en una superficie aprobada; revisa el contrato si cambia una página, un flujo o una capacidad de usuario.
- Usa Tailwind CSS 4 como opción predeterminada. Agrupa componentes por responsabilidades claras y evita un archivo por elemento visual.
- Sigue `design.md` y sus tokens `mictlan-*`; no sustituyas los colores de marca con colores cromáticos genéricos de Tailwind. Si falta un rol cromático, actualiza `design.md` y `globals.css` juntos.
- Usa Lucide React para iconos. Valida en navegador cambios de interfaz, estados relevantes, accesibilidad, responsividad y consola.

- Antes de migrar una sección existente de la landing, revisa su estructura, recursos, estilos, interacciones y tamaños en la referencia disponible. Conserva el comportamiento aprobado y señala ambigüedades antes de cambiarlo.

## Pruebas y ejecución

- Los cambios de lógica o comportamiento incluyen pruebas del contrato afectado y siguen TDD. Los cambios sólo documentales o visuales no requieren pruebas unitarias artificiales.
- Usa `node:test` para el backend, pruebas unitarias del frontend en `frontend/tests/` y Playwright para recorridos de navegador en `frontend/e2e/`.
- Usa Docker Compose como entorno local de referencia. Antes de builds o E2E, revisa memoria con `free -h` y carga con `docker stats --no-stream`; ejecuta cargas intensivas en serie.
- Usa el nivel de prueba más bajo que dé confianza: unitarias para lógica aislada, integración para límites de API y navegador para recorridos críticos. Las pruebas generadas sólo cuentan si se revisan, versionan y pueden reproducirse.
- Antes de cerrar cambios visuales, revisa los estados y tamaños afectados en navegador, incluida la consola; no declares validaciones que falten.
- No afirmes que verificaste algo si no ejecutaste la comprobación.

## Flujo de trabajo

- Trabaja en modo supervisado salvo delegación explícita: deja los cambios revisables y no hagas commits sin autorización explícita. Una autorización de commit no autoriza push, PR ni despliegue.
- Mantén los cambios limitados a la solicitud. No agregues Redis ni BullMQ: PostgreSQL persiste los trabajos asíncronos y el worker los procesa.
- Completa la parte de frontend de cada módulo antes de avanzar al siguiente. Mantén una fase del roadmap por chat salvo indicación del usuario.
- Conserva `frontend/AGENTS.md`, generado por Next.js.
