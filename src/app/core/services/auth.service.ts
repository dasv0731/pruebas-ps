import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import {
  signIn,
  signOut,
  getCurrentUser,
  fetchAuthSession,
  confirmSignIn,
  type SignInInput,
  type SignInOutput,
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

  async login(email: string, password: string): Promise<SignInOutput> {
    const input: SignInInput = {
      username: email,
      password,
    };
    const result = await signIn(input);
    if (result.isSignedIn) await this.checkAuth();
    return result;
  }

  async completeNewPassword(newPassword: string): Promise<SignInOutput> {
    const result = await confirmSignIn({ challengeResponse: newPassword });
    if (result.isSignedIn) await this.checkAuth();
    return result;
  }

  async logout(): Promise<void> {
    await signOut();
    this.currentUser.next(null);
  }

  getUserId(): string | null {
    return this.currentUser.value?.userId ?? null;
  }
}
