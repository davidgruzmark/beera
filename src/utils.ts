import { ProjectMember, Sprint } from './types';

/**
 * Escapes HTML special characters to prevent DOM XSS when rendering into innerHTML.
 */
export function escapeHtml(str: string | undefined | null): string {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Renders overlapping circular avatar chips for project team members.
 */
export function renderMemberAvatarsStack(members: ProjectMember[], maxShown = 4): string {
  if (!members || members.length === 0) return '';
  const visible = members.slice(0, maxShown);
  const extra = members.length - visible.length;

  const chips = visible
    .map(m => {
      const initial = (m.profile.displayName || m.profile.email || '?').charAt(0).toUpperCase();
      const title = `${m.profile.displayName} (${m.profile.email})`;
      const color = m.profile.avatarColor || '#f59e0b';
      return `<span class="member-avatar-chip" style="background: ${escapeHtml(color)};" title="${escapeHtml(title)}">${escapeHtml(initial)}</span>`;
    })
    .join('');

  const extraChip =
    extra > 0
      ? `<span class="member-avatar-chip" style="background: var(--bg-surface-elevated); color: var(--text-primary); border-color: var(--border-color);">+${extra}</span>`
      : '';

  return `<div class="member-avatars-stack">${chips}${extraChip}</div>`;
}

/**
 * Computes remaining days until a sprint endDate (YYYY-MM-DD).
 */
export function getSprintDaysRemaining(sprint: Sprint): number | null {
  if (!sprint.endDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const end = new Date(sprint.endDate + 'T00:00:00');
  const diffMs = end.getTime() - today.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
