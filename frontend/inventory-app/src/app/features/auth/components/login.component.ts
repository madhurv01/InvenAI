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
      <div class="bg-photo"></div>
      <div class="bg-overlay"></div>

      <div class="auth-card-wrap">
        <div class="auth-card card slide-in">
          <h2>{{ mode() === 'login' ? 'Welcome back' : 'Create an account' }}</h2>
          <p class="subtitle">
            {{ mode() === 'login' ? 'Sign in to manage your inventory.' : 'Register to get started.' }}
          </p>

          <div class="alert alert-danger" *ngIf="errorMessage()">{{ errorMessage() }}</div>

          <form [formGroup]="form" (ngSubmit)="submit()">
            <div class="form-group field" *ngIf="mode() === 'register'">
              <label class="form-label">Full name</label>
              <input class="form-control" formControlName="fullName" placeholder="Jane Doe" />
              <div class="form-error" *ngIf="submitted() && form.get('fullName')?.invalid">Full name is required.</div>
            </div>

            <div class="form-group field">
              <label class="form-label">Email</label>
              <input class="form-control" formControlName="email" placeholder="you@company.com" />
              <div class="form-error" *ngIf="submitted() && form.get('email')?.invalid">A valid email is required.</div>
            </div>

            <div class="form-group field">
              <label class="form-label">Password</label>
              <input class="form-control" type="password" formControlName="password" placeholder="••••••••" />
              <div class="form-error" *ngIf="submitted() && form.get('password')?.invalid">Password must be at least 6 characters.</div>
            </div>

            <button class="btn btn-primary submit-btn" style="width:100%" [disabled]="loading()">
              @if (loading()) {
                <span class="btn-spinner"></span> Please wait…
              } @else {
                {{ mode() === 'login' ? 'Sign in' : 'Register' }}
              }
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
        </div>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      position: relative;
      min-height: 100vh;
      width: 100%;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      padding: 20px clamp(20px, 6vw, 96px);
    }

    .bg-photo {
      position: absolute;
      inset: 0;
      background-image: url('/assets/images/login-bg.webp');
      background-size: cover;
      background-position: center;
      background-repeat: no-repeat;
      z-index: 0;
    }

    .bg-overlay {
      position: absolute;
      inset: 0;
      /* Barely-there vignette — just enough to keep the card's edge from disappearing into the photo. */
      background: radial-gradient(ellipse 900px 700px at 82% 50%, rgba(10, 12, 24, 0.18), transparent 70%);
      z-index: 1;
    }

    .auth-card-wrap { position: relative; z-index: 2; width: 100%; max-width: 546px; }

    .auth-card {
      width: 100%;
      padding: 47px 42px;
      background: rgba(255, 255, 255, 0.62);
      backdrop-filter: blur(26px) saturate(180%) brightness(1.1);
      -webkit-backdrop-filter: blur(26px) saturate(180%) brightness(1.1);
      box-shadow: 0 28px 72px rgba(10, 12, 24, 0.45), 0 2px 10px rgba(10,12,24,0.14), inset 0 1px 0 rgba(255,255,255,0.6);
      border: 1px solid rgba(255, 255, 255, 0.5);
      position: relative;
      overflow: hidden;
      transition: transform 0.35s var(--ease-out), box-shadow 0.35s var(--ease-out);
    }
    .auth-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 34px 84px rgba(10, 12, 24, 0.5), 0 2px 10px rgba(10,12,24,0.16), inset 0 1px 0 rgba(255,255,255,0.65);
    }
    .auth-card::before {
      content: '';
      position: absolute;
      inset: 0;
      padding: 1.5px;
      border-radius: inherit;
      background: linear-gradient(135deg, var(--color-primary), transparent 35%, transparent 65%, var(--color-primary));
      -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
      -webkit-mask-composite: xor;
      mask-composite: exclude;
      opacity: 0.5;
      pointer-events: none;
      animation: borderGlow 5s ease-in-out infinite;
    }
    @keyframes borderGlow { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.75; } }

    .slide-in { animation: slideInRight 0.6s cubic-bezier(0.16, 1, 0.3, 1) both; }

    h2 { font-size: 26px; }
    .subtitle { color: var(--color-text-muted); margin-bottom: 26px; font-size: 14px; }

    .field { animation: slideUp 0.4s ease both; }
    .field:nth-child(1) { animation-delay: 0.08s; }
    .field:nth-child(2) { animation-delay: 0.14s; }
    .field:nth-child(3) { animation-delay: 0.2s; }

    .submit-btn { margin-top: 6px; position: relative; padding: 12px; font-size: 15px; }
    .btn-spinner {
      width: 14px; height: 14px; border-radius: 50%;
      border: 2px solid rgba(255,255,255,0.4); border-top-color: #fff;
      display: inline-block; animation: spin 0.6s linear infinite; margin-right: 6px; vertical-align: -2px;
    }

    .switch-mode { text-align: center; font-size: 13.5px; color: var(--color-text-muted); margin-top: 20px; }
    .switch-mode a { cursor: pointer; font-weight: 700; color: var(--color-primary); transition: color 0.15s ease; }
    .switch-mode a:hover { text-decoration: underline; color: var(--color-primary-dark); }
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
