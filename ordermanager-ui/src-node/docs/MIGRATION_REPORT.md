# ordermanager-ui Java ➜ Node.js Migration Report

## 1) Spring Boot backend inspection (`ordermanager-ui/src`)

### Application bootstrap
- `AngularFrontendApplication` is the only Spring Boot application class.
- It starts on port `8082` under context path `/frontend`.
- It excludes JDBC and Spring Security auto-configuration.

### Controllers
- Only one controller endpoint exists in this module:
  - `GET /backendUrl` (effective URL: `/frontend/backendUrl`) returning `{ "url": "..." }`.

### Services / repositories / DTOs / entities
- No service layer classes in this module.
- No JPA repositories in this module.
- One DTO-like model exists: `UrlTransfer { url: string }`.
- No domain entities are implemented in this module.

### Config
- `application.properties` defines:
  - `server.port=8082`
  - `server.servlet.context-path=/frontend`
  - `backend.microcervice.url` (note original typo)
  - `app.backend.url` fallback to Azure backend URL
  - actuator and eureka properties.

### Security
- Spring Security is intentionally excluded for this module.
- The only role of this backend is providing backend URL discovery and static UI hosting.

### Schedulers/jobs
- None found.

### File/report/PDF logic
- None found in this module.
- PDF/report logic is consumed by Angular against the remote backend URL (`invoice/printreport`) and belongs to another service.

## 2) Angular backend usage inspection (`ordermanager-ui/ui`)

### URL bootstrap behavior
- Angular calls `GET backendUrl` (relative URL) at startup.
- On success, it stores `response.url` to `localStorage.remoteBackendURL`.
- On failure, it falls back to `environment.baseUrl`.

### Auth/session behavior against remote backend
- Login: `POST {remoteBackendURL}login` with `Login-Credentials` header.
- Session check: `GET {remoteBackendURL}checkUser`.
- Logout: `POST {remoteBackendURL}perform_logout`.
- Basic auth token is stored in localStorage and attached by interceptor.

### API contract expectations
- UI expects this module to expose exactly a JSON object with `url` field.
- Remaining invoice/person/catalog/report endpoints are called directly against `remoteBackendURL`.

### File/PDF behavior
- Angular requests PDF via `POST {remoteBackendURL}invoice/printreport` as blob and opens returned PDF in browser.
- No upload handling in this module.

## 3) Node.js replacement design

### Selected stack
- Node.js + TypeScript + Express.
- Modular split:
  - `config` (`env.ts`)
  - `controllers` (`backend-url.controller.ts`, `management.controller.ts`)
  - `middleware` (`error-handler.ts`)
  - `app.ts` composition + `main.ts` bootstrap

### Contract-preserving decisions
- Keep same context path default: `/frontend`.
- Keep endpoint path and payload:
  - `GET /frontend/backendUrl` -> `{ "url": string }`.
- Preserve legacy property naming compatibility (including typo):
  - `BACKEND_MICROCERVICE_URL` (maps old `backend.microcervice.url`).
  - `APP_BACKEND_URL` overrides it.
- Keep static hosting and SPA fallback under `/frontend/*`.
- Add lightweight health endpoint `/frontend/management/health` for operational parity with old actuator health checks.

## 4) Implementation progress

### Completed
- Created new backend scaffold in `ordermanager-ui/src-node`.
- Implemented environment-based config and endpoint compatibility.
- Implemented Express bootstrap and error-handling middleware.
- Added compatibility tests with `supertest` + `vitest`.

### In-progress / pending
- Runtime validation in this environment was blocked by restricted npm registry access (`403` on package install).

## 5) Unresolved gaps

1. **Eureka client integration**
   - Spring version had eureka properties; Node scaffold does not yet register with discovery service.
2. **Actuator breadth**
   - Only `/management/health` was mirrored, not full actuator surface.
3. **Container/build wiring**
   - Existing Maven/docker flow still packages Java service; CI/CD must be updated to build `src-node` runtime image.

## 6) Deployment steps (proposed)

1. Build Angular assets as before.
2. Build Node service:
   - `cd ordermanager-ui/src-node`
   - `npm ci && npm run build`
3. Run with env:
   - `PORT=8082`
   - `CONTEXT_PATH=/frontend`
   - `APP_BACKEND_URL=...` (or `BACKEND_MICROCERVICE_URL=...`)
   - `STATIC_DIR=/path/to/angular/dist`
4. Smoke test:
   - `GET /frontend/backendUrl`
   - `GET /frontend/management/health`
   - open `/frontend/` and verify Angular loads.

## 7) Rollback plan

1. Keep existing Spring Boot artifact and deployment descriptors untouched.
2. Deploy Node backend behind a toggle / separate deployment slot.
3. If any compatibility issue appears:
   - route traffic back to Spring service,
   - keep Angular unchanged,
   - compare `/frontend/backendUrl` responses and logs.
4. Roll forward after patching Node compatibility gaps.
