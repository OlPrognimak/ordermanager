import {Component, EventEmitter, Input, Output, TemplateRef, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {InputTextModule} from "primeng/inputtext";
import {MessageModule} from "primeng/message";
import {FormControl, FormGroup, FormsModule, ReactiveFormsModule} from "@angular/forms";
import {DropdownChangeEvent, DropdownModule} from "primeng/dropdown";
import {CalendarModule} from "primeng/calendar";

@Component({
  selector: 'app-templates-component',
  standalone: true,
  imports: [CommonModule, InputTextModule, MessageModule, ReactiveFormsModule, DropdownModule, CalendarModule, FormsModule],
  templateUrl: './templates-component.component.html',
  styleUrls: ['./templates-component.component.css']
})
export class TemplatesComponentComponent {


  @ViewChild('inputTextTemplate', {static : true}) inputTextTemplate : TemplateRef<InputTextTemplateContext>;
  @ViewChild('comboboxTemplate', {static : true}) comboboxTemplate : TemplateRef<DropDownTemplateContext>;
  @ViewChild('calendarTemplate', {static : true}) calendarTemplate : TemplateRef<CalendarTemplateContext>;
  @ViewChild('standaloneFormCalendarTemplate', {static : true}) standaloneFormCalendarTemplate: TemplateRef<StandaloneCalendarTemplateContext>;

  @Input() templatesFormGroup: FormGroup
  @Output() dropdownValueChanged: EventEmitter<DropdownChangeEvent> = new EventEmitter<DropdownChangeEvent>()
  @Output() calendarValueChanged: EventEmitter<CalendarValueWrapper> = new EventEmitter<CalendarValueWrapper>()

  dateTemplateModel: Date

  getControl(controlPath: string) {
    const control: FormControl = this.templatesFormGroup.get(controlPath) as FormControl;
    //console.log(controlPath+": CONTROL Value =: "+ control.value)
    return control
  }

  onDropdownValueChanged(event: DropdownChangeEvent) {
    this.dropdownValueChanged.emit(event)
  }

  onCalendarChange(date: Date, name: string) {
    this.calendarValueChanged.emit({calendarName: name, date: date} )
  }


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

