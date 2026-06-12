import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';
import { isAuthenticated } from '../common-services/common-services-util.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, TranslocoModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.css'
})
export class HomeComponent {
  protected readonly isAuthenticated = isAuthenticated;
}
