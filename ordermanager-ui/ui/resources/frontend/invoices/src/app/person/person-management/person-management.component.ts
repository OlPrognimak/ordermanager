import {Component, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {TableModule} from "primeng/table";
import {ToastModule} from "primeng/toast";
import {PersonFormModel} from "../../domain/domain.personformmodel";
import {AppSecurityService} from "../../user/user-login/app-security.service";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {DateperiodFinderComponent} from "../../common-components/dateperiod-finder/dateperiod-finder.component";
import {EditPersonDialogComponent} from "../edit-person-dialog/edit-person-dialog.component";
import {FormControl, FormGroup, ReactiveFormsModule} from "@angular/forms";
import {DialogModule} from "primeng/dialog";
import {InputTextModule} from "primeng/inputtext";

@Component({
  selector: 'app-person-management',
  standalone: true,
  imports: [CommonModule, TableModule, ToastModule, MatProgressSpinnerModule, DateperiodFinderComponent, EditPersonDialogComponent, ReactiveFormsModule, DialogModule, InputTextModule],
  templateUrl: './person-management.component.html',
  styleUrls: ['./person-management.component.css'],
  providers: [AppSecurityService]
})
export class PersonManagementComponent implements OnInit {
  //@ViewChild('personDialog') personDialog
  isPersonDialogVisible = false;
  _persons: PersonFormModel[];
  @ViewChild('dataFinder', {static: false}) dataFinder: DateperiodFinderComponent
  testyGroup = new FormGroup({
    testName: new FormControl('YYYYYYYY'),
    addressGroup: new FormGroup({
      testStreet: new FormControl('XXXXXXX')
    })

  });
  getFormGroup(name: string) {

  }

  /**TODO test only**/
  visible: boolean = true;

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

  rowDoubleClick(event: MouseEvent, person: PersonFormModel) {
    setTimeout(() => {
      this.isPersonDialogVisible = true
    })

  }

  isPersonEditDialogVisible( val: boolean) {
    setTimeout(() => {
      this.isPersonDialogVisible = val
    })
  }

  showPersonDialog() {
    return this.isPersonDialogVisible
  }

  getControlName(controlNamePar: string) {
    return this.testyGroup.get(controlNamePar) as FormControl;
  }
}
