# ordermanager-ui/src-node

Node.js + TypeScript replacement for the `ordermanager-ui` Spring Boot backend.

## Implemented compatibility

- `GET /frontend/backendUrl` -> `{ "url": "..." }`
- Static serving under `/frontend`
- `GET /frontend/management/health`

## Environment variables

- `PORT` (default: `8082`)
- `CONTEXT_PATH` (default: `/frontend`)
- `APP_BACKEND_URL` (preferred backend URL)
- `BACKEND_MICROCERVICE_URL` (legacy-compatible fallback name)
- `STATIC_DIR` (path to Angular build output)

## Commands

```bash
npm install
npm run build
npm start
npm test
```
