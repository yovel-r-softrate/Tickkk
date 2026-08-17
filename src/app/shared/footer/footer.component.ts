import { Component, inject, input } from '@angular/core';
import { AuthService } from '../../services/auth.service';

@Component({
    selector: 'app-footer',
    imports: [],
    templateUrl: './footer.component.html',
})
export class FooterComponent {
  authService = inject(AuthService);
  visitorCount = input<number>(0);
  isVisitorCountLoading = input<boolean>(false);
  visitorCountError = input<string | null>(null);
  
  currentYear = new Date().getFullYear();
  
  isLoggedIn(): boolean {
    return this.authService.isAuthenticated();
  }
  
  isAdmin(): boolean {
    return this.authService.isAdmin() && this.authService.isAuthenticated();
  }
}
