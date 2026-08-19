import { inject, Injectable } from '@angular/core';
import {
  CanActivate,
  Router,
} from '@angular/router';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
  router = inject(Router);

  canActivate(): boolean {
    // Flat model: Everyone has admin-level access to tasks within their company
    return true;
  }
}
