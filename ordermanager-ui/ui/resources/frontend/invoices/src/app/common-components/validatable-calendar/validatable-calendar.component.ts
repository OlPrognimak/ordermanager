import {
  AfterViewInit,
  Component,
  EventEmitter,
  forwardRef,
  input,
  OnInit,
  Output,
  viewChild
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, NgModel } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MessageModule } from "primeng/message";
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
    ],
    imports: [
      CommonModule,
      MessageModule,
      FormsModule,
      ToastModule,
      DatePickerModule,
      FloatLabel,
      TranslocoModule
    ]
})
export class ValidatableCalendarComponent implements OnInit, ControlValueAccessor, AfterViewInit {
  modelCalendarRef = viewChild.required<NgModel>('modelCalendarRef');

  txtMinLength = input(1);
  idComponent = input('');
  labelText = input('');
  dateFormat = input('');
  name = input('');
  controlValue: any = null;
  calendarDateFormat = input('');

  @Output() controlModel = new EventEmitter<NgModel>();
  @Output() componentHasError = new EventEmitter<boolean>();

  hasRequiredError = false;
  hasMinLengthError = false;
  lastEmitedValue: boolean | undefined = undefined;
  private pendingErrorUpdate = false;

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};
  protected isRequired = input(true);

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
    this.scheduleErrorStateUpdate(val, this.hasMinLengthError);
    return origin;
  }

  setHasMinLengthError(val: boolean, origin: any) {
    this.scheduleErrorStateUpdate(this.hasRequiredError, val);
    return origin;
  }

  private scheduleErrorStateUpdate(hasRequiredError: boolean, hasMinLengthError: boolean): void {
    if (this.hasRequiredError === hasRequiredError && this.hasMinLengthError === hasMinLengthError) {
      return;
    }

    if (this.pendingErrorUpdate) {
      return;
    }

    this.pendingErrorUpdate = true;
    setTimeout(() => {
      this.pendingErrorUpdate = false;
      this.hasRequiredError = hasRequiredError;
      this.hasMinLengthError = hasMinLengthError;
      const emitVal = this.hasRequiredError || this.hasMinLengthError;
      if (this.lastEmitedValue !== emitVal) {
        this.lastEmitedValue = emitVal;
        this.componentHasError.emit(emitVal);
      }
    });
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.controlModel.emit(this.modelCalendarRef());
    });
  }
}
