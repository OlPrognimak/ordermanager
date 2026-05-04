# Migration Notes: Spring Boot -> NestJS

## Security mapping
- Spring `SecurityFilterChain` + `JwtAuthFilter` migrated to global `JwtAuthGuard` + `JwtStrategy`.
- Spring `@PreAuthorize("hasRole('USER')")` migrated to `@Roles('ROLE_USER')` + `RolesGuard`.
- Spring `UserService.validatePasswordAndReturnToken` migrated to `AuthService.loginWithHeader`.
- Spring `BCryptPasswordEncoder(10)` migrated to `bcrypt.compare/hash` with 10 salt rounds.
- Spring `OrderManagerException` + global handler migrated to `OrderManagerException` + global filters.

## Module mapping
- `person`, `invoice`, `report`, `security`, `exception`, `common`, `urls` are preserved as Nest modules.
- DTO names and response contracts kept equivalent (e.g. `CreatedResponse`, `LoginResultResponse`, `DropdownDataType`).

## Known TODOs
1. JasperReports PDF engine is Java-specific; report service now returns a placeholder PDF byte payload with same endpoint contract. Replace with a Node PDF template engine (e.g. pdfmake + handlebars) for exact rendering parity.
2. Add integration tests against the existing PostgreSQL schema dump before production cutover.
3. Validate all enum/string edge cases for historical data.
