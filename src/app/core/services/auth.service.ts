import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  type SignInInput,
} from 'aws-amplify/auth';

export interface AuthUser {
  userId: string;
  email: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUser = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUser.asObservable();

  async checkAuth(): Promise<boolean> {
    try {
      const user = await getCurrentUser();
      const session = await fetchAuthSession();
      const email =
        (session.tokens?.idToken?.payload?.['email'] as string) ?? '';

      this.currentUser.next({
        userId: user.userId,
        email,
      });
      return true;
    } catch {
      this.currentUser.next(null);
      return false;
    }
  }

  async login(email: string, password: string): Promise<void> {
    const input: SignInInput = {
      username: email,
      password,
    };
    await signIn(input);
    await this.checkAuth();
  }

  async logout(): Promise<void> {
    await signOut();
    this.currentUser.next(null);
  }

  getUserId(): string | null {
    return this.currentUser.value?.userId ?? null;
  }
}