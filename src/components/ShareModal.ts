import { store } from '../store';
import { t } from '../i18n';
import { Icons } from './Icons';
import { escapeHtml } from '../utils';

export class ShareModal {
  private backdrop: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;
  private errorMsg: string | null = null;
  private successMsg: string | null = null;
  private isSubmitting = false;

  public mount(backdropElement: HTMLElement) {
    this.backdrop = backdropElement;
    window.addEventListener('open-share-modal', this.handleOpen);
    window.addEventListener('keydown', this.handleKeydown);
  }

  public unmount() {
    window.removeEventListener('open-share-modal', this.handleOpen);
    window.removeEventListener('keydown', this.handleKeydown);
    this.close();
    this.backdrop = null;
  }

  private handleOpen = () => {
    this.errorMsg = null;
    this.successMsg = null;
    this.open();
  };

  private handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.backdrop?.classList.contains('active')) {
      this.close();
    }
  };

  private open() {
    if (!this.backdrop) return;
    if (this.unsubscribe) {
      this.unsubscribe();
    }
    this.unsubscribe = store.subscribe(() => this.render());
    this.backdrop.classList.add('active');
  }

  private close() {
    if (!this.backdrop) return;
    this.backdrop.classList.remove('active');
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private render() {
    if (!this.backdrop) return;
    const project = store.getActiveProject();
    if (!project) {
      this.close();
      return;
    }

    const membersHtml = project.members
      .map(member => {
        const initial = (member.profile.displayName || member.profile.email || '?')
          .charAt(0)
          .toUpperCase();
        const roleLabel = member.role === 'owner' ? t('share.role.owner') : t('share.role.member');

        return `
          <div class="share-member-row">
            <div class="share-member-info">
              <span class="card-assignee-chip" style="background: ${escapeHtml(member.profile.avatarColor || '#f59e0b')}; width: 32px; height: 32px; font-size: 0.85rem;">
                ${escapeHtml(initial)}
              </span>
              <div style="display: flex; flex-direction: column; min-width: 0;">
                <span style="font-weight: 600; font-size: 0.92rem; color: var(--text-primary);">${escapeHtml(member.profile.displayName)}</span>
                <span style="font-size: 0.78rem; color: var(--text-muted); overflow: hidden; text-overflow: ellipsis;">${escapeHtml(member.profile.email)}</span>
              </div>
            </div>
            <div style="display: flex; align-items: center; gap: 8px;">
              <span class="share-role-badge">${escapeHtml(roleLabel)}</span>
              ${
                member.role !== 'owner'
                  ? `<button type="button" class="btn btn-secondary btn-remove-member" data-user-id="${escapeHtml(member.userId)}" style="padding: 4px 10px; font-size: 0.78rem;">${t('share.remove')}</button>`
                  : ''
              }
            </div>
          </div>
        `;
      })
      .join('');

    this.backdrop.innerHTML = `
      <div class="modal-card modal-card-small" style="max-width: 500px;">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 10px;">
            <span style="color: var(--primary); display: flex;">${Icons.users(20)}</span>
            <h3 style="margin: 0;">${t('share.title')}</h3>
          </div>
          <button class="modal-close-btn" id="btn-close-share-modal">✕</button>
        </div>

        <div class="modal-body" style="gap: 18px;">
          <div style="font-size: 0.9rem; color: var(--text-secondary); display: flex; align-items: center; gap: 8px;">
            <span>${escapeHtml(project.icon)}</span>
            <strong>${escapeHtml(project.name)}</strong>
            <span class="project-key-badge">${escapeHtml(project.key)}</span>
          </div>

          ${
            this.errorMsg
              ? `<div style="background: hsla(var(--hsl-urgent), 0.14); border: 1px solid hsl(var(--hsl-urgent)); color: hsl(var(--hsl-urgent)); padding: 10px 12px; border-radius: 8px; font-size: 0.85rem;">${escapeHtml(this.errorMsg)}</div>`
              : ''
          }

          ${
            this.successMsg
              ? `<div style="background: hsla(var(--hsl-done), 0.14); border: 1px solid hsl(var(--hsl-done)); color: hsl(var(--hsl-done)); padding: 10px 12px; border-radius: 8px; font-size: 0.85rem;">${escapeHtml(this.successMsg)}</div>`
              : ''
          }

          <form id="form-invite-member" style="display: flex; flex-direction: column; gap: 10px;">
            <label class="form-label" for="invite-email-input">${t('share.invite.label')}</label>
            <div style="display: flex; gap: 10px;">
              <input
                type="email"
                class="form-input"
                id="invite-email-input"
                placeholder="${t('share.invite.placeholder')}"
                required
                style="flex: 1;"
              />
              <button type="submit" class="btn btn-primary" ${this.isSubmitting ? 'disabled' : ''}>
                ${this.isSubmitting ? '...' : t('share.invite.btn')}
              </button>
            </div>
          </form>

          <div class="form-group">
            <label class="form-label">${t('share.members.title')} (${project.members.length})</label>
            <div class="share-members-list">
              ${membersHtml}
            </div>
          </div>
        </div>
      </div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    if (!this.backdrop) return;

    const closeBtn = this.backdrop.querySelector('#btn-close-share-modal');
    closeBtn?.addEventListener('click', () => this.close());

    this.backdrop.onclick = (e: MouseEvent) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    };

    const form = this.backdrop.querySelector('#form-invite-member') as HTMLFormElement | null;
    form?.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (this.isSubmitting) return;

      const emailInput = this.backdrop?.querySelector('#invite-email-input') as HTMLInputElement | null;
      const email = emailInput?.value.trim() || '';
      if (!email) return;

      this.isSubmitting = true;
      this.errorMsg = null;
      this.successMsg = null;
      this.render();

      const { error } = await store.inviteMemberByEmail(email);
      this.isSubmitting = false;

      if (error) {
        this.errorMsg = error;
      } else {
        this.successMsg = t('share.success');
      }
      this.render();
    });

    this.backdrop.querySelectorAll('.btn-remove-member').forEach(btn => {
      btn.addEventListener('click', () => {
        const userId = btn.getAttribute('data-user-id');
        if (userId) {
          store.removeMember(userId);
        }
      });
    });
  }
}
