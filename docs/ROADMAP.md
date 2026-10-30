# Roadmap reproducible

Este orden muestra las dependencias para construir y publicar el proyecto desde cero. Una fase puede tener código terminado sin tener aún una cuenta externa configurada o una prueba real; esos estados se registran por separado. El [alcance del MVP](MVP_SCOPE.md) define qué se entrega y los [contratos](contracts/) describen el comportamiento.

| Fase | Resultado y requisito para avanzar | Estado observado al 29 oct 2026 |
|---|---|---|
| 01 · Base local | Compose, PostgreSQL, API, frontend, worker y Mailpit arrancan desde un clon. | Código listo. |
| 02 · Alcance | MVP, arquitectura y contratos acordados antes de ampliar flujos. | Documentado. |
| 03 · Landing, catálogo y medios | Catálogo manual, aviso de edad, visitas y claves de imágenes; medios locales y R2 no productivo comprobados. | Código y medios no productivos listos. |
| 04 · Cuentas | Registro, sesión, recuperación, perfil y correo en Mailpit; contratos de seguridad definidos. | Código listo; Turnstile queda para fase 12. |
| 05 · Carritos | Carrito invitado y de cuenta, transferencia y cantidades correctas. | Código listo. |
| 06 · Stripe local | Checkout, pedidos y webhook firmado probados con Stripe CLI y claves de prueba. | Código listo; guía local en [Stripe](stripe.md). |
| 07 · Correo de compra | Trabajo persistido, reintentos, mensaje y un PDF de detalle comprobados en Mailpit. | Código listo. |
| 08 · Dominio y DNS | Identificar zona autoritativa de Neubox/cPanel, inventariar registros y poder añadir los necesarios sin romper el correo existente. | Configuración de envío realizada para staging; guía en [Dominio y DNS](domain-neubox-cpanel.md). |
| 09 · Resend | Verificar dominio, crear clave limitada, configurar remitentes y probar correos reales. Requiere fase 08. | Envío de staging comprobado manualmente; producción pendiente. |
| 10 · Imágenes de despliegue | Dockerfiles de producción, Prisma Client, migración pre-deploy y variables de build documentadas. | Código listo y usado en staging. |
| 11 · Railway staging | Base, API, worker y frontend separados; R2 no productivo y webhook Stripe de prueba públicos. Requiere fases 06, 09 y 10. | Desplegado; compra de prueba con correo y PDF reportada. |
| 12 · Aceptación de staging | Verificar recorridos, seguridad, sesiones en móvil, errores, restauración y Turnstile antes de cerrar staging. | En curso; Turnstile pendiente. |
| 13 · Producción | Recursos, dominio, DNS/TLS, medios, Stripe live, remitentes, copias y rollback propios; salida autorizada. | Pendiente. |

## Qué confirma el estado

El repositorio permite comprobar código, migraciones, variables esperadas y contratos. No prueba por sí solo qué claves o dominios están activos en una cuenta externa. El 29 de octubre de 2026 el responsable del proyecto confirmó una compra de prueba en staging y mostró el correo con PDF recibido. Eso acredita ese recorrido manual; no sustituye la aceptación completa de la fase 12 ni prueba producción.

Cada fase debe cerrarse con tres evidencias: **implementación** (código/contrato), **configuración** (servicios y valores del entorno sin publicar secretos) y **resultado** (una prueba observable). Si falta una, el estado debe decirlo. Los pasos de proveedores viven en sus guías para que el roadmap conserve el orden, no instrucciones duplicadas.

## Puertas de entrada y salida de las fases externas

### 08 · Dominio y DNS

**Entrada:** dominio bajo control y listado de registros vigentes. **Salida:** editor DNS autoritativo identificado, registros de web/correo preservados y cambios de Resend verificables. No cambies *nameservers* por seguir una pantalla equivocada.

### 09 · Resend

**Entrada:** fase 08 y dominio de envío elegido. **Salida:** dominio verificado, clave del worker por entorno, remitentes autorizados y correo de cuenta y compra recibido en una bandeja externa. Revisa cuota y costos antes de aumentar tráfico. [Guía de Resend](resend.md).

### 10 · Imágenes de despliegue

**Entrada:** aplicación local funcional. **Salida:** API y frontend construyen y arrancan en modo producción, worker comparte imagen backend, migración pre-deploy definida y variables de build/runtime identificadas. [Guía de Railway](railway.md).

### 11 · Railway staging

**Entrada:** fases 06, 09 y 10, bucket público no productivo y claves Stripe de prueba. **Salida:** servicios saludables, catálogo visible, webhook público firmado, compra de prueba, pedido, carrito actualizado y correo con PDF. Los precios de demostración sólo se admiten en este entorno aislado.

### 12 · Aceptación de staging

**Entrada:** fase 11 operativa. **Salida:** registro, confirmación, login en otro dispositivo, recuperación, carrito, compras aceptada/cancelada, imágenes, correo, PDF, reintentos y fallos revisados; Turnstile implementado y validado en servidor; procedimiento de copia/restauración revisado. Registra evidencia y pendientes, no una etiqueta general de “sin errores”.

### 13 · Producción

**Entrada:** fase 12 cerrada y autorización de publicación. **Salida:** recursos independientes, precios comerciales aprobados, TLS y DNS correctos, backups y rollback probados, primer pago real controlado y observabilidad activa. Nunca reutilices el SQL de demostración ni los secretos de staging.
