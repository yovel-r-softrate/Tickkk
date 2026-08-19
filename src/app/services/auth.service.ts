import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private hrmsApiUrl = environment.hrmsApiUrl + '/api/auth';
  private tokenExpirationTimer: ReturnType<typeof setTimeout> | null = null;

  http = inject(HttpClient);
  router = inject(Router);

  constructor() {}

  redirectToTasks() {
    this.router.navigate(['/tasks']);
  }

  login(credentials: any): Observable<any> {
    return this.http.post(`${this.hrmsApiUrl}/login`, credentials).pipe(
      tap((response: any) => {
        console.log('Raw HRMS login response received:', response);
        const token = response.token || (response.data && response.data.token);
        const user = response.user || (response.data && response.data.user);
        console.log('Extracted token & user:', { token: !!token, user: !!user });
        
        if (response.success && token) {
          // HRMS tokens typically don't have explicit expiresIn in the payload sent to client, assume 7 days
          const expiresIn = 7 * 24 * 60 * 60; 
          this.handleAuthentication(token, expiresIn, user, credentials.companyCode);
        } else if (response.success && response.mfaRequired) {
          console.log('MFA is required. Bypassing automatic authentication.');
        } else {
          console.warn('Login condition failed. success:', response.success, 'token:', !!token);
        }
      })
    );
  }

  verifyMfa(tempToken: string, code: string, companyCode: string): Observable<any> {
    return this.http.post(`${this.hrmsApiUrl}/mfa/verify-login`, { tempToken, code }).pipe(
      tap((response: any) => {
        console.log('Raw HRMS MFA verification response received:', response);
        const token = response.token || (response.data && response.data.token);
        const user = response.user || (response.data && response.data.user);
        
        if (response.success && token) {
          const expiresIn = 7 * 24 * 60 * 60;
          this.handleAuthentication(token, expiresIn, user, companyCode);
        }
      })
    );
  }

  isAuthenticated(): boolean {
    const token = localStorage.getItem('token');
    const expirationDate = localStorage.getItem('tokenExpirationDate');
    console.log('isAuthenticated check:', { tokenExists: !!token, expirationDate, isExpired: expirationDate ? new Date(expirationDate) <= new Date() : true });
    if (!token) return false;
    if (!expirationDate) return false;
    return new Date(expirationDate) > new Date();
  }

  // Flat role model: everyone can do everything
  isAdmin(): boolean {
    return true;
  }

  isSuper(): boolean {
    return false;
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getCurrentUserRole(): string | null {
    return localStorage.getItem('role');
  }

  getCompanyCode(): string | null {
    return localStorage.getItem('companyCode');
  }
  
  getCompanyId(): string | null {
    return localStorage.getItem('companyId');
  }

  logout() {
    console.log('Logging out / clearing session');
    localStorage.removeItem('token');
    localStorage.removeItem('tokenExpirationDate');
    localStorage.removeItem('role');
    localStorage.removeItem('user');
    localStorage.removeItem('companyId');
    if (this.tokenExpirationTimer) {
      clearTimeout(this.tokenExpirationTimer);
      this.tokenExpirationTimer = null;
    }
    this.router.navigate(['/login']);
  }

  private handleAuthentication(token: string, expiresIn: number, user: any, companyCode: string) {
    console.log('handleAuthentication started:', { token: !!token, expiresIn, user, companyCode });
    
    // Check if token has an exp claim instead of hardcoding
    let actualExpiresIn = expiresIn;
    try {
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      if (decoded && decoded.exp) {
        // decoded.exp is in seconds
        actualExpiresIn = decoded.exp - Math.floor(Date.now() / 1000);
        if (actualExpiresIn <= 0) actualExpiresIn = expiresIn;
      }
    } catch (e) {
      // fallback to passed expiresIn
    }
    
    const expirationDate = new Date(new Date().getTime() + actualExpiresIn * 1000);
    localStorage.setItem('token', token);
    
    // Store HRMS specific fields
    if (user) {
      localStorage.setItem('companyId', user.companyId || '');
      localStorage.setItem('user', JSON.stringify(user));
      localStorage.setItem('role', user.role || 'employee');
    }
    
    // Remember company code across sessions
    if (companyCode) {
      localStorage.setItem('companyCode', companyCode);
    }
    
    localStorage.setItem('tokenExpirationDate', expirationDate.toISOString());
    this.autoLogout(actualExpiresIn * 1000);
  }

  autoLogin() {
    const token = this.getToken();
    const expirationDate = new Date(
      localStorage.getItem('tokenExpirationDate') || ''
    );
    if (!token || expirationDate <= new Date()) {
      this.logout();
      return;
    }
    const expiresIn = expirationDate.getTime() - new Date().getTime();
    this.autoLogout(expiresIn);
  }

  autoLogout(expirationDuration: number) {
    this.tokenExpirationTimer = setTimeout(() => {
      this.logout();
    }, expirationDuration);
  }

  getCurrentUserId(): string | null {
    try {
      const token = this.getToken();
      if (!token) return null;
      const payload = token.split('.')[1];
      const decoded = JSON.parse(atob(payload));
      // HRMS JWT structure has user object
      return decoded?.user?.id || null;
    } catch (e) {
      return null;
    }
  }

  getCurrentUser(): any {
    const userData = localStorage.getItem('user');
    return userData ? JSON.parse(userData) : null;
  }

  saveUserData(user: any): void {
    localStorage.setItem('user', JSON.stringify(user));
  }
}
