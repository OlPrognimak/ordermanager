import { Component, OnInit } from '@angular/core';
import {ItemCatalogModel} from '../domain/domain.invoiceformmodel';
import {AppSecurityService} from '../user-login/app-security.service';
import {CommonServicesAppHttpService} from '../common-services/common-services.app.http.service';
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-items-form',
  templateUrl: './items-form.component.html',
  styleUrls: ['./items-form.component.css'],
  providers: []
})
export class ItemsFormComponent implements OnInit {

  model: ItemCatalogModel;
  backendUrl: string;

  constructor(public appSecurityService: AppSecurityService,
              private httpService: CommonServicesAppHttpService<ItemCatalogModel>) { }

  ngOnInit(): void {
    this.model = new ItemCatalogModel();
    this.backendUrl = environment.baseUrl;
  }

  /**
   * Saves item to the database on server
   * @param item the item for saving
   */
  saveItem(item: any): void {
    this.httpService.putObjectToServer(this.model, 'Invoice Item',
      'invoice/itemcatalog', (callback) => {
       if (callback){
         this.model = new ItemCatalogModel();
       }
    });
  }
}
