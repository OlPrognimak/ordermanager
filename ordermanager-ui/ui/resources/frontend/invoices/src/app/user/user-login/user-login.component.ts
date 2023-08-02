import {Component, NgModule, OnInit,} from '@angular/core';
import {AppSecurityService} from './app-security.service';
import {HttpClient} from '@angular/common/http';
import {Router, RouterModule} from '@angular/router';
import {MessageService} from 'primeng/api';
import {environment} from '../../../environments/environment';
import {Observable, of} from "rxjs";
import {FormsModule, NgForm} from "@angular/forms";
import {CommonModule} from "@angular/common";
import {ButtonModule} from "primeng/button";
import {
  ValidatableInputTextModule
} from "../../common-components/validatable-input-text/validatable-input-text.component";
import {MessagesModule} from "primeng/messages";
import {MessageModule} from "primeng/message";
import {ToastModule} from "primeng/toast";

@Component({
  selector: 'app-user-login',
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.css'],
  providers: [MessageService, AppSecurityService, HttpClient]
})
export class UserLoginComponent implements OnInit {

  title = 'frontend';

  backendUrl: string;
  observableMsgService: Observable<MessageService>;

  constructor(public appSecurityService: AppSecurityService,
              private http: HttpClient, public router: Router,
              private messageService: MessageService) {
    this.backendUrl = environment.baseUrl;
    this.observableMsgService = of(messageService);
  }

  ngOnInit(): void {

  }

  public navigateCreateNewUser(): void{
    this.router.navigateByUrl('/user-registration-page');
  }

  /**
   * Login to the application
   */
  login(loginForm:NgForm): any {
    console.log('Before Login Call'+JSON.stringify(loginForm.value));

    this.appSecurityService.authenticate(this.appSecurityService, this.appSecurityService.credentials, (result) => {

      console.log('Login Result :' + result);
      if (result === true) {
        this.router.navigateByUrl('/');
      }else{
        this.appSecurityService.credentials.username = '';
        this.appSecurityService.credentials.password = '';
        this.appSecurityService.clearCredentials()
        loginForm.resetForm()
        console.log('Not logged :' + result);
        this.observableMsgService.subscribe(m =>{
          m.add({severity: 'error', summary: 'Loging error',
            detail: 'Please enter correct user name and password.'});
        })

      }
    });
  }
}


@NgModule(
  {
    imports: [CommonModule, FormsModule, ButtonModule, ValidatableInputTextModule, MessagesModule,
      MessageModule, ToastModule, RouterModule],
    declarations: [UserLoginComponent],
    exports: [UserLoginComponent]
  }
)
export class UserLoginModule{

}
