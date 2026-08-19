import { Component, ElementRef, EventEmitter, forwardRef, input, OnInit, Output, Renderer2 } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { InvoiceItemModel } from "../../domain/domain.invoiceformmodel";
import { InputTextModule } from "primeng/inputtext";
import { TableModule } from "primeng/table";
import { CommonServicesPipesNumber } from "../../common-pipes/common-services.pipes.number";

@Component({
    selector: 'app-editable-input-cell',
    templateUrl: './editable-input-cell.component.html',
    styleUrls: ['./editable-input-cell.component.css'],
    styles: [
        ':host ::ng-deep .p-cell-editing {\n' +
            '          padding-top: 0 !important;\n' +
            '          padding-bottom: 0 !important;\n' +
            '      }'
    ],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => EditableInputCellComponent),
            multi: true
        }
    ],
    imports: [FormsModule, InputTextModule, TableModule, CommonServicesPipesNumber]
})
export class EditableInputCellComponent implements OnInit, ControlValueAccessor {

  rowModel = input.required<InvoiceItemModel>();
  controlValue: number;
  @Output() changeItemEvent = new EventEmitter<InvoiceItemModel>();
  /** on value change callback */
  onChange: (val) => void;
  /** on touched event */
  onTouched: () => void;

  constructor(private renderer: Renderer2, private elementRef: ElementRef) {
  }

  // get accessor
  get value(): any {
    return this.controlValue;
  }

  // set accessor including call the onchange callback
  set value(v: any) {
    if (v !== this.controlValue) {
      this.controlValue = v;
      this.onChange(v);
    }
  }

  ngOnInit(): void {
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  writeValue(val: any): void {
    this.controlValue = val;
    this.changeItemEvent.emit(this.rowModel());
  }

}
