import { store } from '../store';
import { t } from '../i18n';
import {
  AppFilters,
  Project,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType
} from '../types';
import { Icons } from './Icons';
import { escapeHtml, getSprintDaysRemaining } from '../utils';

type GroupByMode = 'status' | 'sprint' | 'priority' | 'none';
type SortField = 'taskNum' | 'title' | 'status' | 'priority' | 'storyPoints' | 'dueDate';

interface TableGroupDef {
  key: string;
  label: string;
  dotColor: string;
  tasks: Task[];
}

const STATUS_ORDER: Record<TaskStatus, number> = {
  todo: 0,
  inprogress: 1,
  review: 2,
  done: 3
};

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  urgent: 0,
  high: 1,
  medium: 2,
  low: 3
};

export class TableView {
  private container: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;
  private groupBy: GroupByMode = 'status';
  private sortField: SortField = 'taskNum';
  private sortAsc = true;
  private collapsedGroups: Set<string> = new Set();
  private handleOutsideClickBound: ((e: MouseEvent) => void) | null = null;

  public mount(container: HTMLElement) {
    this.container = container;
    this.unsubscribe = store.subscribe(() => this.render());
  }

  public unmount() {
    if (this.handleOutsideClickBound) {
      document.removeEventListener('click', this.handleOutsideClickBound);
      this.handleOutsideClickBound = null;
    }
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
    this.container = null;
  }

  private getFilteredTasks(
    tasks: Task[],
    filters: AppFilters,
    activeSprintId?: string,
    currentUserId?: string | null
  ): Task[] {
    return tasks.filter(task => {
      if (filters.boardScope === 'active_sprint' && activeSprintId) {
        if (task.sprintId !== activeSprintId) return false;
      }

      const query = filters.search.toLowerCase().trim();
      const matchesSearch =
        query === '' ||
        task.title.toLowerCase().includes(query) ||
        task.description.toLowerCase().includes(query) ||
        task.id.toLowerCase().includes(query);

      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;
      const matchesTag = filters.tag === 'all' || task.tags.includes(filters.tag);

      let matchesAssignee = true;
      if (filters.assignee === 'me') {
        matchesAssignee = Boolean(currentUserId && task.assigneeId === currentUserId);
      } else if (filters.assignee !== 'all') {
        matchesAssignee = task.assigneeId === filters.assignee;
      }

      return matchesSearch && matchesPriority && matchesTag && matchesAssignee;
    });
  }

  private sortTasks(tasks: Task[]): Task[] {
    const dir = this.sortAsc ? 1 : -1;
    return [...tasks].sort((a, b) => {
      switch (this.sortField) {
        case 'title':
          return a.title.localeCompare(b.title) * dir;
        case 'status':
          return (STATUS_ORDER[a.status] - STATUS_ORDER[b.status]) * dir;
        case 'priority':
          return (PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]) * dir;
        case 'storyPoints':
          return ((a.storyPoints || 0) - (b.storyPoints || 0)) * dir;
        case 'dueDate': {
          const da = a.dueDate || '9999-12-31';
          const db = b.dueDate || '9999-12-31';
          return da.localeCompare(db) * dir;
        }
        case 'taskNum':
        default:
          return (a.taskNum - b.taskNum) * dir;
      }
    });
  }

  private buildGroups(project: Project, tasks: Task[]): TableGroupDef[] {
    const sorted = this.sortTasks(tasks);

    if (this.groupBy === 'status') {
      const statuses: { key: TaskStatus; color: string }[] = [
        { key: 'todo', color: 'hsl(var(--hsl-todo))' },
        { key: 'inprogress', color: 'hsl(var(--hsl-inprogress))' },
        { key: 'review', color: 'hsl(var(--hsl-review))' },
        { key: 'done', color: 'hsl(var(--hsl-done))' }
      ];
      return statuses.map(s => ({
        key: s.key,
        label: t('column.' + s.key),
        dotColor: s.color,
        tasks: sorted.filter(task => task.status === s.key)
      }));
    }

    if (this.groupBy === 'priority') {
      const priorities: { key: TaskPriority; color: string }[] = [
        { key: 'urgent', color: 'hsl(var(--hsl-urgent))' },
        { key: 'high', color: 'hsl(var(--hsl-high))' },
        { key: 'medium', color: 'hsl(var(--hsl-medium))' },
        { key: 'low', color: 'hsl(var(--hsl-low))' }
      ];
      return priorities.map(p => ({
        key: p.key,
        label: t('priority.' + p.key),
        dotColor: p.color,
        tasks: sorted.filter(task => task.priority === p.key)
      }));
    }

    if (this.groupBy === 'sprint') {
      const groups: TableGroupDef[] = project.sprints.map(sprint => ({
        key: sprint.id,
        label: `${sprint.name} (${t('sprint.status.' + sprint.status)})`,
        dotColor:
          sprint.status === 'active'
            ? 'var(--primary)'
            : sprint.status === 'completed'
            ? 'hsl(var(--hsl-done))'
            : 'hsl(var(--hsl-todo))',
        tasks: sorted.filter(task => task.sprintId === sprint.id)
      }));
      groups.push({
        key: '',
        label: t('sprint.backlog.title'),
        dotColor: 'hsl(var(--hsl-todo))',
        tasks: sorted.filter(task => !task.sprintId)
      });
      return groups;
    }

    return [
      {
        key: 'all',
        label: t('table.group.none'),
        dotColor: 'var(--primary)',
        tasks: sorted
      }
    ];
  }

  private renderSortArrow(field: SortField): string {
    if (this.sortField !== field) return '';
    return `<span class="table-sort-indicator">${this.sortAsc ? '↑' : '↓'}</span>`;
  }

  private renderTaskRow(task: Task, project: Project): string {
    const today = new Date().toISOString().split('T')[0];
    const isOverdue = Boolean(task.dueDate && task.dueDate < today && task.status !== 'done');
    const taskType = task.taskType || 'task';
    const assignee = project.members.find(m => m.userId === task.assigneeId)?.profile;

    const assigneeChipHtml = assignee
      ? `<span class="card-assignee-chip table-assignee-avatar" style="background: ${escapeHtml(assignee.avatarColor || '#f59e0b')};" title="${escapeHtml(assignee.displayName)}">${escapeHtml((assignee.displayName || assignee.email).charAt(0).toUpperCase())}</span>`
      : `<span class="table-assignee-empty">—</span>`;

    const memberOptions = [
      `<option value="" ${!task.assigneeId ? 'selected' : ''}>${t('task.modal.unassigned')}</option>`,
      ...project.members.map(
        m =>
          `<option value="${escapeHtml(m.userId)}" ${task.assigneeId === m.userId ? 'selected' : ''}>${escapeHtml(m.profile.displayName)}</option>`
      )
    ].join('');

    const sprintOptions = [
      `<option value="" ${!task.sprintId ? 'selected' : ''}>${t('sprint.backlog')}</option>`,
      ...project.sprints.map(
        s =>
          `<option value="${escapeHtml(s.id)}" ${task.sprintId === s.id ? 'selected' : ''}>${escapeHtml(s.name)}</option>`
      )
    ].join('');

    return `
      <tr class="beera-table-row" data-task-id="${escapeHtml(task.id)}">
        <td class="beera-td-key">
          <div class="table-key-cell">
            <span class="table-key-badge">${escapeHtml(task.id)}</span>
            <button type="button" class="table-open-btn" data-task-id="${escapeHtml(task.id)}" title="${t('table.openDetails')}">
              ${Icons.external(13)}
            </button>
          </div>
        </td>
        <td class="beera-td-title">
          <input
            type="text"
            class="table-inline-title"
            data-task-id="${escapeHtml(task.id)}"
            value="${escapeHtml(task.title)}"
          />
        </td>
        <td class="beera-td-type">
          <select class="table-inline-select table-type-select" data-task-id="${escapeHtml(task.id)}">
            <option value="task" ${taskType === 'task' ? 'selected' : ''}>${t('type.task')}</option>
            <option value="feature" ${taskType === 'feature' ? 'selected' : ''}>${t('type.feature')}</option>
            <option value="story" ${taskType === 'story' ? 'selected' : ''}>${t('type.story')}</option>
            <option value="bug" ${taskType === 'bug' ? 'selected' : ''}>${t('type.bug')}</option>
          </select>
        </td>
        <td class="beera-td-status">
          <select class="table-status-pill status-pill-${escapeHtml(task.status)}" data-task-id="${escapeHtml(task.id)}">
            <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>${t('column.todo')}</option>
            <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>${t('column.inprogress')}</option>
            <option value="review" ${task.status === 'review' ? 'selected' : ''}>${t('column.review')}</option>
            <option value="done" ${task.status === 'done' ? 'selected' : ''}>${t('column.done')}</option>
          </select>
        </td>
        <td class="beera-td-priority">
          <select class="table-priority-pill priority-pill-${escapeHtml(task.priority)}" data-task-id="${escapeHtml(task.id)}">
            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>${t('priority.low')}</option>
            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>${t('priority.medium')}</option>
            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>${t('priority.high')}</option>
            <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>${t('priority.urgent')}</option>
          </select>
        </td>
        <td class="beera-td-assignee">
          <div class="table-assignee-cell">
            ${assigneeChipHtml}
            <select class="table-inline-select table-assignee-select" data-task-id="${escapeHtml(task.id)}">
              ${memberOptions}
            </select>
          </div>
        </td>
        <td class="beera-td-sprint">
          <select class="table-inline-select table-sprint-select" data-task-id="${escapeHtml(task.id)}">
            ${sprintOptions}
          </select>
        </td>
        <td class="beera-td-points">
          <input
            type="number"
            min="0"
            max="100"
            class="table-points-input"
            data-task-id="${escapeHtml(task.id)}"
            value="${task.storyPoints || 0}"
          />
        </td>
        <td class="beera-td-date">
          <input
            type="date"
            class="table-date-input ${isOverdue ? 'overdue' : ''}"
            data-task-id="${escapeHtml(task.id)}"
            value="${escapeHtml(task.dueDate || '')}"
          />
        </td>
        <td class="beera-td-actions">
          <button type="button" class="table-row-delete" data-task-id="${escapeHtml(task.id)}" title="${t('task.modal.delete')}">
            ${Icons.trash(14)}
          </button>
        </td>
      </tr>
    `;
  }

  private render() {
    if (!this.container) return;

    const activeEl = document.activeElement as HTMLInputElement | null;
    const wasSearchFocused = activeEl?.id === 'table-search';
    const searchCursorPos = wasSearchFocused ? activeEl.selectionStart : null;

    const state = store.getState();
    const project = store.getActiveProject();

    if (!project) {
      this.renderEmptyState();
      return;
    }

    this.container.className = 'main-content';

    const activeSprint = store.getActiveSprint(project);
    const currentUserId = store.getCurrentUserId();

    const allTags = new Set<string>();
    project.tasks.forEach(task => task.tags.forEach(tag => allTags.add(tag)));

    const tagItemButtons = Array.from(allTags)
      .map(
        tag =>
          `<button type="button" class="beera-dropdown-item ${state.filters.tag === tag ? 'active' : ''}" data-value="${escapeHtml(tag)}">${escapeHtml(tag)}</button>`
      )
      .join('');

    const memberItemButtons = project.members
      .map(
        m =>
          `<button type="button" class="beera-dropdown-item ${state.filters.assignee === m.userId ? 'active' : ''}" data-value="${escapeHtml(m.userId)}">${escapeHtml(m.profile.displayName)}</button>`
      )
      .join('');

    let selectedPriorityLabel = t('board.filter.priority');
    if (state.filters.priority !== 'all') {
      selectedPriorityLabel = t('priority.' + state.filters.priority);
    }

    const selectedTagLabel = state.filters.tag === 'all' ? t('board.filter.tag') : state.filters.tag;

    let selectedAssigneeLabel = t('board.filter.assignee');
    if (state.filters.assignee === 'me') {
      selectedAssigneeLabel = t('board.filter.myTasks');
    } else if (state.filters.assignee !== 'all') {
      const assignedMember = project.members.find(m => m.userId === state.filters.assignee);
      if (assignedMember) selectedAssigneeLabel = assignedMember.profile.displayName;
    }

    const groupByLabel = `${t('table.groupBy')} ${t('table.group.' + this.groupBy)}`;

    let sprintBannerHtml = '';
    if (state.filters.boardScope === 'active_sprint') {
      if (activeSprint) {
        const sprintTasks = project.tasks.filter(task => task.sprintId === activeSprint.id);
        const totalPts = sprintTasks.reduce((s, item) => s + (item.storyPoints || 0), 0);
        const donePts = sprintTasks
          .filter(item => item.status === 'done')
          .reduce((s, item) => s + (item.storyPoints || 0), 0);
        const daysLeft = getSprintDaysRemaining(activeSprint);
        const daysLabel =
          daysLeft === null
            ? ''
            : daysLeft >= 0
            ? `${daysLeft} ${t('board.sprint.daysLeft')}`
            : t('board.sprint.overdue');

        sprintBannerHtml = `
          <div class="sprint-banner">
            <div class="sprint-banner-info">
              <span class="sprint-status-pill sprint-status-active">${t('sprint.status.active')}</span>
              <strong style="font-size: 0.98rem;">${escapeHtml(activeSprint.name)}</strong>
              ${activeSprint.goal ? `<span style="color: var(--text-secondary); font-size: 0.85rem;">— ${escapeHtml(activeSprint.goal)}</span>` : ''}
            </div>
            <div class="sprint-banner-meta">
              ${daysLabel ? `<span>${escapeHtml(daysLabel)}</span>` : ''}
              <span class="story-points-badge">${donePts}/${totalPts} ${t('sprint.points')}</span>
            </div>
          </div>
        `;
      } else {
        sprintBannerHtml = `
          <div class="sprint-banner">
            <div class="sprint-banner-info">
              <span style="color: var(--primary); display: flex;">${Icons.sprint(16)}</span>
              <span style="font-size: 0.88rem; color: var(--text-secondary);">${t('board.sprint.none')}</span>
            </div>
            <button type="button" class="btn btn-secondary" id="btn-table-go-backlog" style="padding: 5px 12px; font-size: 0.8rem;">
              ${t('nav.backlog')}
            </button>
          </div>
        `;
      }
    }

    const filteredTasks = this.getFilteredTasks(
      project.tasks,
      state.filters,
      activeSprint?.id,
      currentUserId
    );
    const groups = this.buildGroups(project, filteredTasks);

    const groupsHtml = groups
      .map(group => {
        const isCollapsed = this.collapsedGroups.has(group.key);
        const totalPoints = group.tasks.reduce((sum, item) => sum + (item.storyPoints || 0), 0);
        const rowsHtml =
          group.tasks.length > 0
            ? group.tasks.map(task => this.renderTaskRow(task, project)).join('')
            : `<tr><td colspan="10" class="table-empty-cell">${t('table.empty')}</td></tr>`;

        return `
          <div class="table-group-card ${isCollapsed ? 'collapsed' : ''}" data-group-key="${escapeHtml(group.key)}">
            <div class="table-group-header" data-toggle-group="${escapeHtml(group.key)}">
              <div class="table-group-title-wrap">
                <span class="table-group-chevron">${Icons.chevronDown(14)}</span>
                <span class="column-dot" style="background-color: ${group.dotColor};"></span>
                <span class="table-group-name">${escapeHtml(group.label)}</span>
                <span class="column-count">${group.tasks.length}</span>
              </div>
              <div class="table-group-meta">
                <span class="story-points-badge">${totalPoints} ${t('sprint.points')}</span>
              </div>
            </div>

            ${isCollapsed ? '' : `
              <div class="beera-table-scroll">
                <table class="beera-table">
                  <thead>
                    <tr>
                      <th class="sortable" data-sort="taskNum">${t('table.col.key')} ${this.renderSortArrow('taskNum')}</th>
                      <th class="sortable th-title" data-sort="title">${t('table.col.title')} ${this.renderSortArrow('title')}</th>
                      <th>${t('table.col.type')}</th>
                      <th class="sortable" data-sort="status">${t('table.col.status')} ${this.renderSortArrow('status')}</th>
                      <th class="sortable" data-sort="priority">${t('table.col.priority')} ${this.renderSortArrow('priority')}</th>
                      <th>${t('table.col.assignee')}</th>
                      <th>${t('table.col.sprint')}</th>
                      <th class="sortable" data-sort="storyPoints">${t('table.col.points')} ${this.renderSortArrow('storyPoints')}</th>
                      <th class="sortable" data-sort="dueDate">${t('table.col.dueDate')} ${this.renderSortArrow('dueDate')}</th>
                      <th class="th-actions"></th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rowsHtml}
                  </tbody>
                </table>
              </div>

              <div class="table-quick-add-wrap">
                <form class="table-quick-add-form" data-group-key="${escapeHtml(group.key)}">
                  <input
                    type="text"
                    class="table-quick-add-input"
                    placeholder="${t('table.addRow')}"
                    required
                  />
                </form>
              </div>
            `}
          </div>
        `;
      })
      .join('');

    this.container.innerHTML = `
      <div class="content-header">
        <div class="project-details-title">
          <span>${escapeHtml(project.icon)}</span>
          <span>${escapeHtml(project.name)}</span>
          <span class="project-key-title">${escapeHtml(project.key)}</span>
        </div>

        <div class="content-header-actions">
          <div class="board-mode-switcher">
            <button type="button" class="mode-pill ${state.filters.boardScope === 'all' ? 'active' : ''}" data-scope="all">
              ${t('board.mode.all')}
            </button>
            <button type="button" class="mode-pill ${state.filters.boardScope === 'active_sprint' ? 'active' : ''}" data-scope="active_sprint">
              ${t('board.mode.sprint')}
            </button>
          </div>
          <button type="button" class="btn btn-secondary" id="btn-table-share" style="padding: 8px 14px; font-size: 0.85rem;">
            ${Icons.users(15)}
            <span>${t('share.btn')}</span>
          </button>
        </div>
      </div>

      ${sprintBannerHtml}

      <div class="toolbar">
        <div class="toolbar-filters">
          <div class="search-input-wrapper">
            <span class="search-icon" style="display: flex; align-items: center;">${Icons.search(16)}</span>
            <input
              type="text"
              class="search-input"
              id="table-search"
              placeholder="${t('board.search')}"
              value="${escapeHtml(state.filters.search)}"
            />
          </div>

          <div class="beera-dropdown" id="table-dropdown-priority">
            <button type="button" class="beera-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
              <span class="beera-dropdown-label">${escapeHtml(selectedPriorityLabel)}</span>
              <span class="beera-dropdown-arrow">${Icons.chevronDown(13)}</span>
            </button>
            <div class="beera-dropdown-menu" role="listbox">
              <button type="button" class="beera-dropdown-item ${state.filters.priority === 'all' ? 'active' : ''}" data-value="all">${t('board.filter.priority')}</button>
              <button type="button" class="beera-dropdown-item ${state.filters.priority === 'low' ? 'active' : ''}" data-value="low">${t('priority.low')}</button>
              <button type="button" class="beera-dropdown-item ${state.filters.priority === 'medium' ? 'active' : ''}" data-value="medium">${t('priority.medium')}</button>
              <button type="button" class="beera-dropdown-item ${state.filters.priority === 'high' ? 'active' : ''}" data-value="high">${t('priority.high')}</button>
              <button type="button" class="beera-dropdown-item ${state.filters.priority === 'urgent' ? 'active' : ''}" data-value="urgent">${t('priority.urgent')}</button>
            </div>
          </div>

          <div class="beera-dropdown" id="table-dropdown-tag">
            <button type="button" class="beera-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
              <span class="beera-dropdown-label">${escapeHtml(selectedTagLabel)}</span>
              <span class="beera-dropdown-arrow">${Icons.chevronDown(13)}</span>
            </button>
            <div class="beera-dropdown-menu" role="listbox">
              <button type="button" class="beera-dropdown-item ${state.filters.tag === 'all' ? 'active' : ''}" data-value="all">${t('board.filter.tag')}</button>
              ${tagItemButtons}
            </div>
          </div>

          <div class="beera-dropdown" id="table-dropdown-assignee">
            <button type="button" class="beera-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
              <span class="beera-dropdown-label">${escapeHtml(selectedAssigneeLabel)}</span>
              <span class="beera-dropdown-arrow">${Icons.chevronDown(13)}</span>
            </button>
            <div class="beera-dropdown-menu" role="listbox">
              <button type="button" class="beera-dropdown-item ${state.filters.assignee === 'all' ? 'active' : ''}" data-value="all">${t('board.filter.assignee')}</button>
              ${currentUserId ? `<button type="button" class="beera-dropdown-item ${state.filters.assignee === 'me' ? 'active' : ''}" data-value="me">${t('board.filter.myTasks')}</button>` : ''}
              ${memberItemButtons}
            </div>
          </div>

          <div class="beera-dropdown" id="table-dropdown-groupby">
            <button type="button" class="beera-dropdown-trigger" aria-haspopup="listbox" aria-expanded="false">
              <span class="beera-dropdown-label">${escapeHtml(groupByLabel)}</span>
              <span class="beera-dropdown-arrow">${Icons.chevronDown(13)}</span>
            </button>
            <div class="beera-dropdown-menu" role="listbox">
              <button type="button" class="beera-dropdown-item ${this.groupBy === 'status' ? 'active' : ''}" data-value="status">${t('table.group.status')}</button>
              <button type="button" class="beera-dropdown-item ${this.groupBy === 'sprint' ? 'active' : ''}" data-value="sprint">${t('table.group.sprint')}</button>
              <button type="button" class="beera-dropdown-item ${this.groupBy === 'priority' ? 'active' : ''}" data-value="priority">${t('table.group.priority')}</button>
              <button type="button" class="beera-dropdown-item ${this.groupBy === 'none' ? 'active' : ''}" data-value="none">${t('table.group.none')}</button>
            </div>
          </div>
        </div>
      </div>

      <div class="table-viewport">
        ${groupsHtml}
      </div>
    `;

    this.bindEvents();

    if (wasSearchFocused) {
      const newSearch = this.container.querySelector('#table-search') as HTMLInputElement | null;
      if (newSearch) {
        newSearch.focus();
        if (searchCursorPos !== null) {
          newSearch.setSelectionRange(searchCursorPos, searchCursorPos);
        }
      }
    }
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

    if (this.handleOutsideClickBound) {
      document.removeEventListener('click', this.handleOutsideClickBound);
      this.handleOutsideClickBound = null;
    }

    // Mode switcher
    this.container.querySelectorAll('.mode-pill').forEach(btn => {
      btn.addEventListener('click', () => {
        const scope = btn.getAttribute('data-scope') as 'all' | 'active_sprint';
        if (scope) store.setFilters({ boardScope: scope });
      });
    });

    // Share / Backlog shortcuts
    this.container.querySelector('#btn-table-share')?.addEventListener('click', () => {
      window.dispatchEvent(new CustomEvent('open-share-modal'));
    });
    this.container.querySelector('#btn-table-go-backlog')?.addEventListener('click', () => {
      store.setView('backlog');
    });

    // Search
    this.container.querySelector('#table-search')?.addEventListener('input', e => {
      const val = (e.target as HTMLInputElement).value;
      store.setFilters({ search: val });
    });

    // Custom Dropdown triggers
    this.container.querySelectorAll('.beera-dropdown').forEach(dropdown => {
      const trigger = dropdown.querySelector('.beera-dropdown-trigger');
      trigger?.addEventListener('click', e => {
        e.stopPropagation();
        const isOpen = dropdown.classList.contains('open');
        this.container?.querySelectorAll('.beera-dropdown.open').forEach(d => {
          if (d !== dropdown) {
            d.classList.remove('open');
            d.querySelector('.beera-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
          }
        });
        dropdown.classList.toggle('open', !isOpen);
        trigger.setAttribute('aria-expanded', String(!isOpen));
      });
    });

    this.handleOutsideClickBound = (e: MouseEvent) => {
      this.container?.querySelectorAll('.beera-dropdown.open').forEach(d => {
        if (!d.contains(e.target as Node)) {
          d.classList.remove('open');
          d.querySelector('.beera-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
        }
      });
    };
    document.addEventListener('click', this.handleOutsideClickBound);

    this.container.querySelectorAll('#table-dropdown-priority .beera-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const val = item.getAttribute('data-value') as TaskPriority | 'all';
        store.setFilters({ priority: val });
      });
    });

    this.container.querySelectorAll('#table-dropdown-tag .beera-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const val = item.getAttribute('data-value') || 'all';
        store.setFilters({ tag: val });
      });
    });

    this.container.querySelectorAll('#table-dropdown-assignee .beera-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const val = item.getAttribute('data-value') || 'all';
        store.setFilters({ assignee: val });
      });
    });

    this.container.querySelectorAll('#table-dropdown-groupby .beera-dropdown-item').forEach(item => {
      item.addEventListener('click', () => {
        const val = item.getAttribute('data-value') as GroupByMode;
        if (val) {
          this.groupBy = val;
          this.collapsedGroups.clear();
          this.render();
        }
      });
    });

    // Group collapse toggles
    this.container.querySelectorAll('.table-group-header').forEach(header => {
      header.addEventListener('click', () => {
        const groupKey = header.getAttribute('data-toggle-group');
        if (groupKey === null) return;
        if (this.collapsedGroups.has(groupKey)) {
          this.collapsedGroups.delete(groupKey);
        } else {
          this.collapsedGroups.add(groupKey);
        }
        this.render();
      });
    });

    // Sortable headers
    this.container.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const field = th.getAttribute('data-sort') as SortField;
        if (!field) return;
        if (this.sortField === field) {
          this.sortAsc = !this.sortAsc;
        } else {
          this.sortField = field;
          this.sortAsc = true;
        }
        this.render();
      });
    });

    // Open TaskModal
    this.container.querySelectorAll('.table-open-btn').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        if (taskId) {
          window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { taskId } }));
        }
      });
    });

    // Inline Title editing
    this.container.querySelectorAll('.table-inline-title').forEach(inputEl => {
      const el = inputEl as HTMLInputElement;
      el.addEventListener('change', () => {
        const taskId = el.getAttribute('data-task-id');
        const nextTitle = el.value.trim();
        if (taskId && nextTitle) {
          store.updateTask(taskId, { title: nextTitle });
        }
      });
      el.addEventListener('keydown', e => {
        if (e.key === 'Enter') {
          e.preventDefault();
          el.blur();
        }
      });
    });

    // Inline Type change
    this.container.querySelectorAll('.table-type-select').forEach(sel => {
      sel.addEventListener('change', e => {
        const target = e.target as HTMLSelectElement;
        const taskId = target.getAttribute('data-task-id');
        if (taskId) store.updateTask(taskId, { taskType: target.value as TaskType });
      });
    });

    // Inline Status change
    this.container.querySelectorAll('.table-status-pill').forEach(sel => {
      sel.addEventListener('change', e => {
        const target = e.target as HTMLSelectElement;
        const taskId = target.getAttribute('data-task-id');
        if (taskId) store.updateTask(taskId, { status: target.value as TaskStatus });
      });
    });

    // Inline Priority change
    this.container.querySelectorAll('.table-priority-pill').forEach(sel => {
      sel.addEventListener('change', e => {
        const target = e.target as HTMLSelectElement;
        const taskId = target.getAttribute('data-task-id');
        if (taskId) store.updateTask(taskId, { priority: target.value as TaskPriority });
      });
    });

    // Inline Assignee change
    this.container.querySelectorAll('.table-assignee-select').forEach(sel => {
      sel.addEventListener('change', e => {
        const target = e.target as HTMLSelectElement;
        const taskId = target.getAttribute('data-task-id');
        if (taskId) store.updateTask(taskId, { assigneeId: target.value || null });
      });
    });

    // Inline Sprint change
    this.container.querySelectorAll('.table-sprint-select').forEach(sel => {
      sel.addEventListener('change', e => {
        const target = e.target as HTMLSelectElement;
        const taskId = target.getAttribute('data-task-id');
        if (taskId) store.assignTaskToSprint(taskId, target.value || null);
      });
    });

    // Inline Points change
    this.container.querySelectorAll('.table-points-input').forEach(inp => {
      inp.addEventListener('change', e => {
        const target = e.target as HTMLInputElement;
        const taskId = target.getAttribute('data-task-id');
        const pts = Math.max(0, Math.min(100, Number(target.value) || 0));
        if (taskId) store.updateTask(taskId, { storyPoints: pts });
      });
    });

    // Inline Due Date change
    this.container.querySelectorAll('.table-date-input').forEach(inp => {
      inp.addEventListener('change', e => {
        const target = e.target as HTMLInputElement;
        const taskId = target.getAttribute('data-task-id');
        if (taskId) store.updateTask(taskId, { dueDate: target.value || undefined });
      });
    });

    // Delete row
    this.container.querySelectorAll('.table-row-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        const taskId = btn.getAttribute('data-task-id');
        if (taskId && confirm(t('task.modal.delete.confirm'))) {
          store.deleteTask(taskId);
        }
      });
    });

    // Quick add row per group
    this.container.querySelectorAll('.table-quick-add-form').forEach(form => {
      form.addEventListener('submit', e => {
        e.preventDefault();
        const input = form.querySelector('.table-quick-add-input') as HTMLInputElement | null;
        const groupKey = form.getAttribute('data-group-key') ?? '';
        const title = input?.value.trim() || '';
        if (!title || !input) return;

        let targetStatus: TaskStatus = 'todo';
        let sprintIdOption: string | null | undefined = undefined;
        let targetPriority: TaskPriority | null = null;

        if (this.groupBy === 'status') {
          targetStatus = (groupKey as TaskStatus) || 'todo';
        } else if (this.groupBy === 'sprint') {
          sprintIdOption = groupKey === '' ? null : groupKey;
        } else if (this.groupBy === 'priority') {
          targetPriority = (groupKey as TaskPriority) || 'medium';
        }

        const created = store.addTask(title, targetStatus, { sprintId: sprintIdOption });
        if (created && targetPriority && created.priority !== targetPriority) {
          store.updateTask(created.id, { priority: targetPriority });
        }
        input.value = '';
      });
    });
  }
}

export default TableView;
