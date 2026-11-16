import { store } from '../store';
import { t } from '../i18n';
import { Project, Sprint, Task, TaskStatus, TaskType } from '../types';
import { Icons } from './Icons';
import { escapeHtml, renderMemberAvatarsStack } from '../utils';

export class Backlog {
  private container: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;
  private showCreateSprint = false;
  private dragTaskId: string | null = null;

  public mount(container: HTMLElement) {
    this.container = container;
    this.unsubscribe = store.subscribe(() => this.render());
  }

  public unmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.container = null;
  }

  private getTypeIcon(type: TaskType): string {
    switch (type) {
      case 'bug':
        return Icons.bug(12);
      case 'feature':
        return Icons.feature(12);
      case 'story':
        return Icons.story(12);
      default:
        return Icons.checklist(12);
    }
  }

  private renderTaskRow(task: Task, project: Project): string {
    const assignee = project.members.find(m => m.userId === task.assigneeId)?.profile;
    const assigneeInitial = assignee
      ? (assignee.displayName || assignee.email).charAt(0).toUpperCase()
      : null;

    const sprintOptions = [
      `<option value="" ${!task.sprintId ? 'selected' : ''}>${t('sprint.noSprint')}</option>`,
      ...project.sprints
        .filter(s => s.status !== 'completed')
        .map(
          s =>
            `<option value="${escapeHtml(s.id)}" ${task.sprintId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
        )
    ].join('');

    return `
      <div class="backlog-task-row" draggable="true" data-task-id="${escapeHtml(task.id)}">
        <div class="backlog-task-left">
          <span class="badge-type badge-type-${escapeHtml(task.taskType || 'task')}" title="${t('type.' + (task.taskType || 'task'))}">
            ${this.getTypeIcon(task.taskType || 'task')}
          </span>
          <span class="task-card-key">${escapeHtml(task.id)}</span>
          <span class="backlog-task-title">${escapeHtml(task.title)}</span>
        </div>

        <div class="backlog-task-right">
          <select class="backlog-inline-select row-status-select" data-task-id="${escapeHtml(task.id)}" title="${t('task.modal.status')}">
            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>${t('column.todo')}</option>
            <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>${t('column.inprogress')}</option>
            <option value="review" ${task.status === 'review' ? 'selected' : ''}>${t('column.review')}</option>
            <option value="done" ${task.status === 'done' ? 'selected' : ''}>${t('column.done')}</option>
          </select>

          <span class="badge-priority badge-priority-${escapeHtml(task.priority)}">
            ${t('priority.' + task.priority)}
          </span>

          <span class="story-points-badge" title="${t('task.modal.storyPoints')}">
            ${task.storyPoints || 0} ${t('sprint.points')}
          </span>

          <select class="backlog-inline-select row-sprint-select" data-task-id="${escapeHtml(task.id)}" title="${t('sprint.moveTo')}">
            ${sprintOptions}
          </select>

          ${
            assignee && assigneeInitial
              ? `<span class="card-assignee-chip" style="background: ${escapeHtml(assignee.avatarColor || '#f59e0b')};" title="${escapeHtml(assignee.displayName)}">${escapeHtml(assigneeInitial)}</span>`
              : `<span class="card-assignee-chip" style="background: var(--bg-surface-elevated); color: var(--text-muted); border-color: var(--border-color);" title="${t('task.modal.unassigned')}">—</span>`
          }
        </div>
      </div>
    `;
  }

  private renderSprintCard(sprint: Sprint, tasks: Task[], project: Project): string {
    const totalPoints = tasks.reduce((sum, item) => sum + (item.storyPoints || 0), 0);
    const donePoints = tasks
      .filter(item => item.status === 'done')
      .reduce((sum, item) => sum + (item.storyPoints || 0), 0);

    const statusBadgeClass =
      sprint.status === 'active'
        ? 'sprint-status-active'
        : sprint.status === 'completed'
        ? 'sprint-status-completed'
        : 'sprint-status-planned';

    const dateRange =
      sprint.startDate || sprint.endDate
        ? `<span style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(sprint.startDate || '—')} → ${escapeHtml(sprint.endDate || '—')}</span>`
        : '';

    const rowsHtml =
      tasks.length > 0
        ? tasks.map(task => this.renderTaskRow(task, project)).join('')
        : `<div style="padding: 18px 20px; color: var(--text-muted); font-size: 0.88rem; text-align: center;">${t('sprint.empty.tasks')}</div>`;

    return `
      <div class="sprint-card drop-zone-sprint" data-sprint-id="${escapeHtml(sprint.id)}">
        <div class="sprint-header">
          <div class="sprint-header-meta">
            <div class="sprint-title-row">
              <span style="color: var(--primary); display: flex;">${Icons.sprint(16)}</span>
              <span class="sprint-name">${escapeHtml(sprint.name)}</span>
              <span class="sprint-status-pill ${statusBadgeClass}">${t('sprint.status.' + sprint.status)}</span>
              ${dateRange}
            </div>
            ${sprint.goal ? `<div class="sprint-goal-text">${escapeHtml(sprint.goal)}</div>` : ''}
          </div>

          <div class="sprint-actions">
            <span class="story-points-badge">${donePoints}/${totalPoints} ${t('sprint.points')}</span>
            <span class="column-count">${tasks.length} ${t('sprint.tasksCount')}</span>
            ${
              sprint.status === 'planned'
                ? `<button type="button" class="btn btn-primary btn-start-sprint" data-sprint-id="${escapeHtml(sprint.id)}" style="padding: 6px 12px; font-size: 0.82rem;">${t('sprint.start')}</button>`
                : ''
            }
            ${
              sprint.status === 'active'
                ? `<button type="button" class="btn btn-secondary btn-complete-sprint" data-sprint-id="${escapeHtml(sprint.id)}" style="padding: 6px 12px; font-size: 0.82rem;">${t('sprint.complete')}</button>`
                : ''
            }
            <button type="button" class="btn btn-secondary btn-delete-sprint" data-sprint-id="${escapeHtml(sprint.id)}" title="${t('sprint.delete')}" style="padding: 6px 10px; font-size: 0.82rem;">
              ${Icons.trash(13)}
            </button>
          </div>
        </div>

        <div class="backlog-list">
          ${rowsHtml}
        </div>

        ${
          sprint.status !== 'completed'
            ? `
            <div class="quick-add-container" style="padding: 10px 20px;">
              <form class="quick-add-sprint-form" data-sprint-id="${escapeHtml(sprint.id)}" style="display: flex; gap: 8px;">
                <input
                  type="text"
                  class="quick-add-input"
                  placeholder="＋ ${t('board.task.add')}..."
                  required
                />
              </form>
            </div>
          `
            : ''
        }
      </div>
    `;
  }

  private render() {
    if (!this.container) return;

    const project = store.getActiveProject();
    if (!project) {
      this.renderEmptyState();
      return;
    }

    this.container.className = 'main-content';

    const activeAndPlannedSprints = project.sprints.filter(s => s.status !== 'completed');
    const completedSprints = project.sprints.filter(s => s.status === 'completed');
    const backlogTasks = project.tasks.filter(
      task => !task.sprintId || !project.sprints.some(s => s.id === task.sprintId)
    );
    const backlogPoints = backlogTasks.reduce((sum, item) => sum + (item.storyPoints || 0), 0);

    const todayStr = new Date().toISOString().split('T')[0];
    const twoWeeksStr = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

    const createSprintFormHtml = this.showCreateSprint
      ? `
        <div class="sprint-card" style="padding: 20px; border-color: var(--border-active);">
          <form id="form-create-sprint" style="display: flex; flex-direction: column; gap: 14px;">
            <div style="display: grid; grid-template-columns: 1.5fr 1fr 1fr; gap: 12px;">
              <div class="form-group">
                <label class="form-label" for="sprint-name-input">${t('sprint.name')}</label>
                <input type="text" class="form-input" id="sprint-name-input" placeholder="${t('sprint.name.placeholder')}" required />
              </div>
              <div class="form-group">
                <label class="form-label" for="sprint-start-input">${t('sprint.startDate')}</label>
                <input type="date" class="form-input" id="sprint-start-input" value="${todayStr}" />
              </div>
              <div class="form-group">
                <label class="form-label" for="sprint-end-input">${t('sprint.endDate')}</label>
                <input type="date" class="form-input" id="sprint-end-input" value="${twoWeeksStr}" />
              </div>
            </div>
            <div class="form-group">
              <label class="form-label" for="sprint-goal-input">${t('sprint.goal')}</label>
              <input type="text" class="form-input" id="sprint-goal-input" placeholder="${t('sprint.goal.placeholder')}" />
            </div>
            <div style="display: flex; justify-content: flex-end; gap: 10px;">
              <button type="button" class="btn btn-secondary" id="btn-cancel-create-sprint">${t('project.btn.cancel')}</button>
              <button type="submit" class="btn btn-primary">${t('sprint.create')}</button>
            </div>
          </form>
        </div>
      `
      : '';

    const sprintsHtml = activeAndPlannedSprints
      .map(sprint => {
        const sprintTasks = project.tasks.filter(task => task.sprintId === sprint.id);
        return this.renderSprintCard(sprint, sprintTasks, project);
      })
      .join('');

    const completedHtml =
      completedSprints.length > 0
        ? `
          <div style="margin-top: 8px; display: flex; flex-direction: column; gap: 12px;">
            <div class="projects-section-title" style="margin: 8px 0 4px 0;">${t('sprint.completedArchive')}</div>
            ${completedSprints
              .map(sprint => {
                const sprintTasks = project.tasks.filter(task => task.sprintId === sprint.id);
                return this.renderSprintCard(sprint, sprintTasks, project);
              })
              .join('')}
          </div>
        `
        : '';

    const backlogRowsHtml =
      backlogTasks.length > 0
        ? backlogTasks.map(task => this.renderTaskRow(task, project)).join('')
        : `<div style="padding: 20px; color: var(--text-muted); font-size: 0.9rem; text-align: center;">${t('sprint.backlog.empty')}</div>`;

    this.container.innerHTML = `
      <div class="content-header">
        <div class="project-details-title">
          <span>${escapeHtml(project.icon)}</span>
          <span>${escapeHtml(project.name)}</span>
          <span class="project-key-title">${escapeHtml(project.key)}</span>
        </div>

        <div class="content-header-actions">
          ${renderMemberAvatarsStack(project.members)}
          <button type="button" class="btn btn-secondary" id="btn-backlog-share" style="padding: 8px 14px; font-size: 0.85rem;">
            ${Icons.users(15)}
            <span>${t('share.btn')}</span>
          </button>
          <button type="button" class="btn btn-primary" id="btn-toggle-create-sprint" style="padding: 8px 14px; font-size: 0.85rem;">
            ${Icons.plus(15)}
            <span>${t('sprint.create')}</span>
          </button>
        </div>
      </div>

      <div class="backlog-viewport">
        ${createSprintFormHtml}

        ${sprintsHtml}

        <!-- Product Backlog Card -->
        <div class="sprint-card drop-zone-sprint" data-sprint-id="">
          <div class="sprint-header">
            <div class="sprint-header-meta">
              <div class="sprint-title-row">
                <span style="color: var(--primary); display: flex;">${Icons.layers(16)}</span>
                <span class="sprint-name">${t('sprint.backlog.title')}</span>
              </div>
            </div>
            <div class="sprint-actions">
              <span class="story-points-badge">${backlogPoints} ${t('sprint.points')}</span>
              <span class="column-count">${backlogTasks.length} ${t('sprint.tasksCount')}</span>
            </div>
          </div>

          <div class="backlog-list">
            ${backlogRowsHtml}
          </div>

          <div class="quick-add-container" style="padding: 10px 20px;">
            <form class="quick-add-sprint-form" data-sprint-id="" style="display: flex; gap: 8px;">
              <input
                type="text"
                class="quick-add-input"
                placeholder="＋ ${t('board.task.add')}..."
                required
              />
            </form>
          </div>
        </div>

        ${completedHtml}
      </div>
    `;

    this.bindEvents();
  }

  private renderEmptyState() {
    if (!this.container) return;
    this.container.className = 'main-content';
    this.container.innerHTML = `
      <div class="empty-state-container">
        <div class="empty-state-illustration" style="color: var(--primary); display: flex; justify-content: center; margin-bottom: 16px;">${Icons.logo(64)}</div>
        <div class="empty-state-title">${t('project.empty.title')}</div>
        <div class="empty-state-desc">${t('project.empty.desc')}</div>
        <button class="btn btn-primary" id="btn-empty-create-project" style="display: inline-flex; align-items: center; gap: 8px;">
          ${Icons.plus(16)} <span>${t('project.create.title')}</span>
        </button>
      </div>
    `;
    this.container.querySelector('#btn-empty-create-project')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('open-new-project-modal'));
    });
  }

  private bindEvents() {
    if (!this.container) return;

    // Share / Team modal trigger
    this.container.querySelector('#btn-backlog-share')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('open-share-modal'));
    });

    // Toggle Create Sprint form
    this.container.querySelector('#btn-toggle-create-sprint')?.addEventListener('click', () => {
      this.showCreateSprint = !this.showCreateSprint;
      this.render();
    });

    this.container.querySelector('#btn-cancel-create-sprint')?.addEventListener('click', () => {
      this.showCreateSprint = false;
      this.render();
    });

    const createSprintForm = this.container.querySelector('#form-create-sprint') as HTMLFormElement | null;
    createSprintForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = this.container?.querySelector('#sprint-name-input') as HTMLInputElement | null;
      const goalInput = this.container?.querySelector('#sprint-goal-input') as HTMLInputElement | null;
      const startInput = this.container?.querySelector('#sprint-start-input') as HTMLInputElement | null;
      const endInput = this.container?.querySelector('#sprint-end-input') as HTMLInputElement | null;

      const name = nameInput?.value.trim() || '';
      if (!name) return;

      store.createSprint(
        name,
        goalInput?.value.trim() || '',
        startInput?.value || undefined,
        endInput?.value || undefined
      );
      this.showCreateSprint = false;
    });

    // Sprint lifecycle actions
    this.container.querySelectorAll('.btn-start-sprint').forEach(btn => {
      btn.addEventListener('click', () => {
        const sprintId = btn.getAttribute('data-sprint-id');
        if (sprintId) store.startSprint(sprintId);
      });
    });

    this.container.querySelectorAll('.btn-complete-sprint').forEach(btn => {
      btn.addEventListener('click', () => {
        const sprintId = btn.getAttribute('data-sprint-id');
        if (sprintId && confirm(t('sprint.complete.confirm'))) {
          store.completeSprint(sprintId);
        }
      });
    });

    this.container.querySelectorAll('.btn-delete-sprint').forEach(btn => {
      btn.addEventListener('click', () => {
        const sprintId = btn.getAttribute('data-sprint-id');
        if (sprintId && confirm(t('sprint.delete.confirm'))) {
          store.deleteSprint(sprintId);
        }
      });
    });

    // Quick-add tasks inside a sprint or backlog
    this.container.querySelectorAll('.quick-add-sprint-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('.quick-add-input') as HTMLInputElement | null;
        const rawSprintId = form.getAttribute('data-sprint-id');
        const sprintId = rawSprintId ? rawSprintId : null;
        const title = input?.value.trim() || '';
        if (title) {
          store.addTask(title, 'todo', { sprintId });
          if (input) input.value = '';
        }
      });
    });

    // Task row interactions
    this.container.querySelectorAll('.backlog-task-row').forEach(row => {
      row.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        if (target.closest('select') || target.closest('button')) return;
        const taskId = row.getAttribute('data-task-id');
        if (taskId) {
          window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { taskId } }));
        }
      });

      row.addEventListener('dragstart', (e) => {
        const dragEvent = e as DragEvent;
        this.dragTaskId = row.getAttribute('data-task-id');
        row.classList.add('dragging');
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.effectAllowed = 'move';
          dragEvent.dataTransfer.setData('text/plain', this.dragTaskId || '');
        }
      });

      row.addEventListener('dragend', () => {
        row.classList.remove('dragging');
        this.dragTaskId = null;
      });
    });

    // Drop zones for Sprints & Backlog
    this.container.querySelectorAll('.drop-zone-sprint').forEach(zone => {
      zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
      });

      zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
      });

      zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const dragEvent = e as DragEvent;
        const taskId = dragEvent.dataTransfer?.getData('text/plain') || this.dragTaskId;
        const rawSprintId = zone.getAttribute('data-sprint-id');
        const targetSprintId = rawSprintId ? rawSprintId : null;
        if (taskId) {
          store.assignTaskToSprint(taskId, targetSprintId);
        }
      });
    });

    // Inline status & sprint dropdowns
    this.container.querySelectorAll('.row-status-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const selectEl = e.target as HTMLSelectElement;
        const taskId = selectEl.getAttribute('data-task-id');
        if (taskId) {
          store.updateTask(taskId, { status: selectEl.value as TaskStatus });
        }
      });
    });

    this.container.querySelectorAll('.row-sprint-select').forEach(sel => {
      sel.addEventListener('change', (e) => {
        const selectEl = e.target as HTMLSelectElement;
        const taskId = selectEl.getAttribute('data-task-id');
        const sprintId = selectEl.value ? selectEl.value : null;
        if (taskId) {
          store.assignTaskToSprint(taskId, sprintId);
        }
      });
    });
  }
}
