import {Component, OnInit} from '@angular/core';
import {AppSecurityService} from './user-login/app-security.service';
import {Router} from "@angular/router";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  providers: [AppSecurityService]
})
export class AppComponent implements OnInit{
  title = 'frontend';
  constructor(public appSecurityService: AppSecurityService, public router: Router) {

  }

  ngOnInit(): void {

  }


}
