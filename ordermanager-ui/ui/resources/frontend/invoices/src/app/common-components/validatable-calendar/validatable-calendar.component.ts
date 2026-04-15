import {
  AfterViewInit,
  Component,
  EventEmitter,
  forwardRef,
  Input,
  NgModule,
  OnInit,
  Output,
  ViewChild
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, NgModel } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessagesModule } from 'primeng/messages';
import { MessageModule } from 'primeng/message';
import { ToastModule } from 'primeng/toast';
import { FloatLabel } from 'primeng/floatlabel';
import { DatePickerModule } from 'primeng/datepicker';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-validatable-calendar',
  templateUrl: './validatable-calendar.component.html',
  styleUrls: ['./validatable-calendar.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ValidatableCalendarComponent),
      multi: true
    }
  ]
})
export class ValidatableCalendarComponent implements OnInit, ControlValueAccessor, AfterViewInit {
  @ViewChild('modelCalendarRef') modelCalendarRef?: NgModel;

  @Input() public txtMinLength = 1;
  @Input() public idComponent = '';
  @Input() public labelText = '';
  @Input() public dateFormat: string = '';
  @Input() public name = '';
  @Input() public controlValue: any = null;
  @Input() public calendarDateFormat: string = '';

  @Output() controlModel = new EventEmitter<NgModel>();
  @Output() componentHasError = new EventEmitter<boolean>();

  hasRequiredError = false;
  hasMinLengthError = false;
  lastEmitedValue: boolean | undefined = undefined;

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};
  @Input() protected isRequired: boolean  = true;
  get required(): boolean {
    return this.isRequired
  }

  ngOnInit(): void {}

  get value(): any {
    return this.controlValue;
  }

  set value(v: any) {
    if (v !== this.controlValue) {
      this.controlValue = v;
      this.onChange(v);
    }
  }

  writeValue(value: any): void {
    this.controlValue = value;
  }

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {}

  setHasRequiredError(val: boolean, origin: any) {
    if (this.hasRequiredError !== val) {
      this.hasRequiredError = val;
      const emitVal = this.hasRequiredError || this.hasMinLengthError;
      if (this.lastEmitedValue !== emitVal) {
        this.lastEmitedValue = emitVal;
        this.componentHasError.emit(emitVal);
      }
    }
    return origin;
  }

  setHasMinLengthError(val: boolean, origin: any) {
    if (this.hasMinLengthError !== val) {
      this.hasMinLengthError = val;
      const emitVal = this.hasRequiredError || this.hasMinLengthError;
      if (this.lastEmitedValue !== emitVal) {
        this.lastEmitedValue = emitVal;
        this.componentHasError.emit(emitVal);
      }
    }
    return origin;
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      if (this.modelCalendarRef) {
        this.controlModel.emit(this.modelCalendarRef);
      }
    });
  }
}

@NgModule({
  imports: [
    CommonModule,
    MessagesModule,
    MessageModule,
    FormsModule,
    ToastModule,
    DatePickerModule,
    FloatLabel,
    TranslocoModule
  ],
  declarations: [ValidatableCalendarComponent],
  exports: [ValidatableCalendarComponent]
})
export class ValidatableCalendarModule {}
