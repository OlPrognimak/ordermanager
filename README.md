# Ordermanager

![Java 21](https://img.shields.io/badge/Java-21-blue)
![Spring Boot 4.1](https://img.shields.io/badge/Spring%20Boot-4.1.0-6DB33F)
![Angular 19](https://img.shields.io/badge/Angular-19-DD0031)
![Maven](https://img.shields.io/badge/Build-Maven-C71A36)
![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791)

Ordermanager is a full-stack sample and working application for managing persons, invoice catalog items, invoices, invoice workflows, and PDF invoice generation. It combines a Spring Boot backend, an Angular frontend, Eureka service discovery, Docker packaging, and a small Node.js frontend-backend prototype.

> [!NOTE]
> This README describes the codebase and developer setup. The user manual is stored under `doc/`.

## Table Of Contents

- [System Requirements](#system-requirements)
- [Project Modules](#project-modules)
- [Build](#build)
- [Run Locally](#run-locally)
- [Docker Deployment](#docker-deployment)
- [Backend](#backend)
- [Frontend](#frontend)
- [PDF Documents](#pdf-documents)
- [Testing](#testing)
- [Useful URLs](#useful-urls)

## System Requirements

| Requirement | Version / value | Notes |
| --- | --- | --- |
| Operating system | Linux, macOS, Windows 10/11 | Docker instructions include platform-specific Maven profiles where needed. |
| Java | 21 | Maven compiler source, target, and release are configured for Java 21. |
| Maven | 3.9+ recommended | Used as the parent build tool for all Java modules. |
| Node.js | 20 recommended | Used for the Angular build and the optional Node.js UI backend. |
| PostgreSQL | 10+ works with current configuration | Local default port is `5455`; Docker may provide this service. |
| Docker | Current Docker Engine / Docker Desktop | Used for containerized backend, frontend, database, and discovery services. |

Docker image bases used by the project:

| Image | Purpose |
| --- | --- |
| `eclipse-temurin:21-jdk` | Java runtime/build base for Spring Boot services. |
| `node:20-alpine` | Node frontend image base. |
| PostgreSQL image from Docker resources | Database container for local deployment. |

> [!IMPORTANT]
> If you change the Java version, update the parent `pom.xml`, module `pom.xml` files, and Docker JDK image versions together.

## Project Modules

| Module / folder | Description |
| --- | --- |
| `ordermanager-backend` | Spring Boot REST backend for users, persons, invoice catalog items, invoices, workflows, persistence, and PDF generation. |
| `ordermanager-ui` | Spring Boot wrapper that serves the generated Angular application and exposes the backend URL to the browser. |
| `ordermanager-ui/ui/resources/frontend/invoices` | Angular 19 single-page application. This is the main frontend source. |
| `ordermanager-ui/src-node` | TypeScript/Express backend prototype for frontend configuration and management endpoints. |
| `service-discovery` | Eureka server for service discovery in local and Docker deployments. |
| `docker` | Dockerfiles, Compose files, and copied runnable artifacts. |
| `doc` | User manual and project analysis documents. |

## Build

Run the build from the repository root:

```bash
mvn clean install
```

After a successful build, Maven creates executable jars and copies them into the Docker folders:

| Artifact | Destination |
| --- | --- |
| `ordermanager-backend.jar` | `docker/backend/ordermanager-backend.jar` |
| `ordermanager-ui.jar` | `docker/frontend/ordermanager-ui.jar` |
| `service-discovery.jar` | `docker/discovery/service-discovery.jar` |

To include the Angular production build during the Maven lifecycle:

```bash
mvn clean install -Pbuild-angular
```

## Run Locally

Default local service ports:

| Service | URL |
| --- | --- |
| Backend API | `http://localhost:8083/backend` |
| Frontend wrapper | `http://localhost:8082/frontend` |
| Eureka | `http://localhost:8761` |
| Swagger UI | `http://localhost:8083/backend/swagger-ui.html` |
| OpenAPI YAML | `http://localhost:8083/backend/v3/api-docs.yaml` |

The backend expects PostgreSQL by default:

| Property | Default |
| --- | --- |
| Host | `localhost` |
| Port | `5455` |
| Database | `test_db` |
| User | `test` |
| Password | `test` |

The same values can be overridden through environment variables or Spring properties:

```bash
START_PORT=8083
DB_HOST=localhost
DB_PORT=5455
DB_NAME=test_db
```

## Docker Deployment

Docker instructions are stored in `docker/README_DOCKER.md`.

Manual deployment flow:

1. Build the Maven project.
2. Build the backend image with the corresponding version.
3. Build the frontend image with the corresponding version.
4. Start the stack with Docker Compose from the `docker` folder.

Maven-assisted flow:

```bash
mvn clean install -Pbuild-angular -Pwith-docker-linux
```

Use the Windows Docker profile instead when building on Windows if the Docker documentation requires it.

## Backend

The backend module is `ordermanager-backend`. It is a Spring Boot REST service running under the `/backend` context path.

### Backend Libraries

| Package / library | Usage |
| --- | --- |
| Spring Boot Web | REST controllers and HTTP request handling. |
| Spring Security | User authentication, filters, login checks, and protected endpoints. |
| Spring Data JPA / Hibernate | Entity persistence and repository access. |
| PostgreSQL JDBC | Production/default database driver. |
| H2 | In-memory database for tests. |
| Liquibase | Database change-log management. |
| Lombok | Reduces boilerplate in models, entities, and services. |
| MapStruct | Type-safe mapping between entities and API models. |
| JasperReports | PDF invoice generation. |
| springdoc-openapi | OpenAPI and Swagger UI documentation. |
| Log4j2 | Application logging. |
| JUnit 5, Mockito, Cucumber | Unit, service, repository, and behavior-style tests. |

### Backend Package Structure

```text
com.pr.ordermanager
|-- common
|   |-- entity
|   `-- model
|-- exception
|-- invoice
|   |-- controller
|   |-- entity
|   |-- mapper
|   |-- model
|   |-- repository
|   `-- service
|-- person
|   |-- controller
|   |-- entity
|   |-- model
|   |-- repository
|   `-- service
|-- report
|   |-- controller
|   |-- entity
|   |-- model
|   |-- service
|   `-- utils
|-- security
|   |-- controller
|   |-- entity
|   |-- model
|   |-- repository
|   `-- service
`-- utils
```

### Backend Components

| Component | Description |
| --- | --- |
| `InvoiceController` | REST API for creating, updating, deleting, listing, and filtering invoices and item catalog entries. |
| `InvoiceService` | Business service for invoice persistence and invoice-related operations. |
| `InvoiceValidator` | Validates invoice request models before they are persisted. |
| `InvoiceViewMapper`, `InvoiceItemMapper`, `ItemCatalogMapper` | Map JPA entities to API/view models and back. |
| `PersonController` | REST API for creating, updating, deleting, listing, and filtering persons. |
| `PersonService` | Business service for person, address, and bank-account operations. |
| `PersonValidator` | Validates person request models. |
| `JasperReportController` | Exposes PDF invoice generation through `/invoice/printreport`. |
| `JasperReportService` | Loads invoice data and renders JasperReports templates. |
| `InvoiceUserController` | Handles registration, login, logout, and user-check endpoints. |
| `SecurityConfig`, filters, and auth provider | Configure request security, authentication flow, and token handling. |
| `GlobalExceptionHandler` | Converts application exceptions into consistent HTTP responses. |

### Backend Configuration Notes

- Backend configuration is in `ordermanager-backend/src/main/resources/application.properties`.
- The backend uses PostgreSQL by default and H2 for tests.
- Liquibase is enabled through `db/changelog/db.changelog-master.xml`.
- Actuator endpoints are exposed under `/backend/management`.

> [!WARNING]
> `spring.jpa.hibernate.ddl-auto=update` is enabled together with Liquibase. For production-like environments, prefer explicit Liquibase migrations and review whether automatic schema updates should be disabled.

## Frontend

The frontend consists of two parts:

| Part | Location | Purpose |
| --- | --- | --- |
| Angular application | `ordermanager-ui/ui/resources/frontend/invoices` | Main browser application. |
| Spring Boot wrapper | `ordermanager-ui` | Serves the built Angular files and exposes `/backendUrl`. |

### Frontend Libraries

| Package / library | Description |
| --- | --- |
| Angular 19 | Main frontend framework. |
| Angular Forms | Template-driven and reactive forms. |
| Angular Router | Page routing. |
| Angular Material | Additional UI controls. |
| PrimeNG 19 | Main UI component library. |
| Vitest / Vite / AnalogJS Vitest Angular | Angular unit-test runner replacing Jasmine/Karma. |
| PrimeFlex | Utility CSS used with PrimeNG layouts. |
| ag-Grid | Invoice list/table display and PDF download action cells. |
| Transloco | English/German localization. |
| RxJS | Observable flows for HTTP, calculations, and component communication. |
| NgRx | Workflow state management. |
| moment | Date formatting and date manipulation. |
| angular-iban / iban | IBAN validation and formatting support. |
| jwt-decode | Client-side token decoding. |

### Frontend Components

| Area | Component / folder | Usage |
| --- | --- | --- |
| Shell | `app` | Root application component with navigation and routed page outlet. |
| Home | `home` | Start page for the application. |
| Invoice | `invoiceform` | Main invoice creation form using invoice header data and invoice item tables. |
| Invoice | `invoice-items-table` | Template-driven item table used while creating invoices; emits changes to the parent invoice form. |
| Invoice | `invoice-reactive-items-table` | Reactive-form item table used inside the invoice edit dialog. |
| Invoice | `edit-invoice-dialog` | Modal dialog for editing an existing invoice. |
| Invoice | `edit-item-dialog` | Modal dialog for editing catalog items. |
| Invoice | `invoice-management` | Management page for editing or deleting created invoices. |
| Invoice | `item-management` | Management page for catalog items/articles. |
| Invoice | `items-form` | Form for creating a reusable invoice catalog item. |
| Invoice | `printinvoice` | Invoice list used for PDF download. |
| Invoice | `table-cell-renderer` | ag-Grid cell renderer that triggers invoice PDF download. |
| Person | `personform` | Form for creating a person with addresses and bank accounts. |
| Person | `person-management` | Management page for existing persons. |
| Person | `edit-person-dialog` | Modal dialog for editing a selected person. |
| User | `user-login` | Login form and authentication entry point. |
| User | `user-registration` | Form for registering a new user. |
| Common | `confirmation-dialog` | Reusable yes/cancel confirmation dialog. |
| Common | `dateperiod-finder` | Shared date-period search component used by management pages. |
| Common | `editable-input-cell` | Reusable editable table cell. |
| Common | `templates-component` | Central collection of reusable Angular `TemplateRef` templates. |
| Common | `validatable-*` controls | Reusable form controls that display validation errors consistently. |
| Services | `common-services` | Shared HTTP, edit, utility, and event-bus services. |
| Pipes | `common-pipes` | Shared date and number formatting pipes. |
| Workflow | `workflows/invoice-workflow` | Step-by-step invoice creation workflow with NgRx state. |
| I18n | `transloco` and `assets/i18n` | Language loader, switcher, and English/German translation files. |

### Component Usage Patterns

#### Angular Signals

`InvoiceItemsTableCalculatorService` uses signals to keep invoice totals synchronized:

```typescript
totalNettoSum: WritableSignal<number> = signal(0);
totalBruttoSum: WritableSignal<number> = signal(0);
```

The service recalculates row net/gross values and invoice totals when invoice items are added, changed, or removed.

#### RxJS Calculation Pipeline

The invoice item calculator uses RxJS `of(...)`, `pipe(...)`, and `map(...)` calls to process calculator parameters step by step:

```typescript
const numberPromise = of(new CalculatorParameters(invoiceItems, modelItem))
  .pipe(map(data => this.calculateNettoSum(data)))
  .pipe(map(data => this.calculateBruttoSum(data)))
  .pipe(map(data => this.calculateTotalNettoSum(data)))
  .pipe(map(data => this.calculateTotalBruttoSum(data)));
```

This pattern keeps each calculation step small and readable.

#### Reusable Templates

`templates-component` exposes reusable `TemplateRef` templates for common form fields. Other components render them with `ngTemplateOutlet` and pass context-specific values:

```html
<ng-container
  *ngTemplateOutlet="templatesComponent.inputNumberTemplate;
  context: {
    controlPath: 'itemPrice',
    idComponent: 'id_ItemPrice',
    labelText: 'Item price'
  }">
</ng-container>
```

Use this pattern when several dialogs or forms need the same validated control layout.

#### Child-To-Parent Events

Item table components emit changes through `@Output` and `EventEmitter`:

```typescript
@Output() changeItemEvent = new EventEmitter<InvoiceItemModel[]>();
```

The parent invoice form listens to the event and updates the invoice model:

```html
<app-items-table (changeItemEvent)="itemsChanged($event)"></app-items-table>
```

#### Event Bus

`CommonServiceEventBus<T>` provides a lightweight event bus. It is used for debug/error flows, for example when a service emits an error and a management component displays it in debug mode.

#### Pipes

Shared pipes such as `standardFloat` format table values consistently:

```html
{{ invoiceitem.amountItems | standardFloat }}
```

## PDF Documents

Invoices are generated as PDF files with JasperReports. The report templates are stored in backend resources:

| Template | Purpose |
| --- | --- |
| `invoice.jrxml` | Main invoice report layout. |
| `invoice-data.jrxml` | Invoice data/subreport layout. |
| `jasperreports.properties` | JasperReports configuration. |

PDF generation flow:

1. The user creates and saves invoice data in the Angular UI.
2. `PrintinvoiceComponent` displays existing invoices.
3. The ag-Grid cell renderer sends a print request to the backend.
4. `JasperReportController` calls `JasperReportService`.
5. The backend returns `application/pdf` with an `attachment` filename.

Jaspersoft Studio is a practical tool for editing `.jrxml` layouts.

## Testing

| Scope | Command | Notes |
| --- | --- | --- |
| Full Maven project | `mvn clean install` | Builds and tests all Maven modules. |
| Backend only | `mvn test -pl ordermanager-backend` | Runs backend unit, repository, service, controller, and Cucumber tests. |
| Angular app | `npm test` | Run from `ordermanager-ui/ui/resources/frontend/invoices`. |
| Angular build | `npm run build` | Run from `ordermanager-ui/ui/resources/frontend/invoices`. |
| Node UI backend | `npm test` | Run from `ordermanager-ui/src-node`. |

Angular unit tests use Vitest through `@analogjs/vitest-angular`. The test target remains `ng test`, but `angular.json` delegates it to the Analog Vitest builder. Shared test initialization lives in `src/test-setup.ts`, including Angular TestBed setup, Transloco test translations, and small browser API polyfills needed by PrimeNG in jsdom. Vitest options live in `vite.config.mts`.

The Angular production build may warn about CommonJS dependencies such as `moment`, `iban`, or `ngx-auto-unsubscribe-decorator`. These warnings do not stop the build, but they indicate packages that can reduce tree-shaking. Prefer ESM-compatible replacements during dependency cleanup, or add intentional exceptions in `allowedCommonJsDependencies` if the current dependency is accepted.

## Useful URLs

| URL | Description |
| --- | --- |
| `http://localhost:8083/backend/swagger-ui.html` | Backend Swagger UI. |
| `http://localhost:8083/backend/v3/api-docs.yaml` | OpenAPI YAML. |
| `http://localhost:8083/backend/management` | Backend actuator base path. |
| `http://localhost:8082/frontend/backendUrl` | Frontend wrapper endpoint that returns the backend URL. |
| `http://localhost:8761` | Eureka service discovery UI. |

## Known Maintenance Notes

> [!TIP]
> Keep source files and generated files separate during reviews. Angular `dist`, copied frontend files under `src/main/resources/static`, `node_modules`, JVM crash logs, and `.DS_Store` files should not be treated as the canonical source.

> [!CAUTION]
> Some dependency declarations are older than the main platform version, for example the project includes Hibernate ORM 6 while also declaring `hibernate-entitymanager` 5.4. Review these before larger dependency upgrades.
