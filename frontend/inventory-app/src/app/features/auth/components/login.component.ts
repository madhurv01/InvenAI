import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  template: `
    <div class="auth-page">
      <div class="auth-card card">
        <div class="auth-brand">📦 InvenAI</div>
        <h2>{{ mode() === 'login' ? 'Welcome back' : 'Create an account' }}</h2>
        <p class="subtitle">
          {{ mode() === 'login' ? 'Sign in to manage your inventory.' : 'Register to get started.' }}
        </p>

        <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

        <form [formGroup]="form" (ngSubmit)="submit()">
          <div class="form-group" *ngIf="mode() === 'register'">
            <label class="form-label">Full name</label>
            <input class="form-control" formControlName="fullName" placeholder="Jane Doe" />
            <div class="form-error" *ngIf="submitted() && form.get('fullName')?.invalid">Full name is required.</div>
          </div>

          <div class="form-group">
            <label class="form-label">Email</label>
            <input class="form-control" formControlName="email" placeholder="you@company.com" />
            <div class="form-error" *ngIf="submitted() && form.get('email')?.invalid">A valid email is required.</div>
          </div>

          <div class="form-group">
            <label class="form-label">Password</label>
            <input class="form-control" type="password" formControlName="password" placeholder="••••••••" />
            <div class="form-error" *ngIf="submitted() && form.get('password')?.invalid">Password must be at least 6 characters.</div>
          </div>

          <button class="btn btn-primary" style="width:100%" [disabled]="loading()">
            {{ loading() ? 'Please wait…' : (mode() === 'login' ? 'Sign in' : 'Register') }}
          </button>
        </form>

        <p class="switch-mode">
          <ng-container *ngIf="mode() === 'login'; else toLogin">
            Don't have an account?
            <a (click)="toggleMode()">Register</a>
          </ng-container>
          <ng-template #toLogin>
            Already have an account?
            <a (click)="toggleMode()">Sign in</a>
          </ng-template>
        </p>

        <p class="hint">Demo admin login: admin&#64;inventory.local / Admin&#64;123</p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: linear-gradient(135deg, #eef2ff 0%, #f6f7fb 100%);
      padding: 20px;
    }
    .auth-card { width: 100%; max-width: 400px; padding: 32px; }
    .auth-brand { font-size: 20px; font-weight: 700; margin-bottom: 18px; }
    .subtitle { color: var(--color-text-muted); margin-bottom: 20px; font-size: 13px; }
    .switch-mode { text-align: center; font-size: 13px; color: var(--color-text-muted); margin-top: 16px; }
    .switch-mode a { cursor: pointer; font-weight: 500; }
    .hint { text-align: center; font-size: 12px; color: var(--color-text-muted); margin-top: 14px; }
  `]
})
export class LoginComponent {
  mode = signal<'login' | 'register'>('login');
  loading = signal(false);
  submitted = signal(false);
  errorMessage = signal('');

  form: ReturnType<FormBuilder['group']>;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router) {
    this.form = this.fb.group({
      fullName: [''],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  toggleMode(): void {
    this.mode.set(this.mode() === 'login' ? 'register' : 'login');
    this.errorMessage.set('');
    this.submitted.set(false);
  }

  submit(): void {
    this.submitted.set(true);
    this.errorMessage.set('');

    if (this.mode() === 'register' && !this.form.value.fullName) {
      return;
    }
    if (this.form.invalid) {
      return;
    }

    this.loading.set(true);
    const { fullName, email, password } = this.form.value;

    const request$ = this.mode() === 'login'
      ? this.auth.login({ email: email!, password: password! })
      : this.auth.register({ fullName: fullName!, email: email!, password: password! });

    request$.subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        this.errorMessage.set(err.friendlyMessage || 'Unable to sign in. Please check your credentials.');
      }
    });
  }
}
