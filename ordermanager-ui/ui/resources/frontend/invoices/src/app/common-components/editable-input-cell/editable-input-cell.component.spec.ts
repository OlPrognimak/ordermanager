import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { EditableInputCellComponent } from './editable-input-cell.component';
import { TableModule } from "primeng/table";
import { FormsModule } from "@angular/forms";
import { InvoiceItemModel } from "../../domain/domain.invoiceformmodel";
import { CommonServicesPipesNumber } from "../../common-pipes/common-services.pipes.number";

@Component({
  template: `
    <p-table [value]="[rowModel]">
      <ng-template pTemplate="body" let-rowModel>
        <tr>
          <td pEditableColumn>
            <app-editable-input-cell [rowModel]="rowModel"></app-editable-input-cell>
          </td>
        </tr>
      </ng-template>
    </p-table>
  `,
  imports: [EditableInputCellComponent, TableModule]
})
class EditableInputCellHostComponent {
  rowModel = new InvoiceItemModel();
}

describe('EditableInputCellComponent', () => {
  let component: EditableInputCellComponent;
  let fixture: ComponentFixture<EditableInputCellHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsModule, TableModule, CommonServicesPipesNumber, EditableInputCellHostComponent]
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(EditableInputCellHostComponent);
    console.log("Fixture :" + fixture)
    fixture.detectChanges();
    component = fixture.debugElement.query(By.directive(EditableInputCellComponent)).componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
