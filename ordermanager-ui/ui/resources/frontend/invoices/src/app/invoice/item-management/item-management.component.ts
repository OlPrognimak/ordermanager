import { Component, OnInit, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MessageService, SharedModule } from "primeng/api";
import { TableModule } from "primeng/table";
import { ToastModule } from "primeng/toast";
import { ItemCatalogModel } from "../../domain/domain.invoiceformmodel";
import { InvoicePipesModule } from "../../common-services/common-services.pipes.number";
import { ButtonModule } from "primeng/button";
import { RippleModule } from "primeng/ripple";
import { HttpClient } from "@angular/common/http";
import { CommonServicesAppHttpService, MessagesPrinter } from "../../common-services/common-services.app.http.service";
import { isAuthenticated } from "../../common-services/common-services-util.service";
import { ConfirmationDialogComponent } from "../../common-components/confirmation-dialog/confirmation-dialog.component";
import { EditPersonDialogComponent } from "../../person/edit-person-dialog/edit-person-dialog.component";
import { EditItemDialogComponent } from "../edit-item-dialog/edit-item-dialog.component";
import { CommonServicesEditService } from "../../common-services/common-services.edit.service";
import { InputTextModule } from "primeng/inputtext";
import { PaginatorModule } from "primeng/paginator";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";

@Component({
  selector: 'app-item-management',
  standalone: true,
  imports: [CommonModule, SharedModule, TableModule, ToastModule, InvoicePipesModule, ButtonModule, RippleModule, ConfirmationDialogComponent, EditPersonDialogComponent, EditItemDialogComponent, InputTextModule, PaginatorModule, MatProgressSpinnerModule],
  providers: [HttpClient, MessagesPrinter, MessageService],
  templateUrl: './item-management.component.html',
  styleUrls: ['./item-management.component.css']
})
export class ItemManagementComponent extends CommonServicesEditService<ItemCatalogModel> implements OnInit {

  @ViewChild('confirmUpdateDialog') confirmUpdateDialog: ConfirmationDialogComponent
  @ViewChild('confirmDeleteDialog') confirmDeleteDialog: ConfirmationDialogComponent
  @ViewChild('itemEditCatalogDialog') itemCatalogDialog: EditItemDialogComponent

  criteria: string = ''
  showConfirmUpdateDialog: boolean;
  showConfirmDeleteDialog: boolean;
  personsChanges: ItemCatalogModel[];
  selectedItem!: ItemCatalogModel
  keySelection: boolean = true;
  confirmUpdateDialogMessage: string = 'Are you sure you want to save changes permanently?';
  confirmDeleteDialogMessage: string = 'Are you sure you want to delete the catalog item?';
  dataLoading: boolean = false
  protected readonly isAuthenticated = isAuthenticated;

  constructor(private messagePrinter: MessagesPrinter,
              private httpService: CommonServicesAppHttpService<ItemCatalogModel[]>) {
    super(httpService.httpClient, 'Can not load items catalog by criteria: ', 'invoice/itemsCatalogList')
  }

  ngOnInit(): void {

    this.getDataFromServer(null)
  }

  getDataFromServer(criteriaPar) {
    this.dataLoading = true
    this.loadData(criteriaPar, this.messagePrinter, callback => {
      if (callback !== null) {
        this.modelList = callback
        this.dataLoading = false
      }
    })
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
    this.httpService.putObjectToServer("POST", transferObject, "item catalog", "invoice/itemcatalog", callback => {
      if (callback) {
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
    const modelItem = this.modelList.filter(i => i.id === item.id)?.at(0)
    //step 2: search item in list of item changes
    const changedItems =
      this.changesList.filter(i => i.id === item.id)?.at(0)
    //step 3: here I put original item to the list of changes to keep original value. The original object can be returned back
    if (changedItems === undefined && modelItem !== undefined) {
      this.changesList.push(modelItem)
    }
    //step 4: Put changed object to model list
    this.modelList.filter((i, idx) => {
      if (i.id === item.id) {
        this.modelList[idx] = item
        return
      }
    })
  }


  haveNoChanges() {
    return !(this.changesList?.length > 0)
  }

  saveChangesOnServer($event: MouseEvent) {
    const changes = this.modelList.filter(p =>
      p.id === this.changesList?.filter(c => c?.id == p?.id)?.at(0)?.id)
    this.confirmUpdateDialog.transferObject = changes
    this.showConfirmUpdateDialog = true
  }

  handleDeleteConfirmation(id: number) {
    this.httpService.putObjectToServer('DELETE',
      null, "item catalog delete", 'invoice/itemcatalog/' + id, callback => {
        if (callback) {
          console.log("DELETED :" + id)
          this.modelList = this.modelList.filter(i => i.id !== id)
        }
      })
    this.showConfirmUpdateDialog = false
  }
}
