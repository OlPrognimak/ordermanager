import {Component, OnInit} from '@angular/core';
import {ItemCatalogModel} from '../../domain/domain.invoiceformmodel';
import {AppSecurityService} from '../../user/user-login/app-security.service';
import {CommonServicesAppHttpService} from '../../common-services/common-services.app.http.service';
import {isAuthenticated} from "../../common-services/common-services-util.service";

@Component({
  selector: 'app-items-form',
  templateUrl: './items-form.component.html',
  styleUrls: ['./items-form.component.css'],
  providers: [AppSecurityService, CommonServicesAppHttpService<ItemCatalogModel>]
})
export class ItemsFormComponent implements OnInit {

  model: ItemCatalogModel;

  constructor(public appSecurityService: AppSecurityService,
              private httpService: CommonServicesAppHttpService<ItemCatalogModel>) { }

  ngOnInit(): void {
    this.model = new ItemCatalogModel();
  }

  /**
   * Saves item to the database on server
   * @param item the item for saving
   */
  saveItem(item: any): void {
   this.httpService.putObjectToServer('PUT', this.model, 'Invoice Item',
      'invoice/itemcatalog', (callback) => {
       if (callback){
         this.model = new ItemCatalogModel();
       }
    });
  }

  protected readonly isAuthenticated = isAuthenticated;
}
