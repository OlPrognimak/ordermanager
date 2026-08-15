import { Component, OnInit, viewChild } from '@angular/core';
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
import { HttpClient } from "@angular/common/http";
import {
  ValidatableInputTextComponent
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {FloatLabel} from "primeng/floatlabel";
import {TranslocoPipe} from "@jsverse/transloco";

@Component({
  selector: 'app-items-form',
  templateUrl: './items-form.component.html',
  styleUrls: ['./items-form.component.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, MessageModule, MessagesModule, ToastModule, InputTextModule, InputNumberModule, ButtonModule, ValidatableInputNumberModule, ValidatableInputTextComponent, FloatLabel, TranslocoPipe],
  providers: [AppSecurityService, CommonServicesAppHttpService<ItemCatalogModel>, HttpClient]
})
export class ItemsFormComponent implements OnInit {

  itemCatalogForm = viewChild.required<NgForm>('itemCatalogForm')

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


  get grossPrice(): number {
    const price = Number(this.model?.itemPrice ?? 0);
    const vat = Number(this.model?.vat ?? 0);
    return Number((price + (price * vat / 100)).toFixed(2));
  }
  /**
   * Saves item to the database on server
   * @param item the item for saving
   */
  saveItem(): void {
    if (!this.haveErrors()) {
      this.httpService.putObjectToServer('PUT', this.model, 'Invoice Item',
        'invoice/itemcatalog', (callback) => {
          if (callback) {
            this.model = new ItemCatalogModel();
            this.itemCatalogForm().resetForm(this.model);
          }
        });
    }
  }

  haveErrors(): boolean {
    const nameIsInvalid = !this.model?.description || this.model.description.trim().length < 2;
    const priceIsInvalid = this.model?.itemPrice === undefined || this.model.itemPrice === null || this.model.itemPrice < 0;
    const vatIsInvalid = this.model?.vat === undefined || this.model.vat === null || this.model.vat < 0;

    return nameIsInvalid || priceIsInvalid || vatIsInvalid ||
      this.hasNameError === true || this.hasPriceError === true || this.hasVatError === true;
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
