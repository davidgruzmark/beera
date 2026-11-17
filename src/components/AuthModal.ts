import { store } from '../store';
import { t } from '../i18n';
import { Icons } from './Icons';
import { escapeHtml } from '../utils';
import { isSupabaseConfigured } from '../supabase';

export class AuthModal {
  private backdrop: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;
  private mode: 'signin' | 'signup' = 'signin';
  private errorMsg: string | null = null;
  private infoMsg: string | null = null;
  private isSubmitting = false;
  private rememberMe = localStorage.getItem('beera_remember_me') !== 'false';
  private savedEmail = localStorage.getItem('beera_saved_email') || '';

  public mount(backdropElement: HTMLElement) {
    this.backdrop = backdropElement;
    this.unsubscribe = store.subscribe((state) => {
      if (!isSupabaseConfigured || state.syncStatus !== 'unauthenticated') {
        this.backdrop?.classList.remove('active');
      } else {
        this.backdrop?.classList.add('active');
        this.render();
      }
    });
  }

  public unmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    if (this.backdrop) {
      this.backdrop.classList.remove('active');
      this.backdrop.innerHTML = '';
      this.backdrop = null;
    }
  }

  private render() {
    if (!this.backdrop) return;

    const isSignin = this.mode === 'signin';

    this.backdrop.innerHTML = `
      <div class="modal-card modal-card-small" style="max-width: 420px;">
        <div class="modal-header" style="justify-content: center; flex-direction: column; gap: 8px; text-align: center; padding-bottom: 12px;">
          <div style="color: var(--primary); display: flex; align-items: center; justify-content: center;">
            ${Icons.beer(36)}
          </div>
          <h3 style="margin: 0; font-size: 1.35rem;">${isSignin ? t('auth.title.signin') : t('auth.title.signup')}</h3>
          <p style="margin: 0; font-size: 0.85rem; color: var(--text-secondary);">${t('auth.subtitle')}</p>
        </div>

        <div class="modal-body" style="padding-top: 16px;">
          ${this.errorMsg ? `
            <div style="background: hsla(var(--hsl-urgent), 0.14); border: 1px solid hsl(var(--hsl-urgent)); color: hsl(var(--hsl-urgent)); padding: 10px 12px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 14px;">
              ${escapeHtml(this.errorMsg)}
            </div>
          ` : ''}

          ${this.infoMsg ? `
            <div style="background: hsla(var(--hsl-done), 0.14); border: 1px solid hsl(var(--hsl-done)); color: hsl(var(--hsl-done)); padding: 10px 12px; border-radius: 8px; font-size: 0.85rem; margin-bottom: 14px;">
              ${escapeHtml(this.infoMsg)}
            </div>
          ` : ''}

          <form id="form-auth" style="display: flex; flex-direction: column; gap: 14px;">
            <div class="form-group">
              <label class="form-label" for="auth-email-input">${t('auth.email')}</label>
              <input
                type="email"
                class="form-input"
                id="auth-email-input"
                placeholder="you@example.com"
                value="${escapeHtml(this.savedEmail)}"
                autocomplete="email"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label" for="auth-password-input">${t('auth.password')}</label>
              <input
                type="password"
                class="form-input"
                id="auth-password-input"
                placeholder="••••••••"
                minlength="6"
                autocomplete="${isSignin ? 'current-password' : 'new-password'}"
                required
              />
            </div>

            <div class="form-row" style="display: flex; align-items: center; justify-content: space-between; margin: -2px 0 2px 0;">
              <label style="display: inline-flex; align-items: center; gap: 8px; font-size: 0.85rem; color: var(--text-secondary); cursor: pointer; user-select: none;">
                <input
                  type="checkbox"
                  id="auth-remember-me"
                  ${this.rememberMe ? 'checked' : ''}
                  style="accent-color: var(--primary); width: 16px; height: 16px; cursor: pointer; border-radius: 4px;"
                />
                <span>${t('auth.rememberMe')}</span>
              </label>
            </div>

            <button
              type="submit"
              class="btn btn-primary"
              id="btn-auth-submit"
              style="width: 100%; justify-content: center; padding: 12px; margin-top: 4px;"
              ${this.isSubmitting ? 'disabled' : ''}
            >
              ${this.isSubmitting ? '...' : (isSignin ? t('auth.btn.signin') : t('auth.btn.signup'))}
            </button>
          </form>

          <div style="text-align: center; margin-top: 16px; padding-top: 14px; border-top: 1px solid var(--border-color);">
            <button
              type="button"
              class="btn-text"
              id="btn-auth-switch-mode"
              style="color: var(--primary); font-size: 0.85rem; cursor: pointer; background: none; border: none;"
            >
              ${isSignin ? t('auth.switch.toSignup') : t('auth.switch.toSignin')}
            </button>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    if (!this.backdrop) return;

    const form = this.backdrop.querySelector('#form-auth') as HTMLFormElement | null;
    const switchBtn = this.backdrop.querySelector('#btn-auth-switch-mode') as HTMLButtonElement | null;

    switchBtn?.addEventListener('click', () => {
      this.mode = this.mode === 'signin' ? 'signup' : 'signin';
      this.errorMsg = null;
      this.infoMsg = null;
      this.render();
    });

    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.isSubmitting) return;

      const emailInput = this.backdrop?.querySelector('#auth-email-input') as HTMLInputElement | null;
      const passwordInput = this.backdrop?.querySelector('#auth-password-input') as HTMLInputElement | null;
      const email = emailInput?.value.trim() || '';
      const password = passwordInput?.value || '';

      if (!email || !password) return;

      const rememberInput = this.backdrop?.querySelector('#auth-remember-me') as HTMLInputElement | null;
      const remember = rememberInput ? rememberInput.checked : true;
      this.rememberMe = remember;
      localStorage.setItem('beera_remember_me', remember ? 'true' : 'false');
      if (remember) {
        localStorage.setItem('beera_saved_email', email);
        this.savedEmail = email;
      } else {
        localStorage.removeItem('beera_saved_email');
        this.savedEmail = '';
      }

      this.isSubmitting = true;
      this.errorMsg = null;
      this.infoMsg = null;
      this.render();

      if (this.mode === 'signin') {
        const { error } = await store.signIn(email, password);
        this.isSubmitting = false;
        if (error) {
          this.errorMsg = error;
          this.render();
        }
      } else {
        const { error, needsConfirmation } = await store.signUp(email, password);
        this.isSubmitting = false;
        if (error) {
          this.errorMsg = error;
          this.render();
        } else if (needsConfirmation) {
          this.infoMsg = t('auth.signup.checkEmail');
          this.mode = 'signin';
          this.render();
        }
      }
    });
  }
}
