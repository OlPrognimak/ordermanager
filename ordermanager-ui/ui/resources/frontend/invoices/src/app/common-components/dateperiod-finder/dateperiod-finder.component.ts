import {Component, EventEmitter, Input, Output} from '@angular/core';
import { CommonModule } from '@angular/common';
import {ValidatableCalendarModule} from "../../validatable-calendar/validatable-calendar.component";
import {FormsModule, NgForm, NgModel} from "@angular/forms";
import {RequestDatePriod} from "../../domain/domain.invoiceformmodel";
import {RequestPeriodDateService} from "./datenperiod-finder.service";
import {ButtonModule} from "primeng/button";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {printToJson} from "../../common-services/common-services-util.service";

@Component({
  selector: 'app-dateperiod-finder',
  standalone: true,
  imports: [CommonModule, ValidatableCalendarModule, FormsModule, ButtonModule, MatProgressSpinnerModule],
  templateUrl: './dateperiod-finder.component.html',
  styleUrls: ['./dateperiod-finder.component.css']
})
export class DateperiodFinderComponent {

  constructor( public service: RequestPeriodDateService) {
  }

  @Input() requestDatePeriod: RequestDatePriod = new RequestDatePriod()
  @Input() url: string = ''
  @Output() responseOutput = new EventEmitter<any>()
  startDateControlModel: NgModel
  endDateControlModel: NgModel

  loadData(finderPeriodForm:NgForm) {
    this.service.findData(this.url, this.requestDatePeriod.toJSON(), callback =>{
      if(callback) {
        this.responseOutput.emit(callback)
      }
    })
  }

  isSubmitButtonDisabled(): boolean {
    if(this.startDateControlModel!==undefined||this.endDateControlModel!==undefined) {
      return (this.startDateControlModel !== undefined && this.startDateControlModel.invalid) ||
        (this.endDateControlModel !== undefined && this.endDateControlModel.invalid);
    }else{
      return false
    }
  }

}
