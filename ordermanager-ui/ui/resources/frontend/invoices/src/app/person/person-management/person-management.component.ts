import {Component, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {TableModule} from "primeng/table";
import {ToastModule} from "primeng/toast";
import {PersonFormModel} from "../../domain/domain.personformmodel";
import {AppSecurityService} from "../../user/user-login/app-security.service";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {DateperiodFinderComponent} from "../../common-components/dateperiod-finder/dateperiod-finder.component";

@Component({
  selector: 'app-person-management',
  standalone: true,
    imports: [CommonModule, TableModule, ToastModule, MatProgressSpinnerModule, DateperiodFinderComponent],
  templateUrl: './person-management.component.html',
  styleUrls: ['./person-management.component.css'],
  providers: [AppSecurityService]
})
export class PersonManagementComponent implements OnInit {

  _persons: PersonFormModel[];
  @ViewChild('dataFinder', {static: false}) dataFinder: DateperiodFinderComponent

  constructor(public appSecurityService: AppSecurityService) {
  }

  ngOnInit(): void {
    setTimeout(() =>{
      this.dataFinder.loadData(null)
    })
  }

  set persons(value) {
    this._persons = value
  }

  get persons() {
    return this._persons
  }

}
