# Calidad y validación antes de Producción

## Propósito y momento de aplicación

Plan aprobado el 11 de noviembre de 2026 para reconstruir el proyecto definitivo desde esta documentación. La fase **09 · Validación previa a Producción** comienza cuando el nuevo repositorio tenga su aplicación desplegada y funcional en Staging. Su estado se mantiene en el [roadmap](../ROADMAP.md).

Este documento define el paquete de herramientas, la secuencia y los criterios para implementarlo cuando corresponda. Su presencia no acredita instalaciones, workflows, auditorías ni pruebas ejecutadas. Las evidencias del repositorio de referencia conservan su fecha y entorno; el repositorio definitivo registra sus propias comprobaciones.

## 1. Base de desarrollo y repositorio

La [guía de Compose](../architecture/docker/COMPOSE.md) describe cómo construir la base local. Las herramientas de desarrollo se ejecutan dentro de los contenedores de aplicación o en procesos temporales; los servicios permanentes se limitan a los que necesita la aplicación.

| Elemento | Preparación desde el inicio | Verificación |
|---|---|---|
| ESLint | Dependencias, lockfiles, configuración de frontend/backend y scripts `lint`; instalación mediante `npm ci` en las imágenes de desarrollo | Ambos comandos terminan sin errores; revisar también las advertencias |
| `node:test` | Comandos de pruebas y ejemplos mínimos que prueben comportamiento real a medida que se implementan los módulos | Suites reproducibles sin credenciales de proveedores reales |
| PostgreSQL de prueba | Base o instancia local dedicada, migraciones y datos de prueba; separación explícita de la base de trabajo y de cualquier base remota | Las pruebas crean datos identificables y limpian sus registros; nunca usan datos de producción |
| Logs y salud | Health checks de servicios, errores comprensibles y logs con contexto suficiente para investigar una solicitud o un trabajo | Probar un fallo controlado y localizarlo; excluir contraseñas, cookies, tokens y contenido personal |
| Mailpit | Servicio local para proyectos con correo; en esta tienda se necesita desde cuentas | Recepción de confirmación, recuperación y compra cuando se implementen esos módulos |
| GitHub Actions | En fase 01, workflow versionado con lint de frontend y backend; agregar pruebas y build conforme se implementen en las fases 03–07 | Verificar ejecuciones en PR y push; probar que una regla de rama configurada para exigir el check impida fusionar cuando falle |
| Seguridad del repositorio | Responsable con permisos de administración revisa protección de ramas, Dependabot y análisis de secretos/código disponibles para la cuenta | Confirmar las opciones activas y checks requeridos en GitHub; registrar las limitaciones del plan |

Los runners de CI son temporales. Las herramientas de test no se añaden a las imágenes de ejecución de producción salvo que la aplicación realmente las necesite. Al preparar los builds de CI se entregan las variables públicas de prueba requeridas por el frontend, sin utilizar secretos de producción.

### Evolución del CI en el repositorio definitivo

1. **Fase 01:** crear en `.github/workflows/` un workflow que se ejecute en los PR hacia `develop` y en los push a la rama que despliegue Railway. Instalar las dependencias desde los lockfiles y ejecutar los scripts de lint de frontend y backend. Comprobar una ejecución exitosa y otra con un error deliberado en una rama de prueba. Tras verificar los nombres de los checks y las opciones disponibles para la cuenta, configurar y probar la protección de rama; un workflow que falla por sí solo no impide fusionar.
2. **Fases 03–07:** agregar pruebas reales de cada módulo cuando existan, build y, cuando corresponda, integración con PostgreSQL aislado y migraciones. No agregar comandos que aún no existen ni usar secretos o datos de producción. El CI acompaña cada incremento en vez de esperar al final.
3. **Fase 09:** incorporar la validación del candidato desplegado en Staging: recorridos Playwright/axe y las auditorías y pruebas operativas de esta guía. Pueden comenzar manualmente; automatizarlas cuando se pueda identificar el commit desplegado y controlar datos y credenciales de prueba.

GitHub Actions ejecuta el workflow en runners; Railway construye y despliega según su configuración. Para que Railway espere por CI hay que activar y comprobar esa integración y sus requisitos: el resultado verde de un PR, por sí solo, no garantiza que el despliegue espere. La fase 10 requiere además la aceptación y autorización de salida. Consultar [conceptos de GitHub Actions](https://docs.github.com/en/actions/get-started/understand-github-actions) y [autodespliegue de Railway](https://docs.railway.com/deployments/github-autodeploys).

No se fija una cuota de cobertura por intuición. Revisar que existan pruebas de las reglas críticas, errores, autorización e idempotencia; una cifra alta por sí sola no acredita esos casos.

## 2. Paquete de la fase 09

| Herramienta | Resultado requerido | Ejecución |
|---|---|---|
| Playwright Test | Recorridos críticos reproducibles, navegadores Chromium/Firefox/WebKit, tamaños móvil/escritorio y trazas de fallos | Equipo de desarrollo o runner temporal de GitHub Actions contra la URL de Staging |
| `@axe-core/playwright` | Análisis de accesibilidad integrado en páginas y estados importantes de los recorridos | En la misma suite Playwright; completar con revisión manual de teclado, foco y formularios |
| Lighthouse | Informes de rendimiento, accesibilidad, buenas prácticas y SEO de las páginas públicas principales | Chrome DevTools o runner temporal; repetir con condiciones comparables |
| ZAP Baseline | Informe de exploración y análisis pasivo del entorno de Staging | Ejecución temporal, con alcance y rutas permitidas definidos previamente |
| Revisión de seguridad | Revisión del código y configuración de autenticación, autorización, sesiones, entradas, secretos, proveedores y dependencias | Código del commit candidato y configuración de Staging; reproducir y evaluar cada hallazgo |
| Revisión operativa | Evidencia de respaldo/restauración, alertas y rollback | Recursos de prueba y guías de proveedor antes de habilitar ventas |

Playwright puede alcanzar una URL pública o una aplicación local. No requiere un servicio permanente dentro de Compose. Para esta fase se prefiere el dominio de Staging porque permite comprobar proxy, cookies, TLS y proveedores con la arquitectura desplegada. El navegador de pruebas se instala en el entorno que ejecuta la suite.

Al iniciar la fase, elegir versiones compatibles con el Node y frameworks fijados en el nuevo repositorio, revisar licencias y fijar dependencias y lockfiles. Versionar las configuraciones, scripts y casos de prueba en ese repo. Empezar con pocos recorridos que cubran operaciones del negocio; ampliar cuando una incidencia o capacidad nueva lo justifique.

## 3. Preparativos antes de ejecutar contra Staging

1. El responsable del proyecto prepara las cuentas y recursos de GitHub, Railway, Stripe, Resend y Cloudflare del repositorio definitivo según las [guías de servicios](../architecture/services/). Configura recursos, hostnames y credenciales de prueba antes de usarlos.
2. Registrar el commit candidato, URL, versiones de herramientas, configuración y datos de prueba. Crear cuentas de prueba con acceso a una bandeja de correo prevista para automatización; definir limpieza y límites de envío.
3. Confirmar que Stripe está en modo de prueba, que el webhook apunta a Staging y que medios y enlaces de correo usan el origen correcto. Las pruebas deben demostrar el estado pagado por webhook y la recepción del correo; un proveedor simulado sólo acredita la prueba local correspondiente.
4. Definir el tratamiento de Turnstile: probar el challenge real y Siteverify con hostname/action de Staging en navegador normal; para automatización repetible, diseñar un entorno de prueba separado compatible con las claves de prueba del proveedor y la validación del backend. Las claves de prueba no acreditan el widget real. No desactivar controles en Staging compartido o Producción para obtener una suite verde.
5. Revisar cuotas, almacenamiento de artefactos y presupuesto antes de activar servicios externos o ejecuciones programadas. El objetivo inicial es usar herramientas abiertas y las cuotas gratuitas disponibles; no se presupone que Railway, proveedores ni runners privados sean ilimitados o gratuitos.

## 4. Recorridos y evidencia de aceptación

La matriz de pruebas se construye desde los [contratos](../contracts/) y el [alcance](../MVP_SCOPE.md). Para esta tienda debe incluir:

- Registro pendiente, confirmación de correo, inicio/cierre y restauración de sesión, recuperación de contraseña y protección de páginas/datos privados. Incluir navegación entre formularios y credenciales rechazadas.
- Catálogo, imágenes y navegación móvil/escritorio; carrito de invitado, combinación con cuenta, cantidades, reintentos y productos no disponibles.
- Checkout con precios del servidor, pago de prueba, webhook firmado, pedido privado, limpieza de las cantidades compradas y correo con PDF. Cubrir eventos repetidos y fallos con pruebas de integración apropiadas.
- Accesibilidad automática y manual en formularios, menú, carrito y estados de error; ninguna incidencia grave/crítica de axe queda sin resolver en las superficies incluidas. Las comprobaciones automáticas no acreditan conformidad completa.
- Rendimiento y SEO de las páginas principales: guardar una medición inicial y acordar objetivos antes de usar umbrales como bloqueo. Evaluar causas concretas; no perseguir una puntuación perfecta como único criterio. Staging conserva las restricciones de indexación propias de ese entorno.
- Seguridad: registrar severidad, evidencia, reproducción y resolución de cada hallazgo. Resolver hallazgos altos/críticos confirmados antes de salir; justificar cualquier falso positivo con evidencia y asignar responsable a los seguimientos restantes. Ninguna herramienta certifica por sí sola la seguridad.
- Operación: restaurar una copia en un recurso de prueba, comprobar alertas y ensayar rollback. Registrar resultado y responsables.

Por ejecución guardar commit, entorno, fecha, comandos/configuración, resultados, incidencias y enlaces a informes. Conservar trazas, capturas e informes sólo el tiempo necesario y restringirlos cuando contengan datos o sesiones de prueba. Una prueba omitida, un CAPTCHA bloqueado o una integración simulada se documentan con su límite y no se registran como recorrido real aprobado.

## 5. CI/CD y promoción

La integración de GitHub con Railway construye y despliega; la calidad depende de los checks que se configuren. Preparar este flujo en el repositorio definitivo:

1. **PR:** GitHub Actions ejecuta lint, pruebas unitarias, integración aislada con PostgreSQL y build. La protección de la rama exige los checks acordados.
2. **Despliegue de Staging:** Railway despliega el commit aprobado. Si se usa **Wait for CI**, verificar sus requisitos actuales y que el workflow se ejecute también en `push` sobre la rama que Railway despliega. Un workflow exclusivo de PR no basta para esa integración.
3. **Validación del despliegue:** cuando Staging esté listo, ejecutar Playwright/axe contra la URL de ese commit y las auditorías previstas. Al principio puede iniciarse manualmente; automatizar el disparo cuando se pueda verificar qué versión está desplegada.
4. **Salida:** corregir y revalidar hallazgos, registrar aceptación de la fase 09 y obtener la autorización de salida prevista en la fase 10. Las verificaciones de la URL desplegada ocurren después del despliegue de Staging y antes de promover el candidato a Producción.
5. **Producción:** comprobar dominio final, TLS, medios, enlaces, metadatos y salud; verificar monitoreo. Los recorridos con escritura o pagos requieren un procedimiento controlado de producción. Repetir la validación apropiada en cambios posteriores.

## 6. Complementos opcionales

- **OpenGraph.to:** comprobación puntual de títulos, descripción e imagen al compartir URLs públicas; repetir con el dominio final. No enviar URLs privadas con tokens.
- **`gh-secure`:** ayuda para diagnosticar/configurar protecciones de GitHub. Revisar primero `status` o `--dry-run` y contrastar con reglas existentes; la configuración final es responsabilidad del administrador del repo.
- **Cloudflare security-audit-skill:** complemento para la revisión de código; revisar sus requisitos, alcance y hallazgos antes de adoptar sus conclusiones.
- **TestSprite:** evaluación opcional sobre un alcance pequeño de Staging; adoptar sólo si sus resultados son revisables, reproducibles y justifican costo y mantenimiento.
- **Sentry:** evaluar al preparar operación si los logs/alertas existentes resultan insuficientes. Si se adopta, configurar primero Staging, verificar captura de errores, filtrado de datos y cuotas, y luego separar Producción. No forma parte del paquete gratuito obligatorio.

## 7. Cierre y reconstrucción del repositorio definitivo

El nuevo repo se construye siguiendo las fases 01–08 y sus guías, implementando y verificando cada resultado en orden. Desde la base debe tener lint y CI mínimo; las pruebas y el build se integran conforme existan. La fase 09 se ejecuta al llegar al Staging definitivo. No se heredan estados «concluida» ni evidencias de otro commit o repositorio como validación propia.

La fase 09 cierra cuando el candidato identificado tiene checks aprobados, recorridos y auditorías revisados, hallazgos bloqueantes resueltos y comprobaciones operativas registradas. El responsable acepta la evidencia y los seguimientos. Una lista de herramientas instaladas no cierra la fase.

## Referencias

- [Playwright y trazas](https://playwright.dev/docs/trace-viewer-intro)
- [Accesibilidad con Playwright y axe](https://playwright.dev/docs/accessibility-testing)
- [Lighthouse](https://developer.chrome.com/docs/lighthouse/overview/)
- [ZAP Baseline y ejecución temporal en Docker](https://www.zaproxy.org/docs/docker/)
- [Railway: GitHub autodeploys y Wait for CI](https://docs.railway.com/deployments/github-autodeploys)
- [GitHub Actions: cuotas y facturación](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Dependabot](https://docs.github.com/en/code-security/concepts/supply-chain-security/dependabot-security-updates)
- [OpenGraph.to](https://www.opengraph.to/), [gh-secure](https://github.com/GitHubSecurityLab/gh-secure), [Cloudflare security-audit-skill](https://github.com/cloudflare/security-audit-skill), [TestSprite](https://www.testsprite.com/use-cases/en/ai-staging-testing-tool) y [Sentry](https://docs.sentry.io/)
