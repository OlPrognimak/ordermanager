# Agent Notes

This file is the short-term project memory for coding agents. Read it before making broad changes, then use `doc/project-analysis.md` for the deeper architecture notes.

## Project Snapshot

- `ordermanager` is a Java 21 / Spring Boot 3.5.14 Maven multi-module application.
- Main modules:
  - `ordermanager-backend`: REST API, persistence, authentication, invoice/person/catalog/report logic.
  - `ordermanager-ui`: Spring Boot wrapper for the Angular frontend and backend URL endpoint.
  - `service-discovery`: Eureka server.
  - `docker`: Docker and compose packaging support.
- The Angular app is under `ordermanager-ui/ui/resources/frontend/invoices`.
- A Node.js/Express replacement or gateway prototype exists under `ordermanager-ui/src-node`.

## Common Commands

- Full build: `mvn clean install`
- Full build with Angular profile: `mvn clean install -Pbuild-angular`
- Backend tests only: `mvn test -pl ordermanager-backend`
- Angular commands, from `ordermanager-ui/ui/resources/frontend/invoices`:
  - `npm install`
  - `npm run build`
  - `npm test`
- Node UI backend commands, from `ordermanager-ui/src-node`:
  - `npm run build`
  - `npm test`
  - `npm run dev`

## Runtime Defaults

- Backend: `http://localhost:8083/backend`
- Frontend Spring Boot wrapper: `http://localhost:8082/frontend`
- Eureka service discovery: `http://localhost:8761`
- Backend database default: PostgreSQL on `localhost:5455`, database `test_db`, user/password `test`/`test`.
- Backend Swagger UI: `http://localhost:8083/backend/swagger-ui.html`
- Backend OpenAPI YAML: `http://localhost:8083/backend/v3/api-docs.yaml`

## Important Conventions

- Keep backend domain boundaries aligned with the existing packages: `invoice`, `person`, `report`, `security`, `common`, `exception`, and `utils`.
- Prefer existing service, repository, mapper, validator, and model patterns before adding new abstractions.
- Backend API models live separately from JPA entities. Keep that separation unless a small internal-only endpoint clearly does not need it.
- The frontend uses Angular reactive and template-driven forms. Match the form style used by the component you are editing.
- Reusable Angular controls live in `common-components`; cross-cutting pipes and services live in `common-pipes` and `common-services`.
- Do not edit generated Angular build output in `dist` or copied files under `src/main/resources/static` unless the task is explicitly about packaged output.
- Avoid touching checked-in `node_modules`, crash logs, `.DS_Store`, or generated reports unless the user asks.

## Documentation Notes

- Keep `README.md` as the main public project overview and setup guide.
- Keep `doc/project-analysis.md` as the detailed architecture and maintenance analysis.
- If project structure, ports, build profiles, or core dependencies change, update both README and project analysis.
