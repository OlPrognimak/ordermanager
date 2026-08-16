# Ordermanager Project Analysis

Last reviewed: 2026-05-16

## Executive Summary

`ordermanager` is a Maven multi-module application for managing persons, invoice catalog items, invoices, invoice workflows, and PDF invoice generation. The system is split into a Spring Boot backend, an Angular frontend packaged through a Spring Boot UI wrapper, a Eureka service-discovery module, and Docker deployment resources. A small Node.js/Express service under `ordermanager-ui/src-node` appears to be a newer alternative to the Java UI wrapper for frontend/backend URL and management endpoints.

The project is useful as both an application and a technology playground: it contains REST APIs, JPA persistence, validation, JWT/security work, OpenAPI documentation, JasperReports, Liquibase, Angular forms, PrimeNG, ag-Grid, Transloco, NgRx workflow state, and Docker packaging.

## Module Map

| Module | Role | Main technology |
| --- | --- | --- |
| `ordermanager-backend` | Business REST API and persistence for users, persons, invoices, catalog items, and reports. | Spring Boot, Spring MVC, Spring Security, JPA/Hibernate, PostgreSQL, Liquibase, JasperReports |
| `ordermanager-ui` | Java service that serves the built Angular application and exposes `/backendUrl`. | Spring Boot Web, Thymeleaf/static resources, Eureka client |
| `ordermanager-ui/ui/resources/frontend/invoices` | Angular single-page application. | Angular 19, PrimeNG 19, Angular Material, ag-Grid, Transloco, RxJS, NgRx, Vitest |
| `ordermanager-ui/src-node` | Node.js/Express prototype or replacement for the UI wrapper. | Express, TypeScript, Vitest |
| `service-discovery` | Eureka registry for local/Docker service discovery. | Spring Cloud Netflix Eureka Server |
| `docker` | Build/deployment resources and copied runnable artifacts. | Docker, Docker Compose, Maven copy steps |

## Backend Architecture

The backend entry point is `ordermanager-backend/src/main/java/com/pr/ordermanager/AngularBackendApplication.java`. The servlet context path is `/backend`, and the default port is `8083`.

Backend packages follow domain-oriented boundaries:

| Package | Responsibility |
| --- | --- |
| `common` | Shared entities and request/response models such as `CreatedResponse`, `DropdownDataType`, and `RequestPeriodDate`. |
| `exception` | Application exception type, error codes, and global exception handling. |
| `invoice` | Invoice and catalog-item controllers, entities, models, repositories, mappers, validation, and services. |
| `person` | Person, address, and bank-account controllers, entities, models, repositories, validation, and services. |
| `report` | PDF generation API, JasperReports service, report models, and report mappers. |
| `security` | User registration/login, JWT support, Spring Security filters/configuration, users, roles, and repositories. |
| `utils` | Small shared utility code. |

Primary backend endpoints include:

| Area | Endpoint base | Notes |
| --- | --- | --- |
| Users/auth | `/registration`, `/login`, `/perform_logout`, `/checkUser` | Uses headers for registration and login credentials. Login returns a token response. |
| Persons | `/person`, `/persons`, `/person/personsdropdown`, `/person/personsListPeriod` | Creates, updates, deletes, lists, and filters persons for UI forms and management pages. |
| Invoices | `/invoice`, `/invoice/invoicesList`, `/invoice/invoicesListPeriod` | Creates, updates, deletes, lists, and filters invoices. |
| Catalog items | `/invoice/itemcatalog`, `/invoice/itemsCatalogList`, `/invoice/itemscatalogdropdown` | Creates, updates, deletes, lists, and supplies dropdown data for invoice items. |
| Reports | `/invoice/printreport` | Generates invoice PDFs through JasperReports. |

Persistence uses PostgreSQL by default. Liquibase is configured through `classpath:db/changelog/db.changelog-master.xml`, while `spring.jpa.hibernate.ddl-auto=update` is also enabled. That combination should be handled carefully because both schema migration and automatic schema updates can affect database structure.

## Frontend Architecture

The Angular application is located under `ordermanager-ui/ui/resources/frontend/invoices`. It is routed by `src/app/app-routing.module.ts`.

Important route-to-feature mapping:

| Route | Component | Purpose |
| --- | --- | --- |
| `/` | `HomeComponent` | Application landing/home view. |
| `/create-invoice-item-page` | `ItemsFormComponent` | Create a catalog item. |
| `/catalog-item-management-page` | `ItemManagementComponent` | Manage invoice catalog items. |
| `/create-invoice-page` | `InvoiceFormComponent` | Create an invoice. |
| `/invoice-management-page` | `InvoiceManagementComponent` | Manage existing invoices. |
| `/invoice-list-page` | `PrintinvoiceComponent` | List invoices and download PDFs. |
| `/create-person-page` | `PersonFormComponent` | Create a person/customer/supplier. |
| `/person-management-page` | `PersonManagementComponent` | Manage existing persons. |
| `/user-registration-page` | `UserRegistrationComponent` | Register users. |
| `/workflow-create-invoice` | `InvoiceWorkflowComponent` | Step-based invoice creation workflow. |

Frontend feature folders:

| Folder | Responsibility |
| --- | --- |
| `invoice` | Invoice forms, edit dialogs, item tables, catalog item management, invoice management, and PDF download cells. |
| `person` | Person creation, editing, and management views. |
| `user` | Login and registration components. |
| `common-auth` | Authentication service and HTTP interceptor. |
| `common-components` | Reusable form controls, validation controls, confirmation dialog, editable input cell, template component, and date-period finder. |
| `common-services` | Shared HTTP, edit, utility, and event-bus services. |
| `common-pipes` | Shared date and number formatting pipes. |
| `transloco` | I18n loader, providers, language switcher, and language-change event. |
| `workflows` | Lazy-loaded invoice workflow module with NgRx state. |
| `domain` | TypeScript domain models used by forms and services. |

The Angular build output is copied into `ordermanager-ui/src/main/resources/static` during Maven builds. Treat those copied files as generated output.

## Build And Packaging Flow

The parent Maven project lists these modules: `ordermanager-backend`, `ordermanager-ui`, `service-discovery`, and `docker`.

`mvn clean install` builds the Java modules and copies runnable jars into Docker folders:

| Artifact | Destination |
| --- | --- |
| `ordermanager-backend.jar` | `docker/backend/ordermanager-backend.jar` |
| `ordermanager-ui.jar` | `docker/frontend/ordermanager-ui.jar` |
| `service-discovery.jar` | `docker/discovery/service-discovery.jar` |

The `build-angular` Maven profile in `ordermanager-ui` runs the Angular build and copies output into the Java wrapper resources. Docker-related Maven profiles exist for Azure deployment and image creation, and Docker-specific instructions live under `docker/README_DOCKER.md`.

## Configuration

Default backend settings:

| Setting | Value |
| --- | --- |
| Port | `${START_PORT:8083}` |
| Context path | `/backend` |
| Database URL | `jdbc:postgresql://${DB_HOST:localhost}:${DB_PORT:5455}/${DB_NAME:test_db}` |
| Database credentials | `${db.username:test}` / `${db.password:test}` |
| Eureka URL | `http://discovery:8761/eureka/` |
| Actuator base path | `/management` |

Default frontend wrapper settings:

| Setting | Value |
| --- | --- |
| Port | `8082` |
| Context path | `/frontend` |
| Backend URL property | `app.backend.url` |
| Local backend URL | `http://localhost:8083/backend/` |

Default service discovery settings:

| Setting | Value |
| --- | --- |
| Port | `8761` |
| Registry mode | Standalone Eureka server |
| Default zone | `http://localhost:8761/eureka/` |

## Testing

Backend tests include unit, repository, controller, service, JasperReports utility, security, and Cucumber integration-style tests. The backend test resources configure an H2 database for tests that need persistence.

Angular unit tests are configured through Vitest using `@analogjs/vitest-angular`, with shared setup in `src/test-setup.ts` and runner options in `vite.config.mts`. Jasmine/Karma are no longer used for Angular unit tests. The Node.js UI backend uses Vitest and Supertest.

Useful commands:

| Scope | Command |
| --- | --- |
| Full Maven build and tests | `mvn clean install` |
| Backend tests | `mvn test -pl ordermanager-backend` |
| Angular tests | `npm test` from `ordermanager-ui/ui/resources/frontend/invoices` |
| Angular build | `npm run build` from `ordermanager-ui/ui/resources/frontend/invoices` |
| Node backend tests | `npm test` from `ordermanager-ui/src-node` |

## Maintenance Notes

- `README.md` had drifted from the code in several places. The current code uses Spring Boot 3.5.14, Java 21, Angular 19, Spring Cloud 2025.0.0, and OpenAPI UI 2.8.17.
- The Spring Boot parent version is `3.5.14`. Prefer the parent version as the source of truth for documentation and dependency-alignment checks.
- `hibernate-entitymanager` 5.4.2.Final is still declared next to Hibernate ORM 6.2.3.Final. That is a potential modernization/compatibility cleanup.
- The backend uses both Liquibase and `ddl-auto=update`; this can hide migration problems. Prefer explicit Liquibase changes for schema evolution in production-like environments.
- Several generated or local files are checked in or present in the workspace, including `node_modules`, Angular `dist`, `.DS_Store`, and JVM crash logs. Avoid relying on them as source files.
- The backend security package includes JWT-related classes while some documentation still mentions BasicAuth. Current documentation should describe the implementation as custom Spring Security with login/token support unless a code review confirms BasicAuth is still the active runtime contract.
