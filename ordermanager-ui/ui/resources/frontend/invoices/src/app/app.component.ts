import {Component, OnInit, ViewChild} from '@angular/core';
import {AppSecurityService} from './user/user-login/app-security.service';
import {Router} from "@angular/router";
import {MenuItem} from "primeng/api";
import {Menu} from "primeng/menu";
import {isAuthenticated} from "./common-services/common-services-util.service";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [AppSecurityService]
})

export class AppComponent implements OnInit{
  title = 'frontend';
  menuItems: MenuItem[];
   @ViewChild('bigMenu') bigMenu: Menu;
   @ViewChild('smallMenu') smallMenu: Menu;

  constructor(public appSecurityService: AppSecurityService, public router: Router) {

  }

  ngOnInit(): void {
      this.menuItems = [
        {
          label: 'User management',
          icon: 'pi pi-fw pi-users',
          items: [
            {label: 'Create user', icon: 'pi pi-fw pi-user-plus', routerLink: '/user-registration-page'}
            ]
        },
        {
          label: 'Invoice',
          icon: 'pi pi-fw pi-book',
          items: [
            {label: 'Create invoice', icon: 'pi pi-fw pi-plus', routerLink: '/create-invoice-page'},
            {label: 'Create catalog item', icon: 'pi pi-fw pi-plus', routerLink: '/create-invoice-item-page'},
            {label: 'Manage catalog items', icon: 'pi pi-fw pi-pencil', routerLink: '/catalog-item-management-page'},
            {label: 'Invoice management', icon: 'pi pi-fw pi-pencil',  routerLink: '/invoice-management_page'},
            {label: 'Print invoice', icon: 'pi pi-fw pi-file-pdf', routerLink: '/invoice-list_page'}
          ]
        },
        {
          label: 'Person',
          icon: 'pi pi-fw pi-user',
          items: [
            {label: 'Create Peron', icon: 'pi pi-fw pi-plus', routerLink: '/create-person_page'},
            {label: 'Person management', icon: 'pi pi-fw pi-pencil',  routerLink: '/person-management-page'}
          ]
        },
        {
          label: 'Workflows',
          icon: 'pi pi-fw pi-book',
          items: [
            {label: 'Create invoice', icon: 'pi pi-fw pi-plus', routerLink: '/workflow-create-invoice'},
          ]
        },
        {
          label: 'Logout',
          icon: 'pi pi-fw pi-sign-out',
          command: () => this.appSecurityService.logout()
        }
      ];




  }

  protected readonly isAuthenticated = isAuthenticated;
}
