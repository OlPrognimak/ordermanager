import {Component, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {TableModule} from "primeng/table";
import {ToastModule} from "primeng/toast";
import {PersonFormModel} from "../../domain/domain.personformmodel";
import {AppSecurityService} from "../../user/user-login/app-security.service";
import {MatProgressSpinnerModule} from "@angular/material/progress-spinner";
import {DateperiodFinderComponent} from "../../common-components/dateperiod-finder/dateperiod-finder.component";
import {EditPersonDialogComponent} from "../edit-person-dialog/edit-person-dialog.component";
import {ReactiveFormsModule} from "@angular/forms";
import {DialogModule} from "primeng/dialog";
import {InputTextModule} from "primeng/inputtext";
import {ButtonModule} from "primeng/button";
import {CommonServicesAppHttpService} from "../../common-services/common-services.app.http.service";
import {RippleModule} from "primeng/ripple";
import {ConfirmationDialogComponent} from "../../common-components/confirmation-dialog/confirmation-dialog.component";

@Component({
  selector: 'app-person-management',
  standalone: true,
  imports: [CommonModule, TableModule, ToastModule, MatProgressSpinnerModule, DateperiodFinderComponent, EditPersonDialogComponent, ReactiveFormsModule, DialogModule, InputTextModule, ButtonModule, RippleModule, ConfirmationDialogComponent],
  templateUrl: './person-management.component.html',
  styleUrls: ['./person-management.component.css'],
  providers: [AppSecurityService]
})
export class PersonManagementComponent implements OnInit {
  /**Reference on dialog component for editing Person*/
  @ViewChild('personDialog') personDialog: EditPersonDialogComponent
  /**Reference on child component of data finder bei date period.*/
  @ViewChild('dataFinder', {static: false}) dataFinder: DateperiodFinderComponent
  /**Reference to child component delete person confirmation dialog. */
  @ViewChild('confirmDialog') confirmDialog: ConfirmationDialogComponent

  isPersonDialogVisible = false;
  _persons: PersonFormModel[];
  /**Contains person with changes. */
  personsChanges: PersonFormModel[];
  selectedPerson!: PersonFormModel
  keySelection: boolean = true;
  showConfirmDialog: boolean;
  confirmDialogMessage: string = 'Are you sure you want to delete the person?';



  constructor(public appSecurityService: AppSecurityService,
              private httpService: CommonServicesAppHttpService<PersonFormModel[]>) {
  }

  ngOnInit(): void {
    setTimeout(() =>{
      this.dataFinder.loadData()
    })
  }

  /**
   * Setter for output event of finder by date period component
   * @param value result of finding
   */
  set persons(value) {
    this._persons = value
  }

  get persons() {
    return this._persons
  }

  rowDoubleClick(event: MouseEvent, person: PersonFormModel) {
    setTimeout(() => {
      this.personDialog.setPerson(person)
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

  /**
   * Puts changed person
   * @param person changed person
   */
  putPersonChanges(person: PersonFormModel) {
    if(this.personsChanges === undefined) {
      this.personsChanges = []
    }
    const modelPerson = this.persons.filter(p =>p.id === person.id )?.at(0)
    const changedPerson =
      this.personsChanges.filter(p => p.id === person.id)?.at(0)
    //here I put original person to list of changes to keep original value
    if(changedPerson === undefined) {
      this.personsChanges.push(modelPerson)
    }

    this.persons.filter( (p, idx) =>{
      if(p.id === person.id) {
        this.persons[idx] =  person
        return
      }
    })
  }

  isPersonChanged(person: PersonFormModel): string {
   // console.log('Changes :'+person.id)
    let obj = this.personsChanges?.filter(p =>person.id === p.id)
    //console.log('Obj :'+obj.length)
    if( obj!==undefined && obj.length >0){
      return 'blue'
    } else {
      return '#495057'
    }
  }


  haveNoChanges() {
    return this.personsChanges == undefined || this.personsChanges.length < 1;
  }

  saveChangedPersons($event: MouseEvent) {
    const changes = this.persons.filter(p =>
      p.id ===this.personsChanges?.filter(c =>c?.id == p?.id)?.at(0)?.id)

    this.httpService.putObjectToServer('POST', changes, "person changes", 'person', callback =>{
       if(callback){
         this.personsChanges = []
       }
    })

  }

  deletePerson(id) {
    this.confirmDialog.transferObject = id
    this.showConfirmDialog = true
  }

  handleConfirmation(id: any) {
    this.httpService.putObjectToServer('DELETE',
      null, "person delete", 'person/'+id, callback =>{
        if(callback){
          console.log("DELETED :"+id)
          //this.personsChanges.
        }
      })
    this.showConfirmDialog = false
  }

  handleCancel(e: boolean) {
    if (e === true) {
      this.showConfirmDialog = false
    }
  }
}
