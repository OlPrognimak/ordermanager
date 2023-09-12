import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import {SharedModule} from "primeng/api";
import {TableModule} from "primeng/table";
import {ToastModule} from "primeng/toast";
import {InvoiceItemModel, ItemCatalogModel} from "../../domain/domain.invoiceformmodel";
import {InvoicePipesModule} from "../../common-services/common-services.pipes.number";
import {ButtonModule} from "primeng/button";
import {RippleModule} from "primeng/ripple";

@Component({
  selector: 'app-item-management',
  standalone: true,
  imports: [CommonModule, SharedModule, TableModule, ToastModule, InvoicePipesModule, ButtonModule, RippleModule],
  templateUrl: './item-management.component.html',
  styleUrls: ['./item-management.component.css']
})
export class ItemManagementComponent {
  invoiceItems: ItemCatalogModel[]

  isInvoiceChanged(invoiceitem: ItemCatalogModel) {

  }

  rowDoubleClick($event: MouseEvent, invoiceitem: ItemCatalogModel) {

  }

  showDeleteItemDialog(id: number) {

  }
}
