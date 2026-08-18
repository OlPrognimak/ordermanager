# Ordermanager Project Review and Recommendations

Date of review: 2026-06-10
Reviewer: Automated code & documentation audit
Scope: Full repository (`ordermanager-backend`, `ordermanager-ui`, `ordermanager-ui/src-node`, `service-discovery`, `docker`, top-level POM and docs).
Type of review: Read-only analysis. No code changes performed.

---

## 1. Executive Summary

The project is a Java 21 / Spring Boot 3.5.7 multi-module application with an Angular 18 frontend, a Spring Boot UI wrapper, a Node.js/Express UI prototype, a Eureka service-discovery module, and a Docker deployment stack. The codebase is functional but contains a significant number of **security weaknesses**, **dependency-version inconsistencies**, **dead/duplicate configuration**, **broken or misleading code**, and **documentation drift**. Several issues are high-impact (authentication bypasses, weak default secrets, broken role authority, IDOR-style missing ownership checks). Others are quality issues (typos, dead code, stale comments, ignored profiles).

The recommendations are grouped by severity to make them easy to triage:

- **Section 3** — Critical/Security issues that should be fixed first.
- **Section 4** — High-impact correctness and consistency issues.
- **Section 5** — Medium-impact maintenance issues.
- **Section 6** — Documentation drift.
- **Section 7** — Roadmap & strategic recommendations.

---

## 2. Inventory

| Module | Language | Key tech | Notes |
| --- | --- | --- | --- |
| `ordermanager-backend` | Java 21 | Spring Boot 3.5.7, JPA, Liquibase, JasperReports, JWT (auth0/java-jwt) | 64 Java files; PostgreSQL prod, H2 test |
| `ordermanager-ui` (Java wrapper) | Java 21 | Spring Boot, Thymeleaf, Eureka client | Serves Angular dist |
| `ordermanager-ui/ui/resources/frontend/invoices` | Angular 18 | PrimeNG 18, ag-Grid 30, NgRx, Transloco | SPA |
| `ordermanager-ui/src-node` | TypeScript/Node 20 | Express, Vitest, supertest | Prototype replacement of Java UI wrapper |
| `service-discovery` | Java 21 | Spring Cloud Eureka 2025.0.0 | Standalone |
| `docker` | YAML / Dockerfile | postgres:14, eclipse-temurin:21-jdk, node:20-alpine | docker-compose-based deployment |

---

## 3. Critical / Security Issues

### 3.1 Hardcoded default JWT signing key

File: `ordermanager-backend/src/main/java/com/pr/ordermanager/security/service/UserAuthProvider.java:33`

```java
@Value("${app.ordermanager.security.auth-key:auth-key}")
private String authKey;
```

The default secret is the literal string `"auth-key"` (8 characters) and is then base64-encoded in `init()` — base64 is **encoding, not hashing**, so the effective HMAC key remains trivially weak. Any deployment that does not set `app.ordermanager.security.auth-key` is signing JWTs with a publicly known constant. There is no length validation, no rotation, and no environment-variable name documented anywhere in the README.

**Recommendation:**
- Remove the default. Fail-fast at startup if no key is configured in a production profile.
- Require a key of at least 256 bits and derive an HMAC-SHA256 key from a high-entropy secret (or move to RSA/EC keys).
- Document the property in the README.
- Add a Spring profile (e.g. `dev`) where a generated random key is acceptable but log a warning.

### 3.2 `UserGrantedAuthority.getAuthority()` returns `null`

File: `ordermanager-backend/src/main/java/com/pr/ordermanager/security/service/UserAuthProvider.java:86-97`

```java
class UserGrantedAuthority implements GrantedAuthority {
    private final String authority;
    UserGrantedAuthority(String authority) { this.authority = authority; }
    @Override
    public String getAuthority() { return null; } // <-- bug
}
```

This silently breaks every role-based access check. Any `@PreAuthorize("hasRole('USER')")` or `hasAuthority("ROLE_USER")` check evaluated against a JWT-authenticated user will fail or be skipped. Combined with section 3.4, this means the project's role checks effectively do not exist.

**Recommendation:**
- Return `this.authority`.
- Replace this inner class with `SimpleGrantedAuthority` from Spring Security.
- Add a unit test that asserts `getAuthority()` returns the role string for a valid token.

### 3.3 Role claim parsing produces a single comma-joined string

File: `UserAuthProvider.java:55, 75-76`

```java
.withClaim("role", user.getAuthorities().stream()
    .map(r -> r.getAuthority()).collect(Collectors.joining(",")))
...
Stream<String> rolesStream = Stream.of(decodedJWT.getClaim("role").asString());
```

`Collectors.joining(",")` produces a single string like `"ROLE_USER,ROLE_ADMIN"`. On validation, the code wraps that whole string in `Stream.of(...)`, producing a stream of **one** element. The split on `,` is missing. Every user therefore ends up with a single authority whose text is the joined list.

**Recommendation:**
- Use a JSON array claim, e.g. `withArrayClaim("roles", rolesArray)` and `decodedJWT.getClaim("roles").asList(String.class)`.
- Map each entry to `SimpleGrantedAuthority`.

### 3.4 Method security annotations are not enforced

File: `ordermanager-backend/src/main/java/com/pr/ordermanager/security/controller/SecurityConfig.java:68`

```java
//@EnableMethodSecurity
```

`@PreAuthorize("hasRole('USER')")` is used in `PersonController` (lines 155, 164, 174) but method security is commented out. The annotations are no-ops.

**Recommendation:**
- Either enable `@EnableMethodSecurity(prePostEnabled = true)` and rely on `@PreAuthorize` plus a working `GrantedAuthority` (3.2), or
- Remove the annotations entirely and rely solely on `requestMatchers(...).hasRole(...)` in the filter chain. Pick one model and document it.

### 3.5 IDOR / missing ownership checks on entity mutations

Files: `invoice/service/InvoiceService.java`, `invoice/controller/InvoiceController.java`, `person/service/PersonService.java`

Examples:

```java
// InvoiceService.deleteInvoice (line 213)
public void deleteInvoice(Long invoiceId, String name) {
    Optional<Invoice> invoiceOptional = invoiceRepository.findById(invoiceId);
    if (invoiceOptional.isPresent()) {
        invoiceRepository.delete(invoiceOptional.get());
    }
}
```

The `name` parameter (current principal) is ignored. Any authenticated user can delete any invoice ID. The same issue exists in `deleteCatalogItem`, `updateInvoices`, `updateItemCatalog`, `getItemCatalog`, and the analogous methods on persons (analysis of `personService` would confirm; the controller layer also passes only the principal name as a string).

**Recommendation:**
- For every mutation/lookup by ID, verify the resource belongs to `principal.getName()` (or the user's id) before acting. Either filter in the repository (`findByIdAndInvoiceUser_Username(...)`) or check after fetch and throw a `403`/`ResourceNotFoundException`.
- Add tests that exercise the cross-user scenario (user A tries to delete user B's invoice).
- Consider switching to a global `@Filter` (Hibernate filter) or a Spring Security `AuthorizationManager` for per-row authorization.

### 3.6 Passwords transferred via HTTP headers

Files:
- `security/controller/InvoiceUserController.java:58-60, 71-73`
- `security/service/UserService.java:70-84`
- `ordermanager-ui/.../common-auth/app-security.service.ts:105-110`

Both registration and login carry user credentials in custom HTTP headers (`User-Name`, `User-Password`, `Login-Credentials`). Headers are routinely written to access logs, captured by proxies, and may appear in error reports. The chosen Tomcat access log pattern (`"%a asdasd"`) also looks like a debug placeholder rather than a real configuration.

**Recommendation:**
- Move credentials into a JSON body (HTTPS-only, never logged). Use the standard Spring Security login flow or a dedicated `/login` endpoint with a request body DTO.
- Treat the existing Tomcat access log pattern as a deliberate config and replace `"%a asdasd"` with a real pattern.
- Add log filters / pattern excludes for sensitive headers if any remain.

### 3.7 CORS configuration is overly permissive

File: `security/controller/SecurityConfig.java:78-121` and `security/controller/InvoiceCorsFilter.java`

The active filter sets `setAllowCredentials(true)` together with `addAllowedOriginPattern("*")` — Spring will allow credentialed requests from any origin. The `corsConfigurer()` also sets `allowedOrigins("*")`. The dormant `InvoiceCorsFilter` (commented `//@Component`) duplicates the configuration.

**Recommendation:**
- Restrict allowed origins to an explicit allow-list (read from configuration / environment variables).
- Remove or finish migrating `InvoiceCorsFilter`. There should be exactly one CORS configuration in the codebase.
- If credentials are required for the SPA, use exact origin patterns (`https://app.example.com`).

### 3.8 `/management/**` accessible without authentication

File: `security/controller/SecurityConfig.java:138, 162` and `application.properties`

```
management.endpoints.web.exposure.include=*
```
plus:
```java
.requestMatchers("/registration", "/login", "/error", "/user", "/management").anonymous()
...
.requestMatchers("/registration", "/login", "/invoice/report", "/management","/polyfills.js");  // ignoring
```

Combined: every actuator endpoint is exposed (`*`), the base path is anonymous, **and** the webSecurityCustomizer ignores `/management` entirely (bypassing all filters). This leaks heapdump, env, beans, mappings, configprops, threaddump etc. to anyone with network access.

**Recommendation:**
- Restrict `management.endpoints.web.exposure.include` to `health,info` for non-internal deployments.
- Require authentication for everything else and bind sensitive endpoints (heapdump, env, threaddump) to an internal port (`management.server.port`).
- Remove `/management` from `webSecurityCustomizer().ignoring()`.

### 3.9 `webSecurityCustomizer.ignoring(...)` bypasses filters entirely

`SecurityConfig.java:158-166` declares `ignoring(...)` for `/registration`, `/login`, `/invoice/report`, `/management`, `/polyfills.js`. `ignoring()` means **no Spring Security filter ever runs** for those paths, including CSRF protection, CORS, and the JWT filter.

- `/registration` and `/login` are also separately listed under `.anonymous()` in the filter chain → duplicated and conflicting configuration; `ignoring()` wins.
- `/invoice/report` does not match any controller mapping (the real endpoint is `/invoice/printreport`) — this is either a typo or stale config.
- `/management` should not be on this list (see 3.8).

**Recommendation:**
- Use `.permitAll()` in the filter chain instead of `.ignoring()` for endpoints that should still have CORS/CSRF/headers.
- Drop the stale `/invoice/report` entry.
- Decide whether to permit polyfills via static resource handling instead.

### 3.10 Hardcoded Azure cloud credentials in Maven profile

File: `ordermanager-backend/pom.xml:296-309` (and `ordermanager-ui/pom.xml:362-378` for the UI module)

```xml
<value>-Dserver.port=80 -DDB_HOST=oderermanager-postgres-server.postgres.database.azure.com
       -DDB_PORT=5432 -DDB_NAME=test_db -Ddb.username=Postgreadmin123
       -Ddb.password=Testadmin123</value>
```

A real-looking database hostname and admin password are committed to source control. Even if these are throwaway sandbox credentials, leaking them in a public repo is bad practice and trains contributors to do the same.

**Recommendation:**
- Move secrets to environment variables / Azure Key Vault / GitHub Actions secrets.
- Rotate the existing Azure DB credentials immediately if they were ever real.
- Audit `git log` for any other historical leaks.

### 3.11 JWT tokens stored in `localStorage`

File: `ordermanager-ui/.../common-auth/app-security.service.ts:48-58`, `common-auth/basic-auth-interceptor.ts:19-23`

The token is persisted in `localStorage` and re-attached via an interceptor. Any XSS bug exfiltrates the token directly. Combined with the missing CSP (`helmet({ contentSecurityPolicy: false })` in the Node UI), this widens the attack surface.

**Recommendation:**
- Prefer HttpOnly + Secure + SameSite=strict cookies for session/JWT storage.
- Re-enable a CSP in `helmet(...)` and audit the Angular app for inline scripts / unsafe-eval.

### 3.12 Broken auth interceptor sends `Bearer null`

File: `ordermanager-ui/.../common-auth/basic-auth-interceptor.ts:19-23`

```typescript
const authToken = 'Bearer '+localStorage.getItem(AUTH_TOKEN_KEY)
if (authToken != null) {
  request = request.clone({ setHeaders: { Authorization: authToken as string } });
}
```

When no token is stored, `localStorage.getItem` returns `null`, and the code sends `Authorization: Bearer null` on every request. The backend then attempts to validate the literal string `"null"` as a JWT and (via `JwtAuthFilter`) throws `OrderManagerException`, breaking the unauthenticated path.

Also note `BasicInterceptor` does not implement `HttpInterceptor`. Whether it is registered as an `HTTP_INTERCEPTORS` provider should be re-verified.

**Recommendation:**
- Skip header injection when the token is `null`/empty.
- Make the class implement `HttpInterceptor`.
- Add a unit test for the no-token case.

### 3.13 `getAuthToken()` doesn't return anything

File: `ordermanager-ui/.../common-auth/app-security.service.ts:48-50`

```typescript
getAuthToken() {
  localStorage.getItem(AUTH_TOKEN_KEY)
}
```

Missing `return`. The function silently returns `undefined`. Any caller that relies on it is silently broken.

**Recommendation:**
- Add `return localStorage.getItem(AUTH_TOKEN_KEY);`
- Verify there are no callers expecting a value.

---

## 4. High-Impact Correctness / Consistency Issues

### 4.1 `spring.boot.version` property is wrong

File: `pom.xml:30`

```xml
<spring.boot.version>3.1.3</spring.boot.version>
```

The Spring Boot parent is 3.5.7 (line 9), but several explicit `<version>${spring.boot.version}</version>` references downgrade individual Spring Boot artifacts to 3.1.3 (lines 230, 246). This causes a version split across the dependency graph. It's already noted in `doc/project-analysis.md` but unresolved.

**Recommendation:**
- Remove the `spring.boot.version` property entirely.
- Drop every `<version>` override on `spring-boot-starter-*` artifacts; the parent BOM resolves them.

### 4.2 `hibernate-entitymanager` 5.4 alongside Hibernate ORM 6.2

File: `pom.xml:84-87`

`hibernate-entitymanager` was merged into `hibernate-core` in Hibernate 5.2 and is no longer published for Hibernate 6.x. Carrying 5.4.2 next to ORM 6.2.3 can pull in conflicting classes (especially `javax.persistence` vs `jakarta.persistence`).

**Recommendation:** Delete the `hibernate-entitymanager` dependency. The README already flags this.

### 4.3 Maven compiler plugin set to `release=17` while project is Java 21

File: `pom.xml:317-340` (parent), `ordermanager-backend/pom.xml:232-251` (module override)

The parent `<release>17</release>` contradicts `<maven.compiler.release>21</maven.compiler.release>`. The backend module override does set source/target to 21. The mismatch is confusing and risks accidental downgrade if a module forgets to override.

**Recommendation:** Set `release=21` consistently. Remove duplicate plugin declarations.

### 4.4 `bcprov-jdk15on:1.70` declared but unused, and deprecated artifact

File: `ordermanager-backend/pom.xml:109-113`

`bcprov-jdk15on` (Java 5+) is end-of-life. The current Bouncy Castle artifact is `bcprov-jdk18on`. A grep of `src/` confirms the project does **not** import any `org.bouncycastle.*` class.

**Recommendation:** Delete the dependency. If Bouncy Castle is needed in the future, use `bcprov-jdk18on`.

### 4.5 Azure profiles use Java 17 runtime

Files: `ordermanager-backend/pom.xml:312`, `ordermanager-ui/pom.xml:336, 377`

```xml
<javaVersion>Java 17</javaVersion>
```

Project code is compiled for Java 21. Deploying compiled `class` files (major version 65) to a Java 17 runtime will fail with `UnsupportedClassVersionError`.

**Recommendation:** Set `<javaVersion>Java 21</javaVersion>` and the jib base image to `eclipse-temurin:21-jdk` (or a Microsoft JDK 21 image).

### 4.6 `application.yaml` syntax bug in `service-discovery`

File: `service-discovery/src/main/resources/application.yaml:5-7`

```yaml
management:
  security:
    enabled=false
```

That is not YAML (it mixes `=` with YAML indentation) and the block is silently ignored. The intent looks like `enabled: false`, but Spring Boot dropped `management.security.enabled` years ago.

**Recommendation:** Remove the block entirely (modern Spring Boot uses Spring Security configuration on the management endpoints) or replace with proper YAML keys.

### 4.7 Liquibase + `ddl-auto=update` together

File: `ordermanager-backend/src/main/resources/application.properties:16, 46`

`spring.jpa.hibernate.ddl-auto=update` plus Liquibase migrations is a known footgun: Hibernate may create columns/tables that Liquibase does not know about, hiding migration regressions and breaking parity between environments. Already flagged in the README and project-analysis.

**Recommendation:** Set `spring.jpa.hibernate.ddl-auto=validate` (or `none`) in production. Keep Liquibase as the only source of truth for schema. Optionally retain `update` in a `dev` profile only.

### 4.8 Two `BCryptPasswordEncoder` beans

File: `security/controller/SecurityConfig.java:168-176`

`bCryptPasswordEncoder()` (no strength arg) and `passwordEncoder()` (strength 10) both produce the same type. Bean ambiguity is handled by Spring picking by name, but it is fragile and confusing.

**Recommendation:** Keep only `passwordEncoder()` (strength 10) and inject by interface `PasswordEncoder` everywhere.

### 4.9 `InvoiceService.getItemCatalog(...)` throws on missing data

`invoice/service/InvoiceService.java:80` calls `.get()` on `Optional<ItemCatalog>` without `isPresent()` check → `NoSuchElementException`, mapped by `GlobalExceptionHandler` to HTTP 400 with a generic `CODE_0000`. The user will not know whether the request was malformed or the item simply does not exist.

**Recommendation:** Throw `OrderManagerException(CODE_..., "Item not found")` explicitly and map to HTTP 404 in the exception handler.

### 4.10 `GlobalExceptionHandler` types: catches `Exception.class`, returns 400 for everything

Returning HTTP 400 for `NullPointerException`, `EntityNotFoundException`, authorisation errors, transaction failures, etc., hides bugs and breaks REST semantics.

**Recommendation:** Use dedicated `@ExceptionHandler` methods for `OrderManagerException`, `MethodArgumentNotValidException`, `AccessDeniedException`, `EntityNotFoundException`, and a generic fallback that returns 500 for unknown errors.

### 4.11 Shared sequence `invoice_seq` for `Invoice`, `Person`, `InvoiceUser`

Files: `Invoice.java:50`, `Person.java:48`, `InvoiceUser.java:51`

All three entities declare `@SequenceGenerator(name="invoice_seq_gen", sequenceName="invoice_seq", ...)`. They share one physical sequence, so `Person#id`, `Invoice#id`, `InvoiceUser#id` are allocated from the same pool. Functional, but counter-intuitive when debugging.

**Recommendation:** Give each entity its own sequence, or use a common identity strategy. Refactor with a Liquibase migration if you go that way.

### 4.12 Dead/duplicate Angular dependencies

`ordermanager-ui/ui/resources/frontend/invoices/package.json` declares:

- `chart.js@^2.9.3` — not imported anywhere in `src/`. Chart.js 2.x is end-of-life; current is 4.x. Should be removed unless reintroduced for a known feature.
- `@fullcalendar/core@^5.3.1` — not imported. Remove.
- `axios@^1.15.0` — not imported (Angular uses `HttpClient`). Remove.
- `save@^2.9.0`, `nth-check`, `minimatch`, `glob@^13.0.6`, `path-browserify`, `os-browserify`, `https-browserify`, `stream-browserify`, `stream-http`, `timers-browserify`, `timers-browserify-full`, `crypto-browserify`, `assert`, `process`, `buffer`, `url` — these are browser polyfills typically required only by webpack 4 builds. Angular 18 (esbuild/webpack 5) should not need them in `dependencies`. They inflate the bundle and increase audit surface.
- `glob` 13.x does not exist on npm (latest is 11.x). The dependency would fail `npm ci` from a clean clone. Verify against `package-lock.json` whether this is a typo (likely meant `^10.x`).

**Recommendation:** Run `npx depcheck`, drop unused packages, and run a fresh `npm install` to regenerate the lockfile.

### 4.13 `@types/node@^14` while runtime targets Node 20

Frontend dev deps. The Angular 18 toolchain and the Node UI both target Node 20, but the frontend installs Node 14 type definitions, which can mask compile-time errors and produce misleading IntelliSense.

**Recommendation:** Bump to `@types/node@^20` (or whatever the Angular CLI ships with).

### 4.14 Stale TODO: logout broken after Angular 16 migration

File: `common-auth/app-security.service.ts:186-191`

```typescript
//TODO After migration to Angular-16 doesnt work more
logout(): any {
  this.http.post(remoteBackendUrl() + 'perform_logout', {}).pipe(finalize(() => {
    this.clearCredentials()
  })).subscribe();
}
```

The codebase is on Angular 18. Either the TODO has been resolved and the comment is stale, or logout is genuinely broken (clear credentials only on success path).

**Recommendation:** Verify logout end-to-end. Either delete the TODO or fix the bug. Move `clearCredentials()` to fire on both success and error.

### 4.15 `OncePerRequestFilter` rejects requests without a token

`security/controller/JwtAuthFilter.java:33-36` throws when token validation fails. Throwing inside a filter does not produce a clean 401 — it bubbles up and may be mapped to 500 or wrapped by Tomcat error handling. The filter also does **not** clear an existing context on token expiry; `SecurityContextHolder.getContext()` is called without effect (no assignment).

**Recommendation:**
- Catch the validation exception, set status 401 with a JSON body, and `return` without calling `filterChain.doFilter`.
- Don't throw inside `OncePerRequestFilter`.

### 4.16 Service `AppSecurityService` runs an interval that is never cleaned up

File: `common-auth/app-security.service.ts:69-76`

The service is `providedIn: 'root'`, so `ngOnDestroy` only fires when the app is unloaded. The `interval(30000).subscribe(...)` therefore runs forever, attempting `checkBackendAuthentication` even after logout.

**Recommendation:** Use the `notifier` `Subject` with `takeUntil` (already declared) on this interval too, or stop the interval when not authenticated.

---

## 5. Medium-Impact Maintenance Issues

### 5.1 `.gitignore` is missing common entries

File: `.gitignore`

Missing: `node_modules/`, `dist/`, `.DS_Store`, `hs_err_*.log`, `*.iml`, `*.log`. Eight `.DS_Store` files exist in the repo today, and `ordermanager-backend/src-node/{dist,node_modules}` is an apparently stray uncommitted folder.

**Recommendation:**
```
node_modules/
dist/
.DS_Store
hs_err_*.log
*.log
```
and run `git rm --cached` for any historical mistakes.

### 5.2 Stray `ordermanager-backend/src-node/` folder

`git status` shows `?? ordermanager-backend/src-node/`. It contains `dist/` and `node_modules/` only, no source. Looks like a mis-extracted artifact.

**Recommendation:** Delete the folder unless it has a known purpose.

### 5.3 Typo'd configuration keys

- `app.ordermanager.report.counry=de` in `application.properties` (should be `country`). Appears in **both** `src/main/resources/application.properties` and `src/test/resources/application.properties`, suggesting it was copy-pasted forward. If any code reads `country` (correctly spelled) the typo silently falls back to a default.
- `backend.microcervice.url` in `ordermanager-ui/src/main/resources/application.properties:8-9` and the env-var `BACKEND_MICROCERVICE_URL` in the Node UI's `env.ts`. Looks like a long-standing typo intentionally preserved for "compatibility".
- `server.tomcat.accessLogPattern="%a asdasd"` — `"%a asdasd"` is a debug placeholder, not a real pattern. Appears in `ordermanager-backend`, `ordermanager-ui`, and backend test properties.

**Recommendation:** Fix the typos, decide which env-var name is canonical, and create a migration period (read both, log a deprecation warning, then remove the typo).

### 5.4 Dead and commented-out code

Many files contain large commented blocks: e.g. `InvoiceCorsFilter.java` (whole file is dormant; `//@Component` commented out), `SecurityConfig.java:73 debugSecurity`, `AngularBackendApplication.java:41, 65-73`, `InvoiceUserDetailsManager.java:88-112`, `pom.xml` Mockito-all block, `ordermanager-backend/pom.xml:100, 150-157`. The Spring Boot wrapper `ordermanager-ui` still imports `spring-boot-starter-thymeleaf` despite serving only static Angular files.

**Recommendation:** Delete dead code. If a piece is kept for "future" use, replace it with an issue/ticket reference, not a commented block.

### 5.5 Stale documentation about BasicAuth and Spring Security

OpenAPI annotations on `InvoiceController`, `PersonController`, `JasperReportController` still declare `security = {@SecurityRequirement(name = "basicAuth")}`. The runtime uses Bearer-token JWT. Generated OpenAPI clients will request the wrong authentication.

**Recommendation:** Replace with a `bearerAuth` security requirement and add the corresponding `@SecurityScheme` definition.

### 5.6 Node UI README drift

`ordermanager-ui/src-node/README.md` claims default port is 8082, but `env.ts:28` defaults to 8085. README and docker-compose (`ordermanager-node_ui` → 8085) both contradict.

**Recommendation:** Pick one default and align README + code + compose.

### 5.7 Default backend URL is a personal Azure host

`ordermanager-ui/src-node/src/config/env.ts:6`:
```typescript
const DEFAULT_BACKEND_URL = 'https://prognimak-ordermanager-backend.azurewebsites.net/backend/';
```

Anyone running the prototype out of the box points to a personal Azure environment.

**Recommendation:** Default to `http://localhost:8083/backend/` and require deployments to override via env vars. Document clearly.

### 5.8 Maven plugin versions are split across modules

The parent has `maven-compiler-plugin:3.8.1`, while backend/UI submodules override to `3.13.0`. `maven-javadoc-plugin` is at 2.10.3 (released 2015) and `docker-maven-plugin` (Spotify) at 0.3.7 — the Spotify plugin is abandoned.

**Recommendation:**
- Promote the compiler plugin version to the parent.
- Replace the Spotify docker-maven-plugin with Jib (already used in one profile) or remove it entirely.
- Upgrade `maven-javadoc-plugin` to a current 3.x release.

### 5.9 `pluginManagement` declares `maven-compiler-plugin` with `<release>17</release>` and `<fork>true</fork>`

`pom.xml:317-340` — leftover from a Java 17 phase. `<fork>true</fork>` increases build time for no gain in modern Maven.

**Recommendation:** Clean up to match Java 21.

### 5.10 `azure-pipelines.yml` exists but is not referenced

`azure-pipelines.yml` lives at the root with no clear CI workflow. There is no GitHub Actions workflow either. Unclear if the project has functional CI.

**Recommendation:** Either remove `azure-pipelines.yml` or document how it is consumed.

### 5.11 `kubernetes/` directory is empty

Repository carries an empty `kubernetes/` folder. README does not mention Kubernetes deployment.

**Recommendation:** Remove or populate.

### 5.12 `docker-compose.yaml` mixes hardcoded credentials and missing healthchecks

- `POSTGRES_PASSWORD: test` is hardcoded. Fine for local dev, but should be parameterised by `.env`.
- Containers have no `healthcheck:` declarations, so `depends_on` only waits for container start, not for the service to be ready. Backend may attempt to connect to Postgres before it accepts connections.
- The Postgres `volumes` entry uses a relative path `./backend/opt/sql/create-db` which only works when compose is run from `docker/` — fine, but undocumented.

**Recommendation:** Add a `.env` file (gitignored) and healthchecks for postgres and discovery. Add a `restart:` policy.

### 5.13 `azure-pipelines.yml`, multiple `README_DOCKER.md` files

`docker/`, `docker/backend/`, `docker/frontend/`, `docker/node_frontend/` each have a `README_DOCKER.md`, with mostly the same content. Keep one canonical README per concern.

### 5.14 Cucumber dependencies missing `test` scope

`pom.xml:175-179` declares `cucumber-junit` without `<scope>test</scope>`. The other Cucumber artefacts are `test`-scoped. As a result, `cucumber-junit` and its transitive dependencies ship inside the production fat-jar.

**Recommendation:** Add `<scope>test</scope>`.

### 5.15 Inconsistent `@CrossOrigin` usage

`@CrossOrigin(origins = "*")` on `InvoiceUserController`, `@CrossOrigin()` (no value) on `InvoiceController`, plain `@CrossOrigin` on `PersonController` and `JasperReportController`. Combined with the global CORS filter and `corsConfigurer()`, there are at least three independent CORS sources. Behavior depends on which one wins.

**Recommendation:** Remove all `@CrossOrigin` annotations from controllers. Rely on the global config exclusively.

---

## 6. Documentation Drift

### 6.1 Outdated `doc/project-analysis.md`

Last reviewed 2026-05-16. Most of the structural information is still accurate, but the file does not flag any of the concrete defects in this report (e.g. broken authority, missing ownership checks, hardcoded JWT key, broken interceptor, dead Angular deps, conflicting Maven plugin versions). It documents the architecture but not the **maintenance risks**.

**Recommendation:** Either fold the present document into `project-analysis.md`, or add a "Known Defects" section pointing here. Cross-link from `AGENTS.md`.

### 6.2 README claims do not match config

- README says "Node.js 20 recommended" but the Angular front-end declares `@types/node@^14` (see 4.13).
- README does not document the `app.ordermanager.security.auth-key` property (the JWT signing key).
- README's "Project Modules" table mentions `ordermanager-ui/src-node` as a prototype but says nothing about its port (8085) or its overlap with the Java wrapper (8082).
- README's Useful URLs table omits the Node UI on `http://localhost:8085/...`.
- README does not warn that `Liquibase` and `ddl-auto=update` are both active.
- README mentions Jasper PDF metadata but not that it is configured with `setEncrypted(true)` (will require explicit owner password if any consumer relies on editing).
- README says "PostgreSQL 10+ works" but the dev compose stack uses `postgres:14`; spelling "10+ works" can mislead users into running unsupported versions.
- AGENTS.md says module names but does not warn agents about the documented defects.

**Recommendation:** A pass over README, doc/project-analysis.md, and AGENTS.md to align them with current code state.

### 6.3 Mixed-language code comments

Some inline comments are in Russian/Ukrainian/German transliteration mixed with English. Several misspellings ("encriptedPassword", "validatePasswordAndReturnToken", "tottal summa", "Token invalid.", "Cors filter for enabling cors requests. Currently, allows all re", "loged user"). Harmless but rough on new contributors.

**Recommendation:** A linting pass (or just IDE spell-checker) before larger contributions.

### 6.4 OpenAPI `@SecurityRequirement(name = "basicAuth")` mismatch

See 5.5.

### 6.5 Stale `// FIXME change it to the project's website` placeholders

`ordermanager-backend/pom.xml:19`, `ordermanager-ui/pom.xml:18` — both still contain the Maven archetype FIXME for `<url>` set to `http://www.example.com`.

**Recommendation:** Either remove `<url>` or set it to the GitHub repo URL.

---

## 7. Roadmap & Recommendations Summary

### 7.1 Suggested next steps (in priority order)

1. **Security pass (Section 3):** fix JWT signing-key default, role authority bug, role-claim parsing, missing `@EnableMethodSecurity`, IDOR mutations, credential-in-header, Azure secret leak, actuator exposure. None of these requires architectural change — they are localised bug fixes plus configuration changes. Add tests.
2. **Dependency hygiene (4.1–4.5, 4.12–4.13, 5.8, 5.14):** delete `hibernate-entitymanager`, drop `spring.boot.version` property, align Java release to 21, prune Angular dependencies, scope cucumber correctly. Run `mvn dependency:analyze` and `npx depcheck` to catch the rest.
3. **Schema & migrations (4.7):** flip `ddl-auto` to `validate` in prod profile; commit any Hibernate-only changes via Liquibase.
4. **Code quality (4.9–4.11, 4.14–4.16, 5.4):** dedicated exception handlers, ownership checks become repository queries, remove dead code, fix the Angular interceptor.
5. **Docs & meta (Section 6):** one canonical doc/project-analysis.md plus a tightly maintained README. Document the JWT signing key property. Document the Node UI port. Remove the empty `kubernetes/` folder.
6. **CI:** verify `azure-pipelines.yml` is wired up; if not, add a GitHub Actions workflow that runs `mvn verify`, `npm test`, and `npm test` in `src-node`, and fails on lint errors.

### 7.2 Strategic suggestions

- **Pick one UI wrapper.** Either the Spring Boot `ordermanager-ui` or the Node Express `src-node`. Maintaining both is duplicate effort and creates the inevitable drift seen in section 5.6/5.7. The Node version is lighter; the Java version reuses the Eureka client. Decide deliberately.
- **Pick one CORS strategy.** Right now three layers (filter chain, `WebMvcConfigurer`, controller annotation) configure CORS independently. Pick one and delete the others.
- **Consider Spring Security's built-in JWT support.** `spring-boot-starter-oauth2-resource-server` provides JWT validation that is easier to harden than the hand-rolled `JwtAuthFilter` + `UserAuthProvider`. Migration is small.
- **Adopt a static analyser.** SpotBugs / Error Prone for Java; ESLint + tsc strict for TS. Many of the defects in section 3.2, 3.12, 3.13 would be caught automatically.
- **Add an integration test that exercises the cross-user authorisation flow.** It is the single best regression net against IDOR-class bugs (section 3.5).
- **Track the Angular upgrade path.** Angular 18 is current at the moment of review, but the long-running plumbing (ag-Grid 30, jasmine 3.8, chart.js 2.9, `@types/node@^14`) shows the project has lagged in past upgrades. Decide on a cadence (e.g. one Angular major per quarter).

### 7.3 Things that are working well

- Domain-oriented backend package layout (`invoice`, `person`, `report`, `security`, `common`, `exception`, `utils`) is clean and consistent.
- Liquibase is in place — once `ddl-auto` is disabled, the project is one step away from schema-as-code.
- The Angular feature-folder layout with `common-services`, `common-components`, `common-pipes`, `transloco`, and lazy-loaded `workflows` is a sensible structure.
- JasperReport locale handling in `JasperReportService.resolveReportLocale` is defensively written.
- The repository carries a usable Docker Compose stack for local development.

---

## 8. Appendix: File:line index of the issues

| Issue | File:line |
| --- | --- |
| 3.1 JWT default key | `ordermanager-backend/.../security/service/UserAuthProvider.java:33` |
| 3.2 GrantedAuthority returns null | `UserAuthProvider.java:96` |
| 3.3 Role claim joining bug | `UserAuthProvider.java:55, 75-76` |
| 3.4 Method security disabled | `security/controller/SecurityConfig.java:68` |
| 3.5 IDOR delete invoice | `invoice/service/InvoiceService.java:213` |
| 3.5 IDOR delete catalog item | `invoice/service/InvoiceService.java:248` |
| 3.5 IDOR update invoices | `invoice/service/InvoiceService.java:165` |
| 3.6 Credentials in header | `security/controller/InvoiceUserController.java:58-73`, `app-security.service.ts:105-110` |
| 3.7 Permissive CORS | `SecurityConfig.java:78-121`, `InvoiceCorsFilter.java:84-113` |
| 3.8 Open actuator | `application.properties:42`, `SecurityConfig.java:138, 162` |
| 3.9 `ignoring(...)` bypass | `SecurityConfig.java:158-166` |
| 3.10 Azure creds in pom | `ordermanager-backend/pom.xml:296-309` |
| 3.11 Token in localStorage | `app-security.service.ts:48-58` |
| 3.12 `Bearer null` interceptor | `basic-auth-interceptor.ts:19-23` |
| 3.13 `getAuthToken` missing return | `app-security.service.ts:48-50` |
| 4.1 Wrong spring.boot.version | `pom.xml:30` |
| 4.2 hibernate-entitymanager 5.4 | `pom.xml:84-87` |
| 4.3 release=17 in compiler plugin | `pom.xml:323` |
| 4.4 Unused bcprov-jdk15on | `ordermanager-backend/pom.xml:109-113` |
| 4.5 Azure Java 17 runtime | `ordermanager-backend/pom.xml:312`, `ordermanager-ui/pom.xml:336, 377` |
| 4.6 application.yaml syntax bug | `service-discovery/.../application.yaml:5-7` |
| 4.7 ddl-auto=update with Liquibase | `ordermanager-backend/.../application.properties:16, 46` |
| 4.8 Duplicate BCryptPasswordEncoder beans | `SecurityConfig.java:168-176` |
| 4.9 `.get()` on Optional | `invoice/service/InvoiceService.java:80` |
| 4.10 Global exception handler too broad | `exception/GlobalExceptionHandler.java:68` |
| 4.11 Shared invoice_seq | `Invoice.java:50`, `Person.java:48`, `InvoiceUser.java:51` |
| 4.12 Dead Angular deps | `ordermanager-ui/.../package.json` |
| 4.13 @types/node 14 | `ordermanager-ui/.../package.json:67` |
| 4.14 Stale Angular-16 TODO | `app-security.service.ts:186` |
| 4.15 JwtAuthFilter throws | `JwtAuthFilter.java:33-37` |
| 4.16 Uncleaned interval | `app-security.service.ts:69-76` |
| 5.1 .gitignore missing entries | `.gitignore` |
| 5.2 Stray src-node folder | `ordermanager-backend/src-node/` |
| 5.3 Typo'd property keys | `application.properties` (multiple) |
| 5.5 OpenAPI basicAuth mismatch | controllers' `@SecurityRequirement` annotations |
| 5.6 README/port drift | `ordermanager-ui/src-node/README.md:13`, `env.ts:28` |
| 5.7 Personal Azure default URL | `ordermanager-ui/src-node/src/config/env.ts:6` |
| 5.12 docker-compose missing healthchecks | `docker/docker-compose.yaml` |
| 5.14 cucumber-junit missing test scope | `pom.xml:175-179` |
| 5.15 Inconsistent @CrossOrigin | controller classes |
| 6.5 FIXME placeholders | `ordermanager-backend/pom.xml:19`, `ordermanager-ui/pom.xml:18` |

End of review.
