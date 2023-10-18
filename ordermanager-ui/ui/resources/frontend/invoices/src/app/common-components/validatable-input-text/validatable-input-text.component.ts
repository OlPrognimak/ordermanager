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
  ChangeDetectorRef,
  Component,
  CUSTOM_ELEMENTS_SCHEMA,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  NgModule,
  OnInit,
  Output,
  Renderer2
} from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from "@angular/common";
import { MessagesModule } from "primeng/messages";
import { MessageModule } from "primeng/message";
import { ToastModule } from "primeng/toast";
import { InputTextModule } from "primeng/inputtext";


@Component({
  selector: 'app-validatable-input-text',
  templateUrl: './validatable-input-text.component.html',
  styleUrls: ['./validatable-input-text.component.css'],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => ValidatableInputTextComponent),
      multi: true
    }
  ]
})
export class ValidatableInputTextComponent implements OnInit, ControlValueAccessor {
  /** minimal length of text */
  @Input() public txtMinLength = 30;
  @Input() public idComponent = '';
  @Input() labelText = '';
  @Input() inputType = 'text';
  @Input() inputPattern: any;
  @Input() controlValue = '';
  @Input() name: any = '';
  @Input() inputName: string;
  @Input() patternErrorText: string
  @Output() componentHasErrorEvent = new EventEmitter<boolean>


  onChange: (val) => {};
  onTouched: () => {};
  hasRequiredError: boolean = false
  hasMinLengthError: boolean = false
  hasPatternError: boolean = false

  lastEmitedValue: boolean | undefined = undefined
  disabled: boolean = false

  constructor(private renderer: Renderer2, private elementRef: ElementRef, private cdr: ChangeDetectorRef) {
  }

  // get accessor
  get value(): any {
    return this.controlValue;
  }

  set value(v: any) {
    this.controlValue = v;
    this.onChange(v);
    this.cdr.detectChanges()
  }

  setHasRequiredError(val: boolean, origin: any) {
    if (this.hasRequiredError === undefined || this.hasRequiredError !== val) {
      this.hasRequiredError = val
      const emitVal = this.hasError()
      if (this.lastEmitedValue === undefined || this.lastEmitedValue !== emitVal) {
        this.lastEmitedValue = emitVal
        this.componentHasErrorEvent.emit(emitVal)
      }
    }
    return origin
  }

  setHasMinLengthError(val: boolean, origin: any) {
    if (this.hasMinLengthError === undefined || this.hasMinLengthError !== val) {
      this.hasMinLengthError = val
      const emitVal = this.hasError()
      if (this.lastEmitedValue === undefined || this.lastEmitedValue !== emitVal) {
        this.lastEmitedValue = emitVal
        this.componentHasErrorEvent.emit(emitVal)
      }
    }

    return origin;
  }

  setHasPatternError(val: boolean, origin: any) {
    if (this.hasPatternError === undefined || this.hasPatternError !== val) {
      this.hasMinLengthError = val
      const emitVal = this.hasError();
      if (this.lastEmitedValue === undefined || this.lastEmitedValue !== emitVal) {
        this.lastEmitedValue = emitVal
        this.componentHasErrorEvent.emit(emitVal)
      }
    }

    return origin;
  }

  ngOnInit(): void {
  }

  // set accessor including call the onchange callback

  registerOnChange(fn: any): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled
  }

  /**
   *
   */
  writeValue(value: any): void {
    this.controlValue = value;
  }

  private hasError() {
    const emitVal = (this.hasRequiredError === true ||
      this.hasMinLengthError === true ||
      this.hasPatternError === true)
    return emitVal;
  }

}

@NgModule(
  {
    imports: [CommonModule, MessagesModule, MessageModule, FormsModule, ToastModule, InputTextModule],
    declarations: [ValidatableInputTextComponent],
    exports: [ValidatableInputTextComponent],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
  }
)
export class ValidatableInputTextModule {

}
