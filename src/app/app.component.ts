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
  passwordChangeRequired = false;
  newPassword = '';
  confirmNewPassword = '';
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

    if (!this.isPublicRoute) {
      void this.authService.checkAuth().then((authenticated) => {
        this.isAuthenticated = authenticated;
        this.checkingAuth = false;
        if (authenticated && this.router.url === '/login') void this.router.navigate(['/cases']);
      });
    }

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
      const result = await this.authService.login(this.loginEmail, this.loginPassword);
      if (result.isSignedIn) {
        this.isAuthenticated = true;
        await this.router.navigate(['/cases']);
      } else if (result.nextStep.signInStep === 'CONFIRM_SIGN_IN_WITH_NEW_PASSWORD_REQUIRED') {
        this.passwordChangeRequired = true;
        this.loginPassword = '';
      } else {
        this.loginError = 'El inicio de sesión requiere un paso adicional no compatible con esta aplicación.';
      }
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

  async onCompleteNewPassword() {
    if (!this.newPassword || this.newPassword !== this.confirmNewPassword || this.loggingIn) {
      this.loginError = 'Ingrese y confirme la nueva contraseña.';
      return;
    }
    try {
      this.loggingIn = true;
      this.loginError = '';
      const result = await this.authService.completeNewPassword(this.newPassword);
      if (!result.isSignedIn) throw new Error('No se pudo completar el cambio de contraseña.');
      this.passwordChangeRequired = false;
      this.newPassword = '';
      this.confirmNewPassword = '';
      this.isAuthenticated = true;
      await this.router.navigate(['/cases']);
    } catch (err: any) {
      this.loginError = err.message || 'No se pudo cambiar la contraseña.';
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
