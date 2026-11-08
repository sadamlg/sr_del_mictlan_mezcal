# Frontend

Interfaz de la tienda y sus flujos de cuenta, carrito, resumen de compra y pedidos. El proyecto usa Next.js, React y Tailwind CSS 4. La configuración visual está en [`../design.md`](../design.md); la guía principal para iniciar la aplicación está en [`../README.md`](../README.md).

## Comandos

Ejecuta el frontend dentro de Docker Compose, que es el entorno local documentado del repositorio:

```bash
docker compose exec frontend npm run lint
docker compose exec frontend npm test
docker compose run --rm frontend-e2e
```

`npm test` ejecuta las pruebas unitarias de `frontend/tests/`. Playwright ejecuta recorridos de navegador ubicados en `frontend/e2e/`.

## Referencias

El frontend se creó con `create-next-app`. Para consultar conceptos generales del framework y su App Router, revisa la [documentación de Next.js](https://nextjs.org/docs) y [Learn Next.js](https://nextjs.org/learn). La configuración y el despliegue de este proyecto se describen en sus propias guías; el texto del generador sobre Geist y Vercel no describe la configuración actual.
