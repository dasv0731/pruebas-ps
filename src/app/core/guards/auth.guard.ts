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
      // La ruta de login no está protegida, por lo que siempre puede mostrar el
      // acceso en lugar de reintentar el guard sobre la ruta raíz.
      return this.router.createUrlTree(['/login']);
    }
  }
}
