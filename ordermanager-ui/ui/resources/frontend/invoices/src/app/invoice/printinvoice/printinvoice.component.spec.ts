import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { PrintinvoiceComponent } from './printinvoice.component';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { MessageService } from 'primeng/api';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { AgGridModule } from 'ag-grid-angular';
import { TranslocoService } from '@jsverse/transloco';
import {of, Subject} from "rxjs";

export const translocoServiceMock = {
  translate: (key: string) => key,
  getActiveLang: () => 'en',
  load: () => of({}),
  langChanges$: new Subject<string>()
};
describe('PrintinvoiceComponent', () => {
  let component: PrintinvoiceComponent;
  let fixture: ComponentFixture<PrintinvoiceComponent>;


  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      imports: [
        PrintinvoiceComponent,
        MessageModule,
        ToastModule,
        AgGridModule
      ],
      providers: [
        MessageService,
        provideHttpClient(withInterceptorsFromDi()),
        {
          provide: TranslocoService,
          useValue: translocoServiceMock
        }
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(PrintinvoiceComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
