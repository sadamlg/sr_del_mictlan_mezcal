# Auditoría de la documentación para reconstrucción

## Alcance y resultado

Revisión del 11 de noviembre de 2026 del alcance, roadmap, diseño, contratos, arquitectura, Compose, proveedores y guías de operación del repositorio de referencia. Se revisaron enlaces locales y sintaxis de bloques de shell, y se ejecutó una reconstrucción aislada del esqueleto de la fase 01. Esta revisión no constituye una reconstrucción completa de las fases 02–10 ni acredita servicios externos del repositorio definitivo.

**Conclusión:** la documentación es una base para iniciar la reconstrucción, pero todavía no hay evidencia para afirmar que se puede completar y aceptar el producto definitivo de principio a fin sin trabajo adicional. Los contratos describen resultados que deben implementarse; no son una aplicación generada automáticamente. El nuevo repositorio debe registrar sus propias decisiones, pruebas y aceptación.

## Cobertura por fase

| Fase | Material revisado | Evidencia y trabajo pendiente |
|---|---|---|
| 00 | [Preparación](00-RECONSTRUCCION.md), instrucciones y recursos | Guía añadida para elegir un commit de referencia, inventariar activos y preparar el repositorio. No se creó el repositorio definitivo ni se verificaron licencias o permisos de todos los activos. |
| 01 | [Compose](architecture/docker/COMPOSE.md) | Esqueleto reconstruido y comprobado en entorno aislado según se detalla abajo. Falta configurar y verificar CI en el nuevo repositorio; resolver o aceptar explícitamente los avisos de dependencias. |
| 02 | [Alcance](MVP_SCOPE.md), [diseño](DESIGN.md), rutas y SEO | Se revisó la secuencia y se corrigió la descripción de sesión posterior a confirmar registro. El equipo debe aprobar alcance y decisiones para el nuevo producto. |
| 03 | [Landing y catálogo](contracts/03-LANDING.md), medios y diseño | Existe contrato y código de referencia. Implementar catálogo, datos, recursos visuales y pruebas en el nuevo repo; no se reconstruyó ni probó la fase completa. |
| 04 | [Cuentas](contracts/04-ACCOUNTS-PROFILE.md), rutas y Turnstile | Existe contrato; se aclaró dónde configurar las claves locales. Implementar y probar sesiones, correo y controles con claves de prueba; validar challenge real en staging. |
| 05 | [Carritos](contracts/05-CARTS.md) | Existe contrato, incluidas fusión y persistencia. Implementar y probar sus casos en el nuevo repo y comprobar integración con checkout. |
| 06 | [Checkout y pedidos](contracts/06-CHECKOUT-ORDERS.md), Stripe | Se corrigieron las instrucciones de pruebas de base de datos y la ruta de consulta de retorno. Implementar y probar webhook, idempotencia y compra de prueba completa; no se ejecutó aquí un pago. |
| 07 | Contratos de cuenta y checkout, [Resend](architecture/services/RESEND.md) | Se describe cola, correo y PDF. Implementar y verificar reintentos, adjuntos y entrega real en el entorno correspondiente; la prueba SMTP de fase 01 no acredita estos flujos. |
| 08 | [Railway](architecture/services/RAILWAY.md) y guías de proveedores | Se distinguieron observaciones históricas de la configuración necesaria para el entorno nuevo. Crear y validar recursos aislados y recorrido completo; no se modificaron cuentas ni se verificó su estado actual. |
| 09 | [Calidad y salida](quality/QUALITY-AND-RELEASE.md) | Herramientas y criterios planificados; todavía deben configurarse suites, CI y evidencias en el nuevo repo. No se ejecutaron Playwright, axe, Lighthouse ni ZAP como parte de esta auditoría. |
| 10 | Roadmap y guías de dominio, costos y operación | La salida exige recursos propios, precios aprobados, recuperación, monitoreo y autorización. No se desplegó ni se validó producción. Tarifas y servicios deben comprobarse nuevamente en fuentes y cuentas vigentes. |

## Prueba reproducida de la fase 01

Se creó un directorio temporal independiente, con nombre de proyecto y puertos distintos de los del entorno habitual. Se siguieron los ejemplos documentados y se construyeron las imágenes en serie con límites de memoria; se usó un archivo temporal de límites de memoria y puertos alternativos. No es una prueba con los puertos predeterminados ni prueba una máquina limpia sin imágenes previamente descargadas.

- El orden anterior de instalación de ESLint provocó `ERESOLVE` en el frontend generado. Se corrigió la guía para quitar primero `eslint-config-next` y se repitió con éxito la generación del lockfile.
- PostgreSQL, Mailpit, backend, worker y frontend alcanzaron estado saludable. `/health` y la página inicial devolvieron HTTP 200; Prisma validó el esquema, ambos lint terminaron correctamente y Mailpit recibió un mensaje SMTP de prueba.
- Se añadió la creación explícita de `frontend/tests` antes de que Compose monte ese directorio.
- Las instalaciones del esqueleto notificaron cuatro vulnerabilidades moderadas transitivas relacionadas con `minimatch` en la cadena de ESLint. No se aplicó `npm audit fix --force`: propone cambios mayores que pueden alterar versiones. Al reconstruir, revisar el advisory y versiones compatibles, corregir sin romper el stack o registrar una aceptación de riesgo responsable. No confundir estas alertas con fallos confirmados de producción.
- Se eliminaron los contenedores, red y volumen del proyecto de prueba. El stack habitual permaneció en ejecución y saludable.

## Brechas que deben cerrarse en el repositorio definitivo

1. **CI:** no hay workflow versionado en este repositorio de referencia. La guía describe lo que debe comprobar, pero no entrega una implementación ejecutada en GitHub. Crear el workflow desde la base, verificarlo con PR y push y configurar las protecciones después de comprobar sus checks. Al incorporar módulos, añadir pruebas reales, PostgreSQL aislado y build al pipeline; no presentar un workflow propuesto como ejecutado.
2. **Dependencias:** revisar los avisos moderados de la prueba y sus versiones al crear el nuevo repo. Registrar resultado de `npm audit`, decisión y fecha para cada lockfile.
3. **Recursos y propiedad:** comprobar existencia, licencias y autorización de imágenes, fuentes y marca antes de transferirlos. Elegir repositorio, dominios y cuentas propios; los nombres y estados históricos no son instrucciones para reutilizar recursos ajenos.
4. **Implementación y aceptación:** reconstruir fases 03–07 contra contratos y referencia, con migraciones y pruebas propias; después ejecutar staging, fase 09 y salida de producción. Registrar commit, entorno, comandos, resultados y limitaciones en cada fase.
5. **Operación:** definir y ensayar backups/restauración, observabilidad y rollback con los recursos reales elegidos. Revisar documentación oficial y tarifas vigentes; la documentación histórica no sustituye la configuración de las cuentas.

No se copiaron secretos ni datos de usuarios para la prueba. Los estados «concluida» del roadmap corresponden al proyecto de referencia y no cierran automáticamente ninguna fase del repositorio definitivo.
