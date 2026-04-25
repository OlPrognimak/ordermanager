# Order Manager Backend (NestJS Migration)

This module is a NestJS migration of the Spring Boot `AngularBackendApplication` backend.

## Run

```bash
cp .env.example .env
npm install
npm run start:dev
```

## Security behavior preserved

- `POST /login` accepts `Login-Credentials` header (`base64(username:password)`) and returns `{ logged, token }`.
- JWT is required on protected routes as `Authorization: Bearer <token>`.
- JWT claims preserve Spring semantics: issuer (`username`) + `role` claim.
- `POST /registration` creates user with bcrypt hash (10 salt rounds by default).
- Public routes: `/auth/**`, `/login`, `/registration`, OpenAPI URLs, and CORS preflight equivalent behavior.

## Main migrated endpoints

- Person: `/person`, `/persons`, `/person/personsdropdown`, `/person/personsListPeriod`
- Invoice: `/invoice`, `/invoice/invoicesList`, `/invoice/invoicesListPeriod`, `/invoice/itemcatalog/**`
- Report: `/invoice/printreport` (contract preserved; implementation TODO, see migration notes)

## Auth flow example

```bash
# 1) login
curl -X POST http://localhost:8080/login \
  -H 'Login-Credentials: YWRtaW46cGFzc3dvcmQ='

# 2) use token
curl http://localhost:8080/invoice/invoicesList \
  -H 'Authorization: Bearer <JWT_TOKEN>'
```
