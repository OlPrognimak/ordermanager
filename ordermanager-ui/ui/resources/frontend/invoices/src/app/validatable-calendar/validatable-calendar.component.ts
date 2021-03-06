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
import {Component, ElementRef, forwardRef, Input, OnInit, Renderer2} from '@angular/core';
import {ControlValueAccessor, NG_VALUE_ACCESSOR} from "@angular/forms";
import {CalendarModule} from 'primeng/calendar';


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
export class ValidatableCalendarComponent implements OnInit, ControlValueAccessor {

  /** minimal length of text */
  @Input()  public txtMinLength = 1;
  @Input() public idComponent = '';
  @Input() public labelText = '';
  @Input() dateFormat = 'dd.mm.yy';

  @Input() controlValue = '';
  calModul: CalendarModule;
  onChange: (val) => void;
  onTouched: () => void;


  constructor(private renderer: Renderer2, private elementRef: ElementRef) { }

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

  setDisabledState(isDisabled: boolean): void {
  }

  /**
   *
   */
  writeValue(value: any): void {
      this.controlValue = value;
  }

}
