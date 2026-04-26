# Migration Notes: Spring Boot -> NestJS

## Security mapping
- Spring `POST /login` with `@RequestHeader("Login-Credentials")` is mapped to Nest `POST /backend/login` with `@Headers('login-credentials')` in `AuthController`.
- Login response contract is preserved as `LoginResultResponseDto` with exact shape `{ logged: boolean, token: string | null }`.
- Spring `userService.validatePasswordAndReturnToken(loginCredential)` behavior is mirrored by base64 header decode (`username:password`), password validation, then JWT generation.
- Failed login returns `{ logged: false, token: null }` to keep frontend compatibility.
- JWT payload now carries Spring-equivalent principal data: `username`, `userId` (`sub`), and `authorities`.
- `JwtStrategy.validate` attaches `request.user` with `username`, `userId`, and `authorities`.
- Spring authority checks are mapped with `@Roles(...)` + `RolesGuard`, validating against `request.user.authorities` values.
- Spring `GrantedRole.authority` persistence is preserved in `GrantedRoleEntity.authority` (no rename to `role`).
- `RoleRepository.findByAuthority(authority)` is preserved in Nest.
- Public security endpoints are preserved with `@Public()` for `/backend/login` and `/backend/registration`; JWT guard remains global for protected routes.
- CORS now explicitly allows `Login-Credentials`, `Authorization`, and `Content-Type` headers for Angular requests.

## Entity/contract equivalence
- Spring `InvoiceSecurityUserDetails` always-enabled/non-expired/non-locked/non-credentials-expired behavior is preserved by keeping those user flags true and not adding extra lock/expiry logic.
- Spring `GrantedRole.getRole()` transient behavior is mirrored via a non-persisted getter (`getRole()`) on `GrantedRoleEntity`.

## Module mapping
- `person`, `invoice`, `report`, `security`, `exception`, `common`, `urls` remain preserved as Nest modules.

## Known TODOs
1. JasperReports PDF engine is Java-specific; report service still uses a placeholder PDF payload and should be replaced with a Node PDF rendering engine for exact parity.
2. Run full integration tests against the production PostgreSQL schema and sample data prior to cutover.
3. Verify DB sequence details (`role_seq` allocation sizing) at migration runtime if strict DDL parity is required.
