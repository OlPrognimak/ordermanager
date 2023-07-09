import {Component, OnInit} from '@angular/core';
import { CommonModule } from '@angular/common';
import {TableModule} from "primeng/table";
import {ToastModule} from "primeng/toast";
import {PersonFormModel} from "../domain/domain.personformmodel";
import {AppSecurityService} from "../user-login/app-security.service";
import {HttpClient, HttpClientModule, HttpHeaders} from "@angular/common/http";
import {MessagesPrinter} from "../common-services/common-services.app.http.service";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";

@Component({
  selector: 'app-person-management',
  standalone: true,
  imports: [CommonModule, TableModule, ToastModule, HttpClientModule, MatProgressSpinnerModule],
  templateUrl: './person-management.component.html',
  styleUrls: ['./person-management.component.css'],
  providers: [AppSecurityService, HttpClient, MessagesPrinter]
})
export class PersonManagementComponent implements OnInit {

  persons: PersonFormModel[];
  processRuns: boolean;

  constructor(public appSecurityService: AppSecurityService, private http: HttpClient,
              private messagePrinter: MessagesPrinter) {
  }

  ngOnInit(): void {
    this.loadPersonsInternal(this)
  }

  loadPersonsInternal(component: PersonManagementComponent): void {
    this.processRuns = true
    const headers = new HttpHeaders({
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    this.http.get<PersonFormModel[]>(
      this.appSecurityService.backendUrl + 'persons', {headers})
      .subscribe(
        {
          next(response) {
            component.persons = response
            component.processRuns = false
          },
          error(err) {
            component.processRuns = false
            component.messagePrinter.printUnSuccessMessage('of loading all persons', err)
          },
          complete() {
            component.processRuns = false
          }
        }
      )
  }
}
