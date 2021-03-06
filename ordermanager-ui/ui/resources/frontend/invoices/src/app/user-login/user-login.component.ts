import { Component, OnInit } from '@angular/core';
import {AppSecurityService} from './app-security.service';
import {HttpClient} from '@angular/common/http';
import {Router} from '@angular/router';
import {MessageService} from 'primeng/api';
import {finalize} from 'rxjs/operators';
import {environment} from "../../environments/environment";

@Component({
  selector: 'app-user-login',
  templateUrl: './user-login.component.html',
  styleUrls: ['./user-login.component.css']
})
export class UserLoginComponent implements OnInit {

  title = 'frontend';
  backendUrl: string;

  constructor(public appSecurityService: AppSecurityService,
              private http: HttpClient, public router: Router,
              private messageService: MessageService) {
    this.backendUrl = environment.baseUrl;
    this.appSecurityService.authenticate(appSecurityService.credentials, undefined);
  }

  ngOnInit(): void {

  }

  public navigateCreateNewUser(): void{
    this.router.navigateByUrl('/user-registration-page');
  }

  /**
   * Login to the application
   */
  login(): any {
    console.log('Before Login Call');

    this.appSecurityService.authenticate(this.appSecurityService.credentials, (result) => {

      console.log('Login Result :' + result);
      if (result === true) {
        this.router.navigateByUrl('/');
      }else{
        this.appSecurityService.credentials.username = '';
        this.appSecurityService.credentials.password = '';
        this.router.navigateByUrl('/');
        console.log('Not logged :' + result);
        this.messageService.add({severity: 'error', summary: 'Loging error',
          detail: 'Please enter correct user name and password.'});
      }
    });

  }

}
