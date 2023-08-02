import {Component, OnInit, ViewChild} from '@angular/core';
import {AppSecurityService} from './user/user-login/app-security.service';
import {Router} from "@angular/router";
import {MenuItem} from "primeng/api";
import {Menu} from "primeng/menu";

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
          items: [
            {label: 'Create user', icon: 'pi pi-fw pi-user-plus', routerLink: '/user-registration-page'}
            ]
        },
        {
          label: 'Invoice',
          icon: 'pi pi-fw',
          items: [
            {label: 'Create invoice', icon: 'pi pi-fw pi-plus', routerLink: '/create-invoice-page'},
            {label: 'Create invoice item', icon: 'pi pi-fw pi-plus', routerLink: '/create-invoice-item-page'},
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
        }
      ];

  }
}
