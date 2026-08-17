# Spring Boot 4 Migration TODOs

Created: 2026-08-17

## Scope

This document tracks the work needed to migrate `ordermanager` from Spring Boot 3.5.x to Spring Boot 4.x.

Current project baseline after the initial Boot 4 migration:

- Java 21.
- Spring Boot parent: `4.1.0`.
- Spring Cloud BOM: `2025.1.2` / Oakwood.
- Maven multi-module app: `ordermanager-backend`, `ordermanager-ui`, `service-discovery`, `docker`.
- Servlet MVC stack, Spring Security, Spring Data JPA/Hibernate, Liquibase, springdoc-openapi, Spring Cloud Netflix Eureka.
- Angular app under `ordermanager-ui/ui/resources/frontend/invoices` and a Node.js UI-backend prototype under `ordermanager-ui/src-node`.

Reference sources checked on 2026-08-17:

- Spring Boot 4.0 migration guide: https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Migration-Guide
- Spring Boot 4.0 release notes: https://github.com/spring-projects/spring-boot/wiki/Spring-Boot-4.0-Release-Notes
- Spring Boot 4.1 release announcement: https://spring.io/blog/2026/06/10/spring-boot-4
- Spring Cloud compatibility matrix: https://spring.io/projects/spring-cloud/
- Spring Cloud 2025.1.2 release announcement: https://spring.io/blog/2026/06/11/spring-cloud-2025-1-2-aka-oakwood-has-been-released/
- Spring Security 7 migration entry point: https://docs.spring.io/spring-security/reference/migration/index.html

## Local Boot 4 Reference: `market-bot`

Checked local project: `/Users/alexadmin/Desktop/work/projects/market-bot`.

Useful patterns from `market-bot`, which is already on Spring Boot `4.0.6`:

- [x] Use Boot-managed dependency versions wherever possible.
  - `market-bot` does not pin Jackson, PostgreSQL, Spring Security, validation, or test starter versions.
  - Apply the same principle to `ordermanager` before upgrading.
- [x] Consider MapStruct `1.6.3` plus `org.projectlombok:lombok-mapstruct-binding:0.2.0`.
  - `market-bot` uses this successfully with Boot 4 and Lombok annotation processing.
- [x] Prefer `spring-boot-starter-liquibase` over manually adding `liquibase-core`.
  - `market-bot` uses the starter, which is better aligned with Boot auto-configuration.
- [ ] Use record-based `@ConfigurationProperties` classes with `@Validated` for application settings.
  - Example pattern in `market-bot`: `AppSecurityProperties` has `@ConfigurationProperties("app.security")` and validation annotations.
  - For `ordermanager`, this is useful for security settings, report settings, backend URL settings, and CORS origins.
- [ ] Simplify security configuration.
  - `market-bot` has one `PasswordEncoder` bean typed as `PasswordEncoder`.
  - It uses one `CorsConfigurationSource` and wires it through `http.cors(...)`.
  - It uses explicit `authenticationEntryPoint` and `accessDeniedHandler` responses.
  - Its JWT filter clears the `SecurityContext` and lets the request continue unauthenticated when token parsing fails, leaving final 401/403 handling to Spring Security.
- [ ] Consider a hardened Docker runtime pattern.
  - `market-bot` uses `eclipse-temurin:21-jre-alpine`.
  - It creates a non-root application user and runs the jar as that user.

Do not copy these parts directly:

- `market-bot` uses both WebFlux and MVC dependencies while forcing `spring.main.web-application-type=servlet`; `ordermanager` should remain MVC-only unless a real reactive client requirement is added.
- `market-bot` does not use Spring Cloud/Eureka, so it does not solve the `ordermanager` Cloud release train migration.
- `market-bot` still uses `spring.jpa.hibernate.ddl-auto=update`; `ordermanager` should still move toward Liquibase-owned schema management.

## Target Versions

- [x] Choose the target Boot line:
  - Preferred target as of 2026-08-17: Spring Boot `4.1.x`, because `4.1.0` is available and includes fixes from `4.0.7`.
  - Conservative target: Spring Boot `4.0.7` first, then `4.1.x`.
- [x] Update parent POM from `org.springframework.boot:spring-boot-starter-parent:3.5.14` to the selected `4.x` release.
- [x] Update Spring Cloud BOM from `2025.0.0` to `2025.1.2` or newer `2025.1.x`.
  - Spring Cloud `2025.0.x` is for Boot `3.5.x`.
  - Spring Cloud `2025.1.x` / Oakwood is for Boot `4.0.x`, and from `2025.1.2` also Boot `4.1.x`.
- [x] Keep Java at `21`. Boot 4 requires Java 17+, and this project is already above that minimum.
- [x] Remove `spring-milestones` and `spring-snapshots` plugin repositories unless a specific milestone/snapshot is intentionally used. Boot 4 GA artifacts are in Maven Central.

## Parent POM Dependency Cleanup

The parent POM currently overrides several versions managed by Spring Boot. These overrides increase migration risk because Boot 4 manages versions aligned with Spring Framework 7 and Jakarta EE 11.

- [x] Remove explicit `<version>3.5.14</version>` from `spring-boot-starter-security`; let the Boot parent manage it.
- [x] Remove or re-evaluate explicit `hibernate-core` override `6.2.3.Final`.
  - Boot 4 uses the Hibernate generation compatible with Jakarta EE 11. Pinning Hibernate 6.2 can break JPA integration.
- [x] Remove explicit Jackson `2.15.2` overrides for `jackson-dataformat-xml` and `jackson-dataformat-yaml`, unless a compatibility test proves they must stay.
- [x] Remove explicit Log4j2 `2.20.0` overrides unless there is a hard requirement. Use Boot-managed Log4j2 versions.
- [x] Remove explicit H2 `2.1.214` and PostgreSQL `42.6.0` overrides unless needed. Use Boot-managed versions first.
- [x] Re-check `jakarta.validation-api`, `hibernate-validator`, and `jakarta.annotation-api` overrides. Boot 4 aligns to Jakarta EE 11; manual pins should be removed unless needed.
- [x] Re-check `liquibase-core` `5.0.2`. If Boot 4 manages Liquibase, prefer the managed version.
- [ ] Upgrade or validate non-Boot-managed libraries:
  - `org.mapstruct:mapstruct` / processor is now `1.6.3` with `lombok-mapstruct-binding` `0.2.0`.
  - `net.sf.jasperreports:jasperreports` `6.20.5`: verify transitive dependencies under Java 21 and Boot 4.
  - `com.auth0:java-jwt` `4.4.0`: verify current supported version and security advisories.
  - `io.cucumber` `7.14.0`: update if tests fail with JUnit Platform / Boot 4 test stack.

## Maven Plugin TODOs

- [ ] Remove duplicated plugin management between parent and child modules where possible.
- [ ] Upgrade old Maven plugins:
  - `maven-javadoc-plugin` `2.10.3` is very old.
  - `maven-install-plugin` `2.5.2` and `maven-deploy-plugin` `2.8.2` are old.
  - `maven-antrun-plugin` `1.8` is old; use a current version or replace copy/delete tasks with Maven resources/assembly/Jib.
  - `com.spotify:docker-maven-plugin:0.3.7` is obsolete. Prefer Jib, Docker Buildx, or a maintained Maven Docker plugin.
- [ ] Run `mvn -U clean test` after version changes to expose compiler, surefire, and plugin incompatibilities.
  - Initial validation run completed with `mvn -pl ordermanager-backend test` and `mvn -pl ordermanager-ui,service-discovery compile -DskipTests`.

## `service-discovery` POM Fixes

`service-discovery/pom.xml` contains malformed XML-like text that should be fixed before a Boot 4 migration:

- [ ] Replace `maven.compiler.targƒet` with `maven.compiler.target`.
- [ ] Replace `<Ïexclude>` / `</Ïexclude>` with `<exclude>` / `</exclude>`.
- [ ] Remove direct `org.springframework:spring-web` dependency unless there is a concrete reason. `spring-boot-starter-web` already brings it.
- [x] Verify `spring-cloud-starter-netflix-eureka-server` works with Spring Cloud Netflix `5.0.x` from the `2025.1.x` BOM.
  - Compile validation passed for `service-discovery`; runtime registration still needs an environment smoke test.

## Spring Security 7 TODOs

Current backend security is in `ordermanager-backend/src/main/java/com/pr/ordermanager/security/controller/SecurityConfig.java`.

- [x] Migrate and test against Spring Security 7 from the selected Boot 4 release.
  - Backend tests start the application context on Spring Boot 4.1.0 / Spring Framework 7.0.8.
- [ ] Keep `SecurityFilterChain` configuration style. The project already uses the modern bean-based style, not `WebSecurityConfigurerAdapter`.
- [ ] Revisit `web.ignoring()` usage.
  - Current ignored paths: `/registration`, `/login`, `/invoice/report`, `/management`, `/polyfills.js`.
  - Prefer `permitAll()` inside `authorizeHttpRequests` where possible so security headers, CORS, and filter behavior stay consistent.
- [ ] Add explicit authorization rule for actuator endpoints after checking the Boot 4 actuator endpoint paths.
  - Current config exposes all actuator endpoints with `management.endpoints.web.exposure.include=*`.
  - Decide whether management endpoints remain public, authenticated, or environment-restricted.
- [ ] Review CORS setup.
  - Current config allows credentials with `addAllowedOriginPattern("*")`.
  - Define explicit allowed origins for local/dev/prod before migration testing.
  - Remove duplicated CORS mechanisms if possible: `WebMvcConfigurer` plus a manually registered `CorsFilter`.
  - Use the `market-bot` pattern as a starting point: one `CorsConfigurationSource` bean and `http.cors(cors -> cors.configurationSource(...))`.
- [ ] Review custom JWT filter behavior.
  - `JwtAuthFilter` throws an application exception on invalid tokens. Verify Boot 4/Security 7 still maps this as intended and does not produce inconsistent 500 responses.
  - Consider returning a proper `AuthenticationEntryPoint` 401 response.
  - The `market-bot` pattern is safer for Security 7: token parse/authentication failures clear the `SecurityContext`, log the failure, and let Spring Security produce the final 401/403 through configured handlers.
- [ ] Review `InvoiceUsernamePasswordAuthenticationFilter`.
  - It calls `request.getSession()` even though security is configured as stateless.
  - It parses Basic auth with `substring(6)` and no scheme validation. Replace or remove if unused.
- [ ] Remove duplicate password encoder beans.
  - Current config defines `bCryptPasswordEncoder()` and `passwordEncoder()`.
  - Keep a single `PasswordEncoder` bean, preferably declared as `PasswordEncoder`, matching the working `market-bot` style.
- [ ] Add explicit `authenticationEntryPoint` and `accessDeniedHandler`.
  - Use stable 401/403 responses rather than relying on exception propagation from custom filters.
- [ ] Add/refresh integration tests for:
  - unauthenticated API access returns 401/403 as expected,
  - login/registration paths,
  - Swagger/OpenAPI access,
  - preflight `OPTIONS`,
  - JWT-authenticated GET/POST/PUT/DELETE,
  - management endpoint policy.

## Spring Cloud / Eureka TODOs

- [x] Move all modules using Cloud to Spring Cloud `2025.1.2` or newer.
- [ ] Validate Eureka client registration for:
  - `ordermanager-backend`,
  - `ordermanager-ui`,
  - `service-discovery`.
- [ ] Verify existing Eureka properties still bind:
  - `eureka.client.serviceUrl.defaultZone`,
  - `eureka.instance.status-page-url-path`,
  - `eureka.instance.health-check-url-path`,
  - `eureka.instance.hostname`.
- [ ] Re-check the service-discovery YAML property `management.security.enabled=false`.
  - This is an old-style property and likely ineffective. Replace with explicit Security auto-configuration decisions and actuator endpoint configuration.
- [ ] Decide whether Eureka is still required.
  - If the frontend always uses configured `app.backend.url`, Eureka may not be needed there.
  - If Docker/Kubernetes is the target, compare Eureka with platform-native service discovery.

## Jakarta EE 11 / Servlet 6.1 TODOs

Boot 4 is based on Jakarta EE 11 and Servlet 6.1. The source code is already mostly migrated to `jakarta.*`.

- [ ] Search before migration for remaining `javax.*` imports.
  - Current source hit: `javax.sql.DataSource`, which is correct because JDBC still uses `javax.sql`.
- [ ] Verify all servlet filters compile against Servlet 6.1:
  - `InvoiceCorsFilter`,
  - `JwtAuthFilter`,
  - `InvoiceUsernamePasswordAuthenticationFilter`,
  - `InvoiceRedirectUrl`,
  - `InvoiceAuthenticationSuccessHandler`.
- [ ] Verify all validation annotations and exception handling still behave under Jakarta Validation versions managed by Boot 4.

## Persistence / Hibernate / Liquibase TODOs

- [ ] Remove the direct `hibernate-core` dependency unless the app directly needs Hibernate APIs. `spring-boot-starter-data-jpa` should manage Hibernate.
- [ ] Verify entity mappings under the Boot 4 Hibernate version:
  - `invoice` entities,
  - `person` entities,
  - `security` entities,
  - shared `AbstractEntity`.
- [ ] Replace `spring.jpa.hibernate.ddl-auto=update` for production-like environments.
  - Use Liquibase changelogs as the primary schema migration mechanism.
- [ ] Run schema migration tests against PostgreSQL and H2 after dependency upgrades.
- [ ] Confirm H2 dialect/test behavior, because H2 version upgrades often expose SQL and reserved-word differences.
- [ ] Keep `spring.jpa.database-platform=org.hibernate.dialect.PostgreSQLDialect` only if needed. Hibernate can usually infer dialect from JDBC metadata.
- [ ] Review circular dependencies because `spring.main.allow-circular-references=true` masks design issues that may become harder to debug on Boot 4.

## Web MVC / REST TODOs

- [ ] Compile all controllers against Spring Framework 7:
  - invoice,
  - person,
  - report,
  - security.
- [ ] Review exception handling in `GlobalExceptionHandler`.
  - Consider using `ProblemDetail` only if changing API error format is acceptable.
  - If keeping current `ResponseException`, add regression tests for error JSON.
- [ ] Review REST client use.
  - Backend defines a `RestTemplate` bean.
  - Tests use `RestTemplate` and `TestRestTemplate`.
  - No immediate migration blocker, but new development should prefer `RestClient` unless the existing code style requires `RestTemplate`.

## OpenAPI / Swagger TODOs

- [ ] Verify `org.springdoc:springdoc-openapi-starter-webmvc-ui` version compatibility with Boot 4 / Spring Framework 7.
- [ ] Keep OpenAPI paths permitted in security:
  - `/v3/api-docs/**`,
  - `/v3/api-docs.yaml`,
  - `/v3/api-docs.json`,
  - `/swagger-ui/**`,
  - `/swagger-ui.html`.
- [ ] Run the backend and check:
  - `http://localhost:8083/backend/swagger-ui.html`,
  - `http://localhost:8083/backend/v3/api-docs.yaml`.

## Actuator / Observability TODOs

- [ ] Revisit `management.endpoints.web.exposure.include=*` in backend and UI.
  - Use explicit endpoint exposure for production.
- [ ] Verify `management.endpoints.web.base-path=/management` still gives the desired URLs under each servlet context path.
- [ ] Decide whether Boot 4 OpenTelemetry/observability features should be added.
  - Current project uses actuator but does not appear to use tracing/metrics export.
- [ ] Add smoke checks for health endpoint URLs advertised to Eureka.

## Logging TODOs

- [ ] Prefer Boot-managed Log4j2 versions.
- [ ] Verify `ordermanager-backend/src/main/resources/log4j2.xml` against current Log4j2.
- [ ] Review `server.tomcat.accessLogEnabled` and `server.tomcat.accessLogPattern`.
  - Confirm property names with Boot 4 configuration metadata.
  - Current access log pattern contains test text: `"%a asdasd"`.

## Reporting / JasperReports TODOs

- [ ] Verify JasperReports with Java 21 and the Boot 4 dependency set.
- [ ] Check for transitive dependency conflicts with:
  - XML parsers,
  - Jackson,
  - commons libraries,
  - fonts/AWT headless behavior.
- [ ] Run `JasperReportServiceTest` and generate a sample invoice PDF after migration.

## Frontend Wrapper / Angular TODOs

The Angular app does not directly depend on Spring Boot, but packaging and runtime URL behavior do.

- [ ] Verify `ordermanager-ui` still serves `/backendUrl` under `/frontend`.
- [ ] Re-check exclusion imports in `AngularFrontendApplication`:
  - `SecurityAutoConfiguration`,
  - `ManagementWebSecurityAutoConfiguration`,
  - `DataSourceAutoConfiguration`.
- [ ] Run Angular build with the Maven profile:
  - `mvn clean install -Pbuild-angular`.
- [ ] Consider updating Angular separately from the Boot migration. Current Angular package versions are `19.x`; do not combine a major Angular migration with Boot 4 unless necessary.
- [ ] Keep generated output out of manual edits:
  - `ordermanager-ui/ui/resources/frontend/invoices/dist`,
  - `ordermanager-ui/src/main/resources/static`.

## Node Prototype TODOs

- [ ] Keep `ordermanager-ui/src-node` outside the Boot migration unless replacing the Spring UI wrapper is part of the release.
- [ ] If Docker images are released together, run:
  - `npm run build`,
  - `npm test`.

## Docker / Runtime TODOs

- [ ] Verify Docker base images include Java 21 or newer.
- [ ] Consider copying the `market-bot` Docker runtime hardening pattern:
  - use a Java 21 JRE base image,
  - create a non-root application user,
  - run the jar as that user.
- [ ] Rebuild all jars and images after Boot 4 migration:
  - backend,
  - frontend wrapper,
  - discovery server.
- [ ] Verify Docker Compose service names still match properties:
  - backend expects Eureka at `http://discovery:8761/eureka/`,
  - UI expects Eureka at `http://discovery:8761/eureka/`,
  - backend database defaults to PostgreSQL on `localhost:5455` outside Docker.
- [ ] Replace checked-in jar artifacts under `docker/*/*.jar` only as part of a deliberate packaging step.

## Testing Plan

- [ ] Baseline before changing versions:
  - `mvn clean test`
  - `mvn test -pl ordermanager-backend`
  - `npm test` from `ordermanager-ui/ui/resources/frontend/invoices`
  - `npm test` from `ordermanager-ui/src-node`
- [ ] Migration compile loop:
  - update parent Boot version,
  - update Spring Cloud BOM,
  - remove dependency overrides,
  - run `mvn -U clean test`,
  - fix compile errors module by module.
- [ ] Runtime smoke tests:
  - start Eureka at `http://localhost:8761`,
  - start backend at `http://localhost:8083/backend`,
  - start frontend wrapper at `http://localhost:8082/frontend`,
  - verify backend health and Swagger,
  - verify frontend `/frontend/backendUrl`,
  - verify Eureka registration for backend and UI.
- [ ] Functional backend tests:
  - registration/login/JWT,
  - person CRUD,
  - invoice CRUD,
  - item catalog,
  - invoice report PDF,
  - validation failures,
  - global exception responses.

## Suggested Migration Order

- [ ] Prepare a dedicated branch.
- [ ] Fix malformed POM entries in `service-discovery`.
- [ ] Remove unnecessary dependency and plugin version overrides while still on Boot 3.5.x, then run tests.
- [ ] Upgrade to latest Boot 3.5 patch if available, then run tests.
- [ ] Upgrade Spring Boot to selected 4.x target and Spring Cloud to `2025.1.x`.
- [ ] Fix compilation and dependency resolution.
- [ ] Fix Spring Security 7 behavior and actuator exposure.
- [ ] Validate persistence, Liquibase, and report generation.
- [ ] Validate Eureka registration and Docker runtime.
- [ ] Update `README.md` and `doc/project-analysis.md` after final versions, ports, build commands, or dependency decisions change.

## Known Project-Specific Risks

- [ ] Explicit version overrides in the parent POM can keep old Boot 3-era dependencies on the classpath.
- [ ] `service-discovery/pom.xml` contains malformed tag/property text and should be corrected before migration.
- [ ] Security config has duplicated CORS, duplicated password encoders, ignored security paths, and stateless/session mismatch in `InvoiceUsernamePasswordAuthenticationFilter`.
- [ ] Actuator endpoints are fully exposed in backend and UI.
- [ ] Eureka is present in all Java modules, so Boot and Cloud versions must be upgraded together.
- [ ] JasperReports may be the most fragile non-Spring dependency because of older transitive dependencies and PDF/font behavior.
- [ ] `spring.main.allow-circular-references=true` may hide bean design issues that should be fixed during or after migration.
