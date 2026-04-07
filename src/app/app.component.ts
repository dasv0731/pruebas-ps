import { Component, OnInit } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AmplifyAuthenticatorModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  isPublicRoute = false;

  constructor(
    public authenticator: AuthenticatorService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.router.events
      .pipe(filter((event) => event instanceof NavigationEnd))
      .subscribe((event: any) => {
        this.isPublicRoute = event.url.startsWith('/evaluate');
      });

    // Check initial route
    this.isPublicRoute = window.location.pathname.startsWith('/evaluate');

    if (!this.isPublicRoute) {
      this.authService.checkAuth();
    }
  }

  async onSignOut() {
    await this.authService.logout();
  }
}