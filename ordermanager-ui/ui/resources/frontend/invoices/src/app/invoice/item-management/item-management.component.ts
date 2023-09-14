import {Component, OnInit, ViewChild} from '@angular/core';
import { CommonModule } from '@angular/common';
import {SharedModule} from "primeng/api";
import {TableModule} from "primeng/table";
import {ToastModule} from "primeng/toast";
import {ItemCatalogModel} from "../../domain/domain.invoiceformmodel";
import {InvoicePipesModule} from "../../common-services/common-services.pipes.number";
import {ButtonModule} from "primeng/button";
import {RippleModule} from "primeng/ripple";
import {HttpClient, HttpHeaders, HttpParams} from "@angular/common/http";
import {remoteBackendUrl} from "../../user/user-login/app-security.service";
import {CommonServicesAppHttpService, MessagesPrinter} from "../../common-services/common-services.app.http.service";
import {isAuthenticated} from "../../common-services/common-services-util.service";
import {ConfirmationDialogComponent} from "../../common-components/confirmation-dialog/confirmation-dialog.component";
import {EditPersonDialogComponent} from "../../person/edit-person-dialog/edit-person-dialog.component";
import {EditItemDialogComponent} from "../edit-item-dialog/edit-item-dialog.component";
import {CommonServicesEditService} from "../../common-services/common-services.edit.service";
import {InputTextModule} from "primeng/inputtext";
import {PaginatorModule} from "primeng/paginator";

@Component({
  selector: 'app-item-management',
  standalone: true,
  imports: [CommonModule, SharedModule, TableModule, ToastModule, InvoicePipesModule, ButtonModule, RippleModule, ConfirmationDialogComponent, EditPersonDialogComponent, EditItemDialogComponent, InputTextModule, PaginatorModule],
  providers: [HttpClient, MessagesPrinter],
  templateUrl: './item-management.component.html',
  styleUrls: ['./item-management.component.css']
})
export class ItemManagementComponent extends CommonServicesEditService<ItemCatalogModel>  implements OnInit{

  @ViewChild('confirmUpdateDialog') confirmUpdateDialog: ConfirmationDialogComponent
  @ViewChild('confirmDeleteDialog') confirmDeleteDialog: ConfirmationDialogComponent
  @ViewChild('itemEditCatalogDialog') itemCatalogDialog: EditItemDialogComponent

  criteria: string = ''
  protected readonly isAuthenticated = isAuthenticated;
  showConfirmUpdateDialog: boolean;
  showConfirmDeleteDialog: boolean;
  personsChanges: ItemCatalogModel[];
  selectedItem!: ItemCatalogModel
  keySelection: boolean = true;
  confirmUpdateDialogMessage: string = 'Are you sure you want to save changes permanently?';
  confirmDeleteDialogMessage: string = 'Are you sure you want to delete the catalog item?';

  constructor(private httpClient: HttpClient, private messagePrinter: MessagesPrinter,
              private  httpService: CommonServicesAppHttpService<ItemCatalogModel[]>) {
    super()
  }
  ngOnInit(): void {
    this.getDataFromServer(null)
  }

  getDataFromServer(criteriaPar) {
    this.loadData(criteriaPar, this.modelList, this.messagePrinter, callback => {
      if(callback !== null) {
        this.modelList = callback
      }
    })
  }

  loadData = (criteria: string, invoiceItemsPar: ItemCatalogModel[], messagePrinterPar: MessagesPrinter, callback) => {

    const rsHeaders = new HttpHeaders({
      'Content-Type' : 'application/json',
      Accept : '*/*'
    } );
    let requestCriteria: string = ''
    if (criteria !== null && criteria !== undefined) {
      requestCriteria = criteria
    }
    let httpParams = new HttpParams().set('criteria', requestCriteria)

    const options = {
      headers: rsHeaders,
      params: httpParams,
    }
    this.httpClient.get<ItemCatalogModel[]>(remoteBackendUrl()+"invoice/itemsCatalogList",options).subscribe(
      {
        next(response) {
          return callback(response)
        },
        error (err) {
          messagePrinterPar.printUnsuccessefulMessage(
            'Can not load items catalog by criteria: '+criteria, err)
        }
      }
    )
  }

  isEditObjectChanged(item: ItemCatalogModel) {
    let obj = this.changesList?.filter(v =>item.id === v.id)
    if( obj!==undefined && obj.length >0){
      return 'blue'
    } else {
      return '#495057'
    }
  }

  rowDoubleClick($event: MouseEvent, invoiceitem: ItemCatalogModel) {
      this.itemCatalogDialog.setEditingObject(invoiceitem)
      this.itemCatalogDialog.setDialogVisible(true)
  }

  showDeleteItemDialog(id: number) {
    this.confirmDeleteDialog.transferObject = id
    this.showConfirmDeleteDialog = true
  }

  handleUpdateConfirmation(transferObject: ItemCatalogModel[]) {
      this.httpService.putObjectToServer("POST", transferObject, "item catalog", "invoice/itemcatalog",callback => {
        if(callback) {
          console.log("Item catalogs successfully updated.")
          this.changesList = []
        }
      })
  }

  handleCancelDelete() {
    this.showConfirmDeleteDialog = false;
  }

  handleCancelUpdate() {
    this.showConfirmUpdateDialog = false
  }

  putEditDialogChanges(item: ItemCatalogModel) {
    //step 1: search item model list
    const modelItem = this.modelList.filter(i =>i.id === item.id )?.at(0)
    //step 2: search item in list of item changes
    const changedItems =
      this.changesList.filter(i => i.id === item.id)?.at(0)
    //step 3: here I put original item to the list of changes to keep original value. The original object can be returned back
    if(changedItems === undefined) {
      this.changesList.push(modelItem)
    }
    //step 4: Put changed object to model list
    this.modelList.filter((i, idx) =>{
      if(i.id === item.id) {
        this.modelList[idx] =  item
        return
      }
    })
  }


  haveNoChanges() {
    return !(this.changesList?.length > 0)
  }

  saveChangesOnServer($event: MouseEvent) {
    const changes = this.modelList.filter(p =>
      p.id ===this.changesList?.filter(c =>c?.id == p?.id)?.at(0)?.id)
    this.confirmUpdateDialog.transferObject = changes
    this.showConfirmUpdateDialog = true
  }

  handleDeleteConfirmation(id: number) {
    this.httpService.putObjectToServer('DELETE',
      null, "item catalog delete", 'invoice/itemcatalog/'+id, callback =>{
        if(callback){
          console.log("DELETED :"+id)
          this.modelList = this.modelList.filter(i => i.id !== id)
        }
      })
    this.showConfirmUpdateDialog = false
  }
}