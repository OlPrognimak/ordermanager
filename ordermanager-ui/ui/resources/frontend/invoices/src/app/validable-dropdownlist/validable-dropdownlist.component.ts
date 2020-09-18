import {Component, ElementRef, forwardRef, Input, OnInit, Renderer2} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";

@Component({
  selector: 'app-validable-dropdownlist',
  templateUrl: './validable-dropdownlist.component.html',
  styleUrls: ['./validable-dropdownlist.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ValidableDropdownlistComponent),
      multi: true
    }
  ]
})
export class ValidableDropdownlistComponent implements OnInit, ControlValueAccessor {
  @Input() optionList: any;
  @Input()  public txtMinLength = 0;
  @Input() public idComponent = '';
  @Input() public labelText = '';
  value: any;
  onChange: (val) => void;
  onTouched: () => void;

  constructor(private renderer: Renderer2, private elementRef: ElementRef) { }

  ngOnInit(): void {
  }

  registerOnChange(fn: any): void {
    console.log('OnChange Called: ' + fn);
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
  }

  /**
   *
   */
  writeValue(value: any): void {
    if (value !== undefined){
      this.value = value;
      //this.renderer.setProperty(this.elementRef.nativeElement, 'personFormModel.personType', value);
    }
  }
}
