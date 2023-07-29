/*
 * Copyright (c) 2020, Oleksandr Prognimak. All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 *   - Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 *
 *   - Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 *
 *   - The name of Oleksandr Prognimak
 *     may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS
 * IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO,
 * THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR
 * PURPOSE ARE DISCLAIMED.  IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
import {
  AfterViewInit,
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  NgModule,
  OnInit,
  Output,
  Renderer2, ViewChild
} from '@angular/core';
import {ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR, NgModel} from "@angular/forms";
import {CalendarModule} from 'primeng/calendar';
import {CommonModule} from "@angular/common";
import {MessagesModule} from "primeng/messages";
import {MessageModule} from "primeng/message";
import {ToastModule} from "primeng/toast";
import {InputTextModule} from "primeng/inputtext";
import {dateTimestampProvider} from "rxjs/internal/scheduler/dateTimestampProvider";


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

  /** minimal length of text */
  @ViewChild('modelCalenderRef') modelCalenderRef: NgModel;
  @Input()  public txtMinLength = 1;
  @Input() public idComponent = '';
  @Input() public labelText = '';
  @Input() dateFormat;
  @Input() name = ''
  @Input() controlValue = '';
  @Input() calendarDateFormat: string;
  @Output() controlModel: EventEmitter<NgModel> = new EventEmitter<NgModel>()
  hasRequiredError: boolean =  false
  hasMinLengthError: boolean =  false
  lastEmitedValue: boolean = undefined
  @Output() componentHasError = new EventEmitter<boolean>
  onChange: (val) => void;
  onTouched: () => void;


  constructor(private renderer: Renderer2, private elementRef: ElementRef) { }

  setHasRequiredError(val: boolean, origin: any) {
    if(this.hasRequiredError === undefined || this.hasRequiredError !==val) {
      this.hasRequiredError = val
      const emitVal = (this.hasRequiredError===true||this.hasMinLengthError===true)
      if(this.lastEmitedValue === undefined || this.lastEmitedValue !== emitVal) {
        this.lastEmitedValue = emitVal
        this.componentHasError.emit(emitVal)
      }
    }
    return origin
  }

  setHasMinLengthError(val: boolean, origin: any) {
    if(this.hasMinLengthError === undefined || this.hasMinLengthError !==val) {
      this.hasMinLengthError = val
      const emitVal = (this.hasRequiredError===true||this.hasMinLengthError===true)
      if(this.lastEmitedValue === undefined || this.lastEmitedValue !== emitVal) {
        this.lastEmitedValue = emitVal
        this.componentHasError.emit(emitVal)
      }
    }

    return origin;
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
    console.log('registr on change: '+fn)
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
      this.controlValue = value;
  }
  protected readonly dateTimestampProvider = dateTimestampProvider;

  ngAfterViewInit(): void {
    setTimeout(() =>{
      this.controlModel.emit(this.modelCalenderRef)
    })

  }
}

@NgModule(
  {
    imports: [CommonModule, MessagesModule, MessageModule, FormsModule, ToastModule, InputTextModule, CalendarModule,],
    declarations: [ValidatableCalendarComponent],
    exports: [ValidatableCalendarComponent]
  }
)
export class ValidatableCalendarModule{}
