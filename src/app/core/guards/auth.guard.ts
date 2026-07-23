import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree } from '@angular/router';
import { getCurrentUser } from 'aws-amplify/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  async canActivate(): Promise<boolean | UrlTree> {
    try {
      await getCurrentUser();
      return true;
    } catch {
      // Sin sesión: redirigir a la raíz (que muestra el authenticator de Amplify)
      // en vez de cancelar en silencio la navegación (dejaría pantalla en blanco).
      return this.router.createUrlTree(['/']);
    }
  }
}