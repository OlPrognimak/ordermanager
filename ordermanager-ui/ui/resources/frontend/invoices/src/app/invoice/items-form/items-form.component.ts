import { Component, OnInit, ViewChild } from '@angular/core';
import { ItemCatalogModel } from '../../domain/domain.invoiceformmodel';
import { AppSecurityService } from '../../common-auth/app-security.service';
import { CommonServicesAppHttpService } from '../../common-services/common-services.app.http.service';
import { isAuthenticated } from "../../common-services/common-services-util.service";
import { FormsModule, NgForm } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { MessageModule } from "primeng/message";
import { MessagesModule } from "primeng/messages";
import { ToastModule } from "primeng/toast";
import { InputTextModule } from "primeng/inputtext";
import { InputNumberModule } from "primeng/inputnumber";
import { ButtonModule } from "primeng/button";
import {
  ValidatableInputNumberModule
} from "../../common-components/validatable-input-number/validatable-input-number.component";
import {
  ValidatableInputTextModule
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import { HttpClient } from "@angular/common/http";

@Component({
  selector: 'app-items-form',
  templateUrl: './items-form.component.html',
  styleUrls: ['./items-form.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModule, MessagesModule, ToastModule, InputTextModule, InputNumberModule, ButtonModule, ValidatableInputNumberModule, ValidatableInputTextModule],
  providers: [AppSecurityService, CommonServicesAppHttpService<ItemCatalogModel>, HttpClient]
})
export class ItemsFormComponent implements OnInit {

  @ViewChild('itemCatalogForm') itemCatalogForm: NgForm

  model: ItemCatalogModel;
  protected readonly isAuthenticated = isAuthenticated;
  private hasNameError: boolean;
  private hasPriceError: boolean;
  private hasVatError: boolean;

  constructor(public appSecurityService: AppSecurityService,
              private httpService: CommonServicesAppHttpService<ItemCatalogModel>) {
  }

  ngOnInit(): void {
    this.model = new ItemCatalogModel();
  }

  /**
   * Saves item to the database on server
   * @param item the item for saving
   */
  saveItem(item: any): void {
    if (!this.haveErrors()) {
      this.httpService.putObjectToServer('PUT', this.model, 'Invoice Item',
        'invoice/itemcatalog', (callback) => {
          if (callback) {
            this.model = new ItemCatalogModel();
          }
        });
    }
  }

  haveErrors() {
    return this.hasNameError || this.hasPriceError || this.hasVatError
  }

  setHasVatError(isError: boolean) {
    this.hasVatError = isError
  }

  setHasPriceError(isError: boolean) {
    this.hasPriceError = isError
  }

  setHasNameError(isError: boolean) {
    this.hasNameError = isError
  }
}
