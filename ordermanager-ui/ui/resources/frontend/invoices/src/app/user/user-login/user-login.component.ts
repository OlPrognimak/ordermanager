import { Component, NgModule } from '@angular/core';
import { AppSecurityService } from '../../common-auth/app-security.service';
import { HttpClient } from '@angular/common/http';
import { Router, RouterModule } from '@angular/router';
import { MessageService } from 'primeng/api';
import { TranslocoModule, TranslocoService } from "@jsverse/transloco";
import { FormsModule, NgForm } from "@angular/forms";
import { CommonModule } from "@angular/common";
import { ButtonModule } from "primeng/button";
import { MessagesModule } from "primeng/messages";
import { MessageModule } from "primeng/message";
import { ToastModule } from "primeng/toast";
import {
  ValidatableInputTextComponent
} from "../../common-components/validatable-input-text/validatable-input-text.component";


@Component({
    selector: 'app-user-login',
    templateUrl: './user-login.component.html',
    styleUrls: ['./user-login.component.css'],
    providers: [MessageService, AppSecurityService, HttpClient],
    standalone: false
})
export class UserLoginComponent {
  isSubmitting = false;

  constructor(public appSecurityService: AppSecurityService,
              public router: Router,
              private messageService: MessageService,
              private translocoService: TranslocoService) {}

  /**
   * Login to the application
   */
  login(loginForm: NgForm): any {
    this.isSubmitting = true;
    this.appSecurityService.authenticate(this.appSecurityService, this.appSecurityService.credentials,
      (result) => {
        this.isSubmitting = false;
        if (result === true) {
          this.router.navigateByUrl('/');
        } else {
          this.appSecurityService.clearCredentials()
          loginForm.resetForm()
          this.messageService.add({
            severity: 'error',
            summary: this.translocoService.translate('auth.login.error.summary'),
            detail: this.translocoService.translate('auth.login.error.invalid_credentials')
          });
        }
      });
  }
}


@NgModule(
  {
    imports: [CommonModule, FormsModule, ButtonModule, MessagesModule,
      MessageModule, ToastModule, RouterModule, ValidatableInputTextComponent, TranslocoModule],
    declarations: [UserLoginComponent],
    exports: [UserLoginComponent]
  }
)
export class UserLoginModule {

}
