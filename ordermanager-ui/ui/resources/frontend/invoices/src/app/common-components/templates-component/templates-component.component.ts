import { Component, EventEmitter, input, Output, TemplateRef, viewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InputTextModule } from "primeng/inputtext";
import { MessageModule } from "primeng/message";
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule } from "@angular/forms";
import { DropdownChangeEvent, DropdownModule } from "primeng/dropdown";
import { DatePickerModule } from 'primeng/datepicker';
import { PaginatorModule } from "primeng/paginator";
import {FloatLabel} from "primeng/floatlabel";
import {InputNumber} from "primeng/inputnumber";

@Component({
  selector: 'app-templates-component',
  standalone: true,
  imports: [CommonModule, InputTextModule, MessageModule, ReactiveFormsModule, DropdownModule, DatePickerModule, FormsModule, PaginatorModule, FloatLabel, InputNumber],
  templateUrl: './templates-component.component.html',
  styleUrls: ['./templates-component.component.css']
})
export class TemplatesComponentComponent {


  inputTextTemplate = viewChild.required<TemplateRef<InputTextTemplateContext>>('inputTextTemplate');
  inputNumberTemplate = viewChild.required<TemplateRef<InputTextTemplateContext>>('inputNumberTemplate');
  comboboxTemplate = viewChild.required<TemplateRef<DropDownTemplateContext>>('comboboxTemplate');
  calendarTemplate = viewChild.required<TemplateRef<CalendarTemplateContext>>('calendarTemplate');
  standaloneFormCalendarTemplate = viewChild.required<TemplateRef<StandaloneCalendarTemplateContext>>('standaloneFormCalendarTemplate');

  templatesFormGroup = input.required<FormGroup>();
  @Output() dropdownValueChanged: EventEmitter<DropdownChangeEvent> = new EventEmitter<DropdownChangeEvent>()
  @Output() calendarValueChanged: EventEmitter<CalendarValueWrapper> = new EventEmitter<CalendarValueWrapper>()

  dateTemplateModel: Date

  getControl(controlPath: string) {
    const control: FormControl = this.templatesFormGroup().get(controlPath) as FormControl;
    //console.log(controlPath+": CONTROL Value =: "+ control.value)
    return control
  }

  onDropdownValueChanged(event: DropdownChangeEvent) {
    this.dropdownValueChanged.emit(event)
  }

  onCalendarChange(date: Date, name: string) {
    this.calendarValueChanged.emit({calendarName: name, date: date})
  }

  onChange: (val: any) => void = () => {};
  onTouched: () => void = () => {};
}

export class InputTextTemplateContext {
  controlPath: string
  idComponent: string
  labelText: string
}

export class DropDownTemplateContext {
  controlPath: string
  idComponent: string
  labelText: string
  placeholderPar: string
  optionList: any
}

export class CalendarTemplateContext {
  controlPath: string
  idComponent: string
  labelText: string
  calendarDateFormat: string
}

export class StandaloneCalendarTemplateContext {
  controlName: string
  idComponent: string
  labelText: string
  calendarDateFormat: string
}

export class CalendarValueWrapper {
  calendarName: string
  date: Date
}
