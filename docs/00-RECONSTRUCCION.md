# Fase 00: preparar la reconstrucción del repositorio definitivo

## Objetivo y alcance

Preparar un repositorio nuevo y una referencia estable para reproducir el proyecto por fases. Esta guía es un plan; no acredita que el nuevo repositorio, sus servicios o sus pruebas ya existan. El responsable del proyecto elige el nombre, propietario, visibilidad y ubicación del nuevo repositorio antes de crearlo. No se necesita una cuenta de producción para iniciar el ejercicio local.

## Preparar la referencia

1. En el repositorio de referencia, identifica el commit aprobado que contiene la documentación final y anota su hash. Revisa los PR pendientes y los cambios locales antes de elegirlo. No tomes como aprobados archivos sin commit o una rama sólo por su nombre.
2. Mantén esa copia como referencia de lectura. Revisa `AGENTS.md`, [alcance](MVP_SCOPE.md), [roadmap](ROADMAP.md), [diseño](DESIGN.md), contratos y guías de arquitectura en ese commit.
3. Inventaría los recursos que el proyecto definitivo necesitará: imágenes de `frontend/public/images`, favicon, fuentes y licencias; las rutas y claves de medios están en la [guía R2](architecture/services/R2.md). Comprueba que los archivos necesarios existen y están autorizados para su uso antes de copiarlos. No copies `.env`, credenciales, datos personales, bases, `node_modules` ni artefactos de compilación.
4. Identifica el código de referencia, los contratos, migraciones y pruebas que se consultarán durante las fases. El esqueleto de Compose es una base mínima; no implementa por sí mismo el catálogo, cuentas, carrito, checkout o correo de compra. Cada módulo se implementa y prueba en su fase contra su contrato.

## Crear y organizar el nuevo repositorio

1. El responsable crea el repositorio local y remoto elegido. Configura identidad de Git, rama inicial, acceso y visibilidad de acuerdo con el equipo; registra la URL y el commit de referencia sin copiar secretos. Crear un repo remoto o cambiar sus permisos es una acción independiente de leer esta guía.
2. Incorpora la documentación aprobada conservando su estructura y enlaces. Marca como históricos los estados y URLs del entorno anterior: el nuevo proyecto comienza con sus propias fases, decisiones, commits y evidencias. Adapta rutas y nombres al nuevo repo sin eliminar instrucciones o criterios útiles.
3. Verifica `.gitignore` antes del primer commit y revisa el contenido preparado. Los ejemplos de variables van en `.env.example`; cada entorno crea sus secretos fuera del repositorio. Los valores, cuentas, dominios, buckets y despliegues de referencia no se presuponen existentes en la nueva instalación.
4. Prepara el control de cambios y los checks básicos de CI en GitHub según [Calidad y validación antes de Producción](quality/QUALITY-AND-RELEASE.md). Anota qué está configurado y qué falta; no declares checks obligatorios hasta haberlos creado y comprobado.

## Orden de reconstrucción

| Orden | Resultado | Fuente principal |
|---|---|---|
| 01 | Compose y base local reproducible con lint | [Guía Docker](architecture/docker/COMPOSE.md) |
| 02 | Alcance, arquitectura y secuencia aprobados | [MVP](MVP_SCOPE.md), [roadmap](ROADMAP.md) |
| 03–07 | Landing, cuentas, carrito, checkout y correo implementados por incrementos | [Contratos](contracts/) y fases correspondientes del roadmap |
| 08 | Staging aislado con sus propios servicios y credenciales de prueba | [Railway](architecture/services/RAILWAY.md), guías de proveedores y roadmap |
| 09 | Pruebas de aceptación, accesibilidad, rendimiento, seguridad y operación | [Calidad y salida](quality/QUALITY-AND-RELEASE.md) |
| 10 | Recursos, dominio, operación y aceptación de Producción | [Roadmap](ROADMAP.md#10-producción--planeada) y guías de proveedores |

En cada fase registra objetivo, dependencias, cambios, entorno, fecha, commit, pruebas, resultados y pendientes. Revisa las tarifas y documentación oficiales vigentes antes de contratar o configurar proveedores. Los resultados y URLs históricos de este repositorio son evidencia de referencia, no pruebas del nuevo entorno.

## Criterios de cierre de la fase 00

- Existe un repositorio nuevo identificado y accesible al responsable, con una referencia aprobada y su hash registrados.
- La documentación, recursos y licencias necesarios están inventariados; se verificaron rutas y se excluyeron secretos y datos de entornos anteriores.
- El equipo conoce el orden de fases y cómo registrar evidencia propia; se identificaron los requisitos que deben prepararse antes de cada servicio externo.
- La guía de Compose se ejecuta después, en la fase 01, desde un directorio aislado. Un inventario de la fase 00 no acredita que el stack haya sido construido ni que una fase funcional haya pasado.
