# Frontend

Angular frontend for Ordermanager.

Current frontend version: `0.1.0`.

This application uses Angular 19, PrimeNG 19, Transloco, NgRx, and Vitest. Unit tests were migrated from Jasmine/Karma to Vitest through `@analogjs/vitest-angular`.

## Development server

Run `ng serve` for a dev server. Navigate to `http://localhost:4200/`. The app will automatically reload if you change any of the source files.

## Code scaffolding

Run `ng generate component component-name` to generate a new component. You can also use `ng generate directive|pipe|service|class|guard|interface|enum|module`.

## Build

Run `ng build` or `npm run build` to build the project. The build artifacts are written to `dist/static`.

## Running unit tests

Run `ng test` or `npm test` to execute unit tests via [Vitest](https://vitest.dev).

Important test files:

- `vite.config.mts`: Vitest and Vite configuration.
- `src/test-setup.ts`: Angular TestBed setup, Transloco test module, and jsdom browser polyfills.
- `tsconfig.spec.json`: Vitest, Vite, and Node test typings.

The Angular CLI `test` target uses `@analogjs/vitest-angular:test`; Jasmine and Karma are no longer used for unit tests.

## Running end-to-end tests

Run `ng e2e` to execute the end-to-end tests via [Protractor](http://www.protractortest.org/).

## Further help

To get more help on the Angular CLI use `ng help` or go check out the [Angular CLI README](https://github.com/angular/angular-cli/blob/master/README.md).
