import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ValidatableCalendarModule } from "../validatable-calendar/validatable-calendar.component";
import { FormsModule, NgModel } from "@angular/forms";
import { RequestDatePriod } from "../../domain/domain.invoiceformmodel";
import { RequestPeriodDateService } from "./datenperiod-finder.service";
import { ButtonModule } from "primeng/button";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { ToastModule } from "primeng/toast";
import { MessageModule } from "primeng/message";

@Component({
  selector: 'app-dateperiod-finder',
  standalone: true,
  imports: [CommonModule, ValidatableCalendarModule, FormsModule, ButtonModule, MatProgressSpinnerModule, ToastModule, MessageModule],
  templateUrl: './dateperiod-finder.component.html',
  styleUrls: ['./dateperiod-finder.component.css']
})
export class DateperiodFinderComponent implements OnInit, AfterViewInit {

  @Input() requestDatePeriod: RequestDatePriod = new RequestDatePriod()
  @Input() url: string = ''
  @Output() responseOutput = new EventEmitter<any>()
  @Output() onFinderIsReady = new EventEmitter<boolean>
  startDateControlModel: NgModel | undefined
  endDateControlModel: NgModel | undefined

  constructor(public service: RequestPeriodDateService) {
  }

  loadData() {
    this.service.findData(this.url, this.requestDatePeriod.toJSON(), callback => {
      if (callback) {
        this.responseOutput.emit(callback)
      }
    })
  }

  /**
   * Disable submit button if start date is more than end date
   *
   * @return true if start date is more than end date
   */
  isSubmitButtonDisabled(): boolean {
    if (this.startDateControlModel !== undefined || this.endDateControlModel !== undefined) {
      if (this.requestDatePeriod.startDate !== null && this.requestDatePeriod.endDate !== null &&
        this.requestDatePeriod.startDate > this.requestDatePeriod.endDate) {
        this.startDateControlModel?.control.setErrors({
          startDateMoreEndDate: true
        })
        this.endDateControlModel?.control.setErrors({
          startDateMoreEndDate: true
        })
        return true
      } else {
        this.startDateControlModel?.control.setErrors({
          startDateMoreEndDate: null
        })
        this.startDateControlModel?.control.updateValueAndValidity()
        this.endDateControlModel?.control.setErrors({
          startDateMoreEndDate: null
        })
        this.endDateControlModel?.control.updateValueAndValidity()
      }
    }
    return (this.startDateControlModel !== undefined && this.startDateControlModel.invalid!) ||
      (this.endDateControlModel !== undefined && this.endDateControlModel.invalid!);

  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.onFinderIsReady.emit(true)
  }

}
