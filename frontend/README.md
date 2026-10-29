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
