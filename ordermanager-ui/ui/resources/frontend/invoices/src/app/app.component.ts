import { Component, OnDestroy, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { Subject, takeUntil } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { AppSecurityService } from './common-auth/app-security.service';
import { isAuthenticated } from './common-services/common-services-util.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [AppSecurityService]
})
export class AppComponent implements OnInit, OnDestroy {
  title = 'frontend';
  menuItems: MenuItem[] = [];
  protected readonly isAuthenticated = isAuthenticated;
  private readonly destroy$ = new Subject<void>();

  constructor(
    public appSecurityService: AppSecurityService,
    public router: Router,
    private translocoService: TranslocoService
  ) {}

  ngOnInit(): void {
    this.translocoService.selectTranslation()/*.langChanges$*/
      .pipe(takeUntil(this.destroy$))
      .subscribe(() => {
        this.buildMenuItems();
      });

    //this.buildMenuItems();
  }

  private buildMenuItems(): void {
    this.menuItems = [
      {
        label: this.t('menu.user_management'),
        icon: 'pi pi-users',
        items: [
          {
            label: this.t('menu.create_user'),
            icon: 'pi pi-user-plus',
            routerLink: '/user-registration-page'
          }
        ]
      },
      {
        label: this.t('menu.invoice.title'),
        icon: 'pi pi-file',
        items: [
          {
            label: this.t('menu.invoice.create'),
            icon: 'pi pi-plus',
            routerLink: '/create-invoice-page'
          },
          {
            label: this.t('menu.invoice.create_catalog_item'),
            icon: 'pi pi-box',
            routerLink: '/create-invoice-item-page'
          },
          {
            label: this.t('menu.invoice.manage_catalog_items'),
            icon: 'pi pi-pencil',
            routerLink: '/catalog-item-management-page'
          },
          {
            label: this.t('menu.invoice.management'),
            icon: 'pi pi-briefcase',
            routerLink: '/invoice-management-page'
          },
          {
            label: this.t('menu.invoice.print'),
            icon: 'pi pi-file-pdf',
            routerLink: '/invoice-list-page'
          }
        ]
      },
      {
        label: this.t('menu.person.title'),
        icon: 'pi pi-user',
        items: [
          {
            label: this.t('menu.person.create'),
            icon: 'pi pi-plus',
            routerLink: '/create-person-page'
          },
          {
            label: this.t('menu.person.management'),
            icon: 'pi pi-id-card',
            routerLink: '/person-management-page'
          }
        ]
      },
      {
        label: this.t('menu.workflows.title'),
        icon: 'pi pi-sitemap',
        items: [
          {
            label: this.t('menu.workflows.create_invoice'),
            icon: 'pi pi-play',
            routerLink: '/workflow-create-invoice'
          }
        ]
      },
     {
        label: this.getCurrentLanguageLabel(),
        icon: 'pi pi-globe',
        items: [
          {
            label: '🇬🇧 English'
          ,
            command: () => this.switchLang('en')
          },
          {
            label: '🇩🇪 Deutsch',
            command: () => this.switchLang('de')
          }
        ]
      },
      {
        label: this.t('menu.logout'),
        icon: 'pi pi-sign-out',
        command: () => this.appSecurityService.logout()
      }
    ];
  }

  getCurrentLanguageLabel(): string {
    const lang = this.translocoService.getActiveLang();
    return lang === 'de' ? '🇩🇪 DE' : '🇬🇧 EN';
  }

  switchLang(lang: 'en' | 'de'): void {
    this.translocoService.setActiveLang(lang);
  }

  private t(key: string): string {
    return this.translocoService.translate(key);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
