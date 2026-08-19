import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { ThemeService } from '../../services/theme.service';
import { NgClass } from '@angular/common';

@Component({
    selector: 'app-navbar',
    imports: [RouterLink, NgClass],
    templateUrl: './navbar.component.html',
})
export class NavbarComponent {
  authService = inject(AuthService);
  themeService = inject(ThemeService);
  router = inject(Router);

  // Signal for mobile menu visibility
  showMobileMenu = signal(false);

  constructor() {}

  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }

  getUserName(): string {
    const user = this.authService.getCurrentUser();
    if (!user) return 'User';
    return user.fullName || user.name || user.roleName || 'User';
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    this.showMobileMenu.set(false);
  }

  toggleMobileMenu() {
    this.showMobileMenu.update(value => !value);
  }
}
