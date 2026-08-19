import { Component, inject, signal, computed, OnInit } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import {
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Router } from '@angular/router';
import { NgClass } from '@angular/common';
import { NotificationService } from '../../services/notification.service';
import { WebsocketService } from '../../services/websocket.service';

@Component({
    selector: 'app-login',
    imports: [ReactiveFormsModule, NgClass],
    templateUrl: './login.component.html',
})
export class LoginComponent implements OnInit {
  loginForm: FormGroup;
  error = signal<string>('');
  showPassword = signal<boolean>(false);
  loading = signal<boolean>(false);
  isLoading = computed(() => this.loading());

  private router = inject(Router);
  private authService = inject(AuthService);
  private fb = inject(FormBuilder);
  private notificationService = inject(NotificationService);
  private wsService = inject(WebsocketService);

  mfaRequired = signal<boolean>(false);
  tempToken = signal<string>('');

  constructor() {
    this.loginForm = this.fb.group({
      identifier: new FormControl('', [Validators.required]),
      password: new FormControl('', [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(20),
      ]),
      companyCode: new FormControl('', [Validators.required]),
      mfaCode: new FormControl('', [])
    });
  }

  ngOnInit(): void {
    const savedCompanyCode = this.authService.getCompanyCode();
    if (savedCompanyCode) {
      this.loginForm.patchValue({ companyCode: savedCompanyCode });
    }
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((state) => !state);
  }

  onSubmit(): void {
    if (this.loading()) {
      return;
    }

    if (this.mfaRequired()) {
      const mfaCodeControl = this.loginForm.get('mfaCode');
      if (!mfaCodeControl?.value) {
        mfaCodeControl?.markAsTouched();
        return;
      }
      this.setLoadingState(true);
      this.authService.verifyMfa(this.tempToken(), mfaCodeControl.value, this.loginForm.value.companyCode).subscribe({
        next: () => this.handleLoginSuccess(),
        error: (err) => this.handleLoginError(err)
      });
      return;
    }

    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      return;
    }
    // Request permission synchronously during the user click event
    this.wsService.requestNotificationPermission();

    this.setLoadingState(true);
    const data = this.getFormData();
    this.authService.login(data).subscribe({
      next: (response) => {
        this.setLoadingState(false);
        if (response.success && response.mfaRequired) {
          this.mfaRequired.set(true);
          this.tempToken.set(response.tempToken);
          // Set MFA validator dynamically and clear others
          this.loginForm.get('mfaCode')?.setValidators([Validators.required, Validators.pattern(/^\d{6}$/)]);
          this.loginForm.get('mfaCode')?.updateValueAndValidity();
          this.loginForm.get('identifier')?.disable();
          this.loginForm.get('password')?.disable();
          this.loginForm.get('companyCode')?.disable();
          this.notificationService.info('Please enter your 6-digit MFA verification code.', 'MFA Required');
        } else {
          this.handleLoginSuccess();
        }
      },
      error: (err) => this.handleLoginError(err),
    });
  }

  private setLoadingState(state: boolean): void {
    this.loading.set(state);
  }

  private getFormData(): { identifier: string; password: string; companyCode: string } {
    return {
      identifier: this.loginForm.value.identifier,
      password: this.loginForm.value.password,
      companyCode: this.loginForm.value.companyCode,
    };
  }

  private handleLoginSuccess(): void {
    this.setLoadingState(false);
    this.wsService.connect();
    this.notificationService.success('Welcome back! You have successfully logged in.', 'Login Successful');
    console.log('Navigating to /tasks...');
    this.router.navigate(['/tasks']).then(
      navigated => console.log('Navigation to /tasks successful:', navigated),
      err => console.error('Navigation to /tasks failed:', err)
    );
  }

  private handleLoginError(err: any): void {
    this.setLoadingState(false);
    console.error(err);
    const msg = err?.error?.message || 'Invalid credentials. Please try again.';
    this.error.set(msg);
    this.notificationService.error(msg, 'Login Failed');
  }
}