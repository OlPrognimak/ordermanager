import {AfterViewInit, Component, OnDestroy, OnInit, ViewChild} from '@angular/core';
import { AppSecurityService } from './common-auth/app-security.service';
import { Router } from "@angular/router";
import { MenuItem } from "primeng/api";
import { Menu } from "primeng/menu";
import {isAuthenticated, printToJson} from "./common-services/common-services-util.service";
import {TranslocoService} from "@jsverse/transloco";
import {Subject, takeUntil} from "rxjs";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [AppSecurityService]
})

export class AppComponent implements OnInit, AfterViewInit, OnDestroy {
  title = 'frontend';
  menuItems: MenuItem[];
  @ViewChild('bigMenu') bigMenu: Menu;
  @ViewChild('smallMenu') smallMenu: Menu;
  protected readonly isAuthenticated = isAuthenticated;
  notLoaded: boolean = true;
  private readonly destroy$ = new Subject<void>();

  constructor(public appSecurityService: AppSecurityService, public router: Router, private translocoService: TranslocoService) {
  }

  ngOnInit() {
    this.translocoService.selectTranslation()
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => this.buildMenuItems());
  }

  buildMenuItems(): void {
    this.menuItems = [
      {
        label: this.translocoService.translate('menu.user_management'),
        icon: 'pi pi-fw pi-users',
        items: [
          {label: this.translocoService.translate('menu.create_user'), icon: 'pi pi-fw pi-user-plus', routerLink: '/user-registration-page'}
        ]
      },
      {
        label: this.translocoService.translate('menu.invoice.title'),
        icon: 'pi pi-fw pi-book',
        items: [
          {label: this.translocoService.translate('menu.invoice.create'), icon: 'pi pi-fw pi-plus', routerLink: '/create-invoice-page'},
          {label: this.translocoService.translate('menu.invoice.create_catalog_item'), icon: 'pi pi-fw pi-plus', routerLink: '/create-invoice-item-page'},
          {label: this.translocoService.translate('menu.invoice.manage_catalog_items'), icon: 'pi pi-fw pi-pencil', routerLink: '/catalog-item-management-page'},
          {label: this.translocoService.translate('menu.invoice.management'), icon: 'pi pi-fw pi-pencil', routerLink: '/invoice-management_page'},
          {label: this.translocoService.translate('menu.invoice.print'), icon: 'pi pi-fw pi-file-pdf', routerLink: '/invoice-list_page'}
        ]
      },
      {
        label: this.translocoService.translate('menu.person.title'),
        icon: 'pi pi-fw pi-user',
        items: [
          {label: this.translocoService.translate('menu.person.create'), icon: 'pi pi-fw pi-plus', routerLink: '/create-person_page'},
          {label: this.translocoService.translate('menu.person.management'), icon: 'pi pi-fw pi-pencil', routerLink: '/person-management-page'}
        ]
      },
      {
        label: this.translocoService.translate('menu.workflows.title'),
        icon: 'pi pi-fw pi-book',
        items: [
          {label: this.translocoService.translate('menu.workflows.create_invoice'), icon: 'pi pi-fw pi-plus', routerLink: '/workflow-create-invoice'},
        ]
      },
      {
        label: this.translocoService.translate('menu.logout'),
        icon: 'pi pi-fw pi-sign-out',
        command: () => this.appSecurityService.logout()
      }
    ];


  }

  ngAfterViewInit(): void {
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
