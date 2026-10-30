# Instrucciones del repositorio

## Fuentes de verdad

- `README.md`: entrada breve e índice de guías.
- `docs/MVP_SCOPE.md`: alcance objetivo aprobado.
- `docs/ROADMAP.md`: orden, dependencias y estado de las fases.
- `docs/development.md`: base local, Compose y variantes LAN o de medios.
- `docs/stripe.md`, `docs/resend.md`, `docs/domain-neubox-cpanel.md`, `docs/media.md` y `docs/railway.md`: configuración reproducible de proveedores y entornos.
- `docs/contracts/`: comportamiento actual de cada módulo. Nombra cada contrato `NN-UPPERCASE-ENGLISH.md` con el número de la fase donde nació.
- `design.md`: sistema visual; `frontend/src/app/globals.css` implementa sus tokens.
- Mantén cada hecho en su fuente principal. En otros documentos, enlázala en vez de copiar su contenido. Distingue funciones implementadas, pendientes y dependientes de configuración externa.

## Alcance y frontend

- No amplíes el MVP por agregar o cambiar medios en una superficie aprobada; revisa el contrato si cambia una página, un flujo o una capacidad de usuario.
- Usa Tailwind CSS 4 como opción predeterminada. Agrupa componentes por responsabilidades claras y evita un archivo por elemento visual.
- Sigue `design.md` y sus tokens `mictlan-*`; no sustituyas los colores de marca con colores cromáticos genéricos de Tailwind. Si falta un rol cromático, actualiza `design.md` y `globals.css` juntos.
- Usa Lucide React para iconos. Valida en navegador cambios de interfaz, estados relevantes, accesibilidad, responsividad y consola.

## Pruebas y ejecución

- Los cambios de lógica o comportamiento incluyen pruebas del contrato afectado y siguen TDD. Los cambios sólo documentales o visuales no requieren pruebas unitarias artificiales.
- Usa `node:test` para el backend, pruebas unitarias del frontend en `frontend/tests/` y Playwright para recorridos de navegador en `frontend/e2e/`.
- Usa Docker Compose como entorno local de referencia. Antes de builds o E2E, revisa memoria con `free -h` y carga con `docker stats --no-stream`; ejecuta cargas intensivas en serie.
- No afirmes que verificaste algo si no ejecutaste la comprobación.

## Flujo de trabajo

- Trabaja en modo supervisado salvo delegación explícita: deja los cambios revisables y no hagas commits sin autorización explícita. Una autorización de commit no autoriza push, PR ni despliegue.
- Mantén los cambios limitados a la solicitud. No agregues Redis ni BullMQ: PostgreSQL persiste los trabajos asíncronos y el worker los procesa.
- Conserva `frontend/AGENTS.md`, generado por Next.js.
