import {Component, OnInit} from '@angular/core';
import {ItemCatalogModel} from '../domain/domain.invoiceformmodel';
import {AppSecurityService} from '../user-login/app-security.service';
import {CommonServicesAppHttpService} from '../common-services/common-services.app.http.service';
import {environment} from '../../environments/environment';
import {MessageService} from "primeng/api";
import {CommonServicesUtilService} from "../common-services/common-services-util.service";

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
              private httpService: CommonServicesAppHttpService<ItemCatalogModel>,
              private messageService: MessageService,
              private utilService: CommonServicesUtilService) { }

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
      'invoice/itemcatalog', this.messageService, this.utilService, (callback) => {
       if (callback){
         this.model = new ItemCatalogModel();
       }
    });
  }
}
