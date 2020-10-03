import {Component, OnInit} from '@angular/core';
import {AppSecurityService} from './user-login/app-security.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [AppSecurityService]
})
export class AppComponent implements OnInit{
  title = 'frontend';
  constructor(public appSecurityService: AppSecurityService) {

  }

  ngOnInit(): void {

  }


}
