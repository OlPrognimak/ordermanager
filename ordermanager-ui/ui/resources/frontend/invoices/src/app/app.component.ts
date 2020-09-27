import {Component, OnInit} from '@angular/core';
import {AppSecurityService} from './app-security.service';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Router} from '@angular/router';
import {finalize} from 'rxjs/operators';
import {MessageService} from "primeng/api";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [AppSecurityService, MessageService]
})
export class AppComponent implements OnInit{
  title = 'frontend';
  credentials = {username: '', password: ''};
  backendUrl: string;

  constructor(public appSecurityService: AppSecurityService,
              private http: HttpClient, public router: Router,
              private messageService: MessageService) {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') ;
    this.appSecurityService.authenticate(this.credentials, undefined);
  }

  ngOnInit(): void {

  }

  public navigateCreateNewUser(): void{
    this.router.navigateByUrl('/user-registration-page');
  }

  /**
   * Site logout
   */
  logout(): any {
    this.http.post('logout', {}).pipe(finalize(() => {
     // this.appSecurityService.authenticated = false;
      localStorage.setItem('authenticated', 'false');
      this.credentials.username = '';
      this.credentials.password = '';
      console.log('Logout Call');
      this.router.navigateByUrl('/');

    })).subscribe();
  }

  /**
   * Login to the application
   */
  login(): any {
    console.log('Before Login Call');

    this.appSecurityService.authenticate(this.credentials, (result) => {

       console.log('Login Result :' + result);
       if (result === true) {
        this.router.navigateByUrl('/');
       }else{
        this.credentials.username = '';
        this.credentials.password = '';
        this.router.navigateByUrl('/');
        console.log('Not logged :' + result);
        this.messageService.add({severity: 'error', summary: 'Loging error',
          detail: 'Please enter correct user name and password.'});
       }
    });

  }
}
