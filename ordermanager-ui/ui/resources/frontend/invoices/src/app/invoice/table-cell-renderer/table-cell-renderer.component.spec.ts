import { waitForAsync, ComponentFixture, TestBed } from '@angular/core/testing';

import { TableCellRendererComponent } from './table-cell-renderer.component';
import { provideHttpClient, withInterceptorsFromDi } from "@angular/common/http";
import { MessageModule } from "primeng/message";
import { MessageService } from "primeng/api";
import { AgGridModule } from "ag-grid-angular";
import { ButtonModule } from "primeng/button";
import {TranslocoModule, TranslocoService, TranslocoTestingModule} from "@jsverse/transloco";
import {translocoServiceMock} from "../printinvoice/printinvoice.component.spec";

describe('TableCellRendererComponent', () => {
  let component: TableCellRendererComponent;
  let fixture: ComponentFixture<TableCellRendererComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
        declarations: [TableCellRendererComponent],
        imports: [MessageModule, AgGridModule, ButtonModule,
          TranslocoTestingModule.forRoot({
            langs: {
              en: {}
            },
            translocoConfig: {
              availableLangs: ['en'],
              defaultLang: 'en',
              reRenderOnLangChange: true
            }
          })
        ],
        providers: [MessageService, provideHttpClient(withInterceptorsFromDi())
      ]
    }).compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(TableCellRendererComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
