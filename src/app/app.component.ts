import { Component, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { AmplifyAuthenticatorModule, AuthenticatorService } from '@aws-amplify/ui-angular';
import { CommonModule } from '@angular/common';
import { AuthService } from './core/services/auth.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, AmplifyAuthenticatorModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss',
})
export class AppComponent implements OnInit {
  constructor(
    public authenticator: AuthenticatorService,
    private authService: AuthService
  ) {}

  async ngOnInit() {
    await this.authService.checkAuth();
  }

  async onSignOut() {
    await this.authService.logout();
  }
}