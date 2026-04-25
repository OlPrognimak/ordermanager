# Spring Boot → NestJS Migration Notes

## Security migration mapping

| Spring Security | NestJS |
|---|---|
| SecurityFilterChain + requestMatchers | Global `JwtAuthGuard` + route decorators (`@Public`) |
| OncePerRequestFilter (`JwtAuthFilter`) | `JwtAuthGuard` + `JwtStrategy` + `SecurityJwtService` |
| UserDetailsService / UserService | `AuthService` |
| PasswordEncoder (BCrypt 10) | `bcrypt` with configurable salt rounds (`BCRYPT_SALT_ROUNDS`, default 10) |
| AuthenticationEntryPoint / AccessDeniedHandler | `AuthenticatedExceptionFilter` / `ForbiddenExceptionFilter` |
| @PreAuthorize(hasRole(...)) | `@Roles(...)` + `RolesGuard` |
| SecurityContext principal | `request.user` |

## JWT compatibility

- Signing algorithm: HS256 (same family as Spring HMAC256).
- Token claim compatibility: `iss` as username and `role` claim as comma-separated roles.
- Expiration default: 1800 seconds (`JWT_EXPIRES_IN=1800s`) matching Spring `30min` behavior.
- Secret loaded from `.env` (`JWT_SECRET`), equivalent to `app.ordermanager.security.auth-key`.

## Public/protected routes

- Public route bypass implemented with `@Public()`.
- Protected route behavior follows Spring filter chain intent for person/invoice/report routes.

## Data model and schema

- TypeORM entities preserve table and relationship shape used by JPA entities:
  - users ↔ roles (`user_to_role`)
  - person ↔ address (`person_to_address`)
  - person ↔ account (`person_to_account`)
  - invoice ↔ items and supplier/recipient/user links.

## Risks / manual follow-up

1. **Report generation (`/invoice/printreport`)**:
   - JasperReports Java runtime was not directly portable.
   - TODO is kept in `ReportService` to plug in a report-compatible Node implementation.
2. **Legacy table names**:
   - Verify exact PostgreSQL naming strategy (snake_case vs original JPA naming) and adjust `@Entity('...')` values if needed.
3. **Role guard strictness**:
   - Current implementation supports `USER` and `ROLE_USER` checks to match Spring `hasRole('USER')` semantics.
4. **End-to-end regression**:
   - Run API contract tests against existing frontend and previous integration suite.

## Example requests

### Login

```http
POST /login
Login-Credentials: dXNlcjpwYXNz
```

Response:

```json
{ "logged": true, "token": "<jwt>" }
```

### Authenticated call

```http
GET /invoice/invoicesList
Authorization: Bearer <jwt>
```
