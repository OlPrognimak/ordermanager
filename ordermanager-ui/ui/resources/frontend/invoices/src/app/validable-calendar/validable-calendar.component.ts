import {Component, ElementRef, forwardRef, Input, OnInit, Renderer2} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {CalendarModule} from "primeng/calendar";


@Component({
  selector: 'app-validable-calendar',
  templateUrl: './validable-calendar.component.html',
  styleUrls: ['./validable-calendar.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ValidableCalendarComponent),
      multi: true
    }
  ]
})
export class ValidableCalendarComponent implements OnInit, ControlValueAccessor {

  /** minimal length of text */
  @Input()  public txtMinLength = 1;
  @Input() public idComponent = '';
  @Input() public labelText = '';
  @Input() dateFormat = 'dd.mm.yy';

  public value = '';
  calModul: CalendarModule;
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
    }
  }

}
