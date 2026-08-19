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
  input,
  OnInit,
  Output,
  Renderer2, viewChild
} from '@angular/core';
import {
  AbstractControl,
  ControlValueAccessor,
  FormsModule,
  NG_VALIDATORS,
  NG_VALUE_ACCESSOR,
  NgModel,
  ValidationErrors,
  Validator
} from '@angular/forms';
import { CommonModule } from "@angular/common";
import { MessageModule } from "primeng/message";
import { ToastModule } from "primeng/toast";
import { InputTextModule } from "primeng/inputtext";
import { FloatLabelModule } from 'primeng/floatlabel';
import { TranslocoModule } from '@jsverse/transloco';



@Component({
    selector: 'app-validatable-input-text',
    templateUrl: './validatable-input-text.component.html',
    styleUrls: ['./validatable-input-text.component.css'],
    providers: [
        {
            provide: NG_VALUE_ACCESSOR,
            useExisting: forwardRef(() => ValidatableInputTextComponent),
            multi: true
        },
        {
            provide: NG_VALIDATORS,
            useExisting: forwardRef(() => ValidatableInputTextComponent),
            multi: true
        }
    ],
    imports: [CommonModule, MessageModule, FormsModule, ToastModule, InputTextModule, FloatLabelModule, TranslocoModule],
    schemas: [CUSTOM_ELEMENTS_SCHEMA]
})
export class ValidatableInputTextComponent implements OnInit, ControlValueAccessor, Validator {
  /** minimal length of text */
  modelRef = viewChild.required<NgModel>('modelRef')
  txtMinLength = input(30);
  idComponent = input('');
  labelText = input('');
  inputType = input('text');
  inputPattern = input<any>();
  controlValue = '';
  name = input<any>('');
  inputName = input('');
  patternErrorText = input('');
  isValidable = input(true);
  @Output() componentHasErrorEvent = new EventEmitter<boolean>


  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};
  private onValidatorChange: () => void = () => {};
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
    this.onValidatorChange();
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
      this.hasPatternError = val
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
  get required(): boolean {
    return this.isValidable();
  }

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
    this.onValidatorChange();
  }

  validate(control: AbstractControl): ValidationErrors | null {
    if (!this.isValidable()) {
      return null;
    }

    const normalizedValue = this.normalizeValue(control.value);

    if (normalizedValue.trim().length === 0) {
      return {required: true};
    }

    if (this.txtMinLength() > 0 && normalizedValue.length < this.txtMinLength()) {
      return {
        minlength: {
          requiredLength: this.txtMinLength(),
          actualLength: normalizedValue.length
        }
      };
    }

    if (this.inputPattern() && !this.matchesPattern(normalizedValue)) {
      return {pattern: true};
    }

    return null;
  }

  registerOnValidatorChange(fn: () => void): void {
    this.onValidatorChange = fn;
  }

  private hasError() {
    const emitVal = (this.hasRequiredError === true ||
      this.hasMinLengthError === true ||
      this.hasPatternError === true)
    return emitVal;
  }

  inputClasses(componentName  ): any {
    // Coerce nullable booleans to false if modelRef is undefined
    const invalid = this.modelRef().invalid ?? false;
    const dirty   = this.modelRef().dirty ?? false;
    const touched = this.modelRef().touched ?? false;
    return {'ng-invalid ng-dirty': this.isValidable() && invalid && (dirty || touched)};

  }

  private normalizeValue(value: any): string {
    return value === null || value === undefined ? '' : String(value);
  }

  private matchesPattern(value: string): boolean {
    const inputPattern = this.inputPattern();
    const pattern = inputPattern instanceof RegExp
      ? inputPattern
      : new RegExp(`^(?:${inputPattern})$`);

    return pattern.test(value);
  }
}
