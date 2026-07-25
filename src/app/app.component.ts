import { Component, OnInit, OnDestroy } from '@angular/core';
import { RouterOutlet, Router, NavigationEnd, RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from './core/services/auth.service';
import { BreadcrumbComponent } from './core/components/breadcrumb/breadcrumb.component';
import { filter } from 'rxjs/operators';
import { Hub } from 'aws-amplify/utils';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    CommonModule,
    FormsModule,
    BreadcrumbComponent,
  ],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit, OnDestroy {
  isPublicRoute = false;
  checkingAuth = true;
  isAuthenticated = false;
  loginEmail = '';
  loginPassword = '';
  loginError = '';
  loggingIn = false;
  private hubUnsubscribe: (() => void) | null = null;

  constructor(
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

    // Do not query the persisted Cognito session during bootstrap. In some
    // browsers that lookup can block the first paint of the auth screen.
    if (!this.isPublicRoute) this.checkingAuth = false;

    this.hubUnsubscribe = Hub.listen('auth', ({ payload }) => {
      if (payload.event === 'signedIn') {
        this.isAuthenticated = true;
        this.checkingAuth = false;
        setTimeout(() => this.router.navigate(['/cases']), 0);
      }
      if (payload.event === 'signedOut') this.isAuthenticated = false;
    });
  }

  async onSignIn() {
    if (!this.loginEmail || !this.loginPassword || this.loggingIn) return;
    try {
      this.loggingIn = true;
      this.loginError = '';
      await this.authService.login(this.loginEmail, this.loginPassword);
      this.isAuthenticated = true;
      await this.router.navigate(['/cases']);
    } catch (err: any) {
      if (err.name === 'UserAlreadyAuthenticatedException') {
        this.isAuthenticated = true;
        await this.router.navigate(['/cases']);
        return;
      }
      this.loginError = err.message || 'No se pudo iniciar sesión. Verifique sus credenciales.';
    } finally {
      this.loggingIn = false;
    }
  }

  ngOnDestroy() {
    this.hubUnsubscribe?.();
  }

  async onSignOut() {
    await this.authService.logout();
    this.isAuthenticated = false;
    this.loginPassword = '';
  }
}
