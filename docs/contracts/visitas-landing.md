# Contador de visitas de la landing

El contador muestra cuántas sesiones del navegador han abierto la landing desde que se habilitó esta tabla. No representa personas únicas ni visitas históricas anteriores a la migración.

Al cargar la página, el navegador genera un UUID y lo guarda en `sessionStorage`. Envía `POST /api/visits` a la ruta del frontend; esta lo reenvía a la API interna. Una recarga reutiliza el UUID y no incrementa la cifra. Al abrir otra pestaña o sesión puede generarse otro UUID. No se guardan IP, cookies ni información personal para este contador.

La API expone `GET /api/visits` para leer `{ "count": 123 }` y `POST /api/visits` con `{ "visitId": "UUID v4" }` para registrar la sesión y devolver el conteo actualizado. Ambos responden con `Cache-Control: no-store`. Un cuerpo inválido responde 400 (`INVALID_VISIT_ID`); una falla de almacenamiento responde 503 (`VISITS_UNAVAILABLE`). La base de datos impone unicidad sobre `visitId`, de modo que los reintentos son idempotentes.

El frontend muestra un guion mientras carga o si el servicio falla; nunca presenta una cifra inventada. Este contador público es orientativo: un cliente puede generar UUID nuevos y sumar visitas. No debe utilizarse como métrica antifraude ni como analítica de usuarios únicos.
