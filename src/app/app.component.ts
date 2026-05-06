import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd } from '@angular/router';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';
import { BreadcrumbComponent } from './core/components/breadcrumb/breadcrumb.component';
import { filter } from 'rxjs/operators';
import { Hub } from 'aws-amplify/utils';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AmplifyAuthenticatorModule, CommonModule, BreadcrumbComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  isPublicRoute = false;
  private hubUnsubscribe: (() => void) | null = null;

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

    this.isPublicRoute = window.location.pathname.startsWith('/evaluate');

    if (!this.isPublicRoute) {
      this.authService.checkAuth();

      // Después del sign-in el router-outlet acaba de montarse: forzar navegación
      this.hubUnsubscribe = Hub.listen('auth', ({ payload }) => {
        if (payload.event === 'signedIn') {
          setTimeout(() => this.router.navigate(['/cases']), 0);
        }
      });
    }
  }

  ngOnDestroy() {
    this.hubUnsubscribe?.();
  }

  async onSignOut() {
    await this.authService.logout();
  }
}