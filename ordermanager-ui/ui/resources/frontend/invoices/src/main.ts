import { enableProdMode } from '@angular/core';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { HTTP_INTERCEPTORS, provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { provideRouter } from '@angular/router';
import { provideStore } from '@ngrx/store';
import Lara from '@primeng/themes/lara';
import { providePrimeNG } from 'primeng/config';

import { AppComponent } from './app/app.component';
import { routes } from './app/app-routing.module';
import { BasicInterceptor } from './app/common-auth/basic-auth-interceptor';
import { CommonServicesAppHttpService } from './app/common-services/common-services.app.http.service';
import { CommonServicesUtilService } from './app/common-services/common-services-util.service';
import { InvoiceItemsTableCalculatorService } from './app/invoice/invoice-items-table/invoice-items-table.calculator.service';
import { invoiceReducer } from './app/workflows/invoice-workflow/state/invoice.reducer';
import { translocoProviders } from './app/transloco/transloco.providers';
import { environment } from './environments/environment';
import { MessageService } from 'primeng/api';

if (environment.production) {
  enableProdMode();
}

bootstrapApplication(AppComponent, {
  providers: [
    provideAnimations(),
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
    provideStore({invoiceWorkflow: invoiceReducer}),
    providePrimeNG({
      theme: {
        preset: Lara
      }
    }),
    CommonServicesAppHttpService,
    CommonServicesUtilService,
    MessageService,
    InvoiceItemsTableCalculatorService,
    ...translocoProviders,
    {provide: HTTP_INTERCEPTORS, useClass: BasicInterceptor, multi: true}
  ]
})
  .catch(err => console.error(err));
