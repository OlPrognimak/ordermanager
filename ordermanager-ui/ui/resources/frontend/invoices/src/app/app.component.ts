import {Component, OnInit} from '@angular/core';
import {AppSecurityService} from './app-security.service';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import {Router} from '@angular/router';
import {finalize} from 'rxjs/operators';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [AppSecurityService]
})
export class AppComponent implements OnInit{
  title = 'frontend';
  credentials = {username: '', password: ''};
  backendUrl: string;

  constructor(public appSecurityService: AppSecurityService,
              private http: HttpClient, private router: Router) {
    this.backendUrl =
      document.getElementById('appConfigId')
        .getAttribute('data-backendUrl') ;
    this.appSecurityService.authenticate(this.credentials, undefined);
  }

  ngOnInit(): void {

  }

  /**
   * Site logout
   */
  logout(): any {
    this.http.post('logout', {}).pipe(finalize(() => {
      this.appSecurityService.authenticated = false;
      console.log('Logout Call');
      // this.router.navigateByUrl(this.backendUrl + '/login');
      this.router.navigateByUrl('/');

    })).subscribe();
  }

  login(): any {
    console.log('Before Login Call');

    this.appSecurityService.authenticate(this.credentials, (result) => {
      console.log('Login Result :' + result);
      // this.router.navigateByUrl(this.backendUrl + '/login');
      if (result === true) {
        this.appSecurityService.authenticated = true;
        this.router.navigateByUrl('/');
        console.log('Is logedd');
        return true;
      }else{
        this.appSecurityService.authenticated = true;
        console.log('Login Call');
        const headers =  new HttpHeaders();
        this.appSecurityService.authenticated = false;
        this.router.navigateByUrl('/');
        return true;
       // headers.set('Authorization', 'Basic ' + btoa(credentials.username + ':' + credentials.password));
       // this.http.post(this.backendUrl,)
      }

      return false;
    });

  }
}
