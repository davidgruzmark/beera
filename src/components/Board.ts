import { store } from '../store';
import { t } from '../i18n';
import { Task, TaskPriority, TaskStatus, AppFilters } from '../types';
import { Icons } from './Icons';

export class Board {
  private container: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;
  private activeDragTaskId: string | null = null;

  constructor() {}

  public mount(container: HTMLElement) {
    this.container = container;
    this.unsubscribe = store.subscribe(() => this.render());
  }

  public unmount() {
    if (this.unsubscribe) {
      this.unsubscribe();
      this.unsubscribe = null;
    }
  }

  private render() {
    if (!this.container) return;

    const state = store.getState();
    const project = store.getActiveProject();

    if (!project) {
      this.renderEmptyState();
      return;
    }

    this.container.className = 'main-content';

    // Get unique tags for filter dropdown
    const allTags = new Set<string>();
    project.tasks.forEach(t => t.tags.forEach(tag => allTags.add(tag)));
    
    const tagOptions = Array.from(allTags).map(tag => 
      `<option value="${tag}" ${state.filters.tag === tag ? 'selected' : ''}>${tag}</option>`
    ).join('');

    // Headers and Toolbar HTML
    let html = `
      <div class="content-header">
        <div class="project-details-title">
          <span>${project.icon}</span>
          <span>${project.name}</span>
          <span class="project-key-title">${project.key}</span>
        </div>
      </div>

      <!-- Toolbar with Search and Filters -->
      <div class="toolbar">
        <div class="toolbar-filters">
          <div class="search-input-wrapper">
            <span class="search-icon" style="display: flex; align-items: center;">${Icons.search(16)}</span>
            <input 
              type="text" 
              class="search-input" 
              id="board-search" 
              placeholder="${t('board.search')}" 
              value="${state.filters.search}" 
            />
          </div>

          <select class="select-filter" id="filter-priority">
            <option value="all" ${state.filters.priority === 'all' ? 'selected' : ''}>${t('board.filter.priority')}</option>
            <option value="low" ${state.filters.priority === 'low' ? 'selected' : ''}>${t('priority.low')}</option>
            <option value="medium" ${state.filters.priority === 'medium' ? 'selected' : ''}>${t('priority.medium')}</option>
            <option value="high" ${state.filters.priority === 'high' ? 'selected' : ''}>${t('priority.high')}</option>
            <option value="urgent" ${state.filters.priority === 'urgent' ? 'selected' : ''}>${t('priority.urgent')}</option>
          </select>

          <select class="select-filter" id="filter-tag">
            <option value="all" ${state.filters.tag === 'all' ? 'selected' : ''}>${t('board.filter.tag')}</option>
            ${tagOptions}
          </select>
        </div>
      </div>

      <!-- Board columns viewport -->
      <div class="board-viewport">
    `;

    // Define columns
    const columns: { id: TaskStatus; name: string }[] = [
      { id: 'todo', name: t('column.todo') },
      { id: 'inprogress', name: t('column.inprogress') },
      { id: 'review', name: t('column.review') },
      { id: 'done', name: t('column.done') }
    ];

    // Filter tasks
    const filteredTasks = this.getFilteredTasks(project.tasks, state.filters);

    columns.forEach(col => {
      const colTasks = filteredTasks.filter(task => task.status === col.id);
      
      let cardsHtml = '';
      colTasks.forEach(task => {
        cardsHtml += this.renderTaskCard(task);
      });

      html += `
        <div class="column column-${col.id}" data-column-status="${col.id}">
          <div class="column-header">
            <div class="column-title-wrap">
              <span class="column-dot"></span>
              <span class="column-name">${col.name}</span>
            </div>
            <span class="column-count">${colTasks.length}</span>
          </div>
          
          <div class="task-list-container" data-status="${col.id}">
            ${cardsHtml}
          </div>

          <!-- Quick Add Task at bottom of column -->
          <div class="quick-add-container">
            <form class="quick-add-form" data-status="${col.id}">
              <input 
                type="text" 
                class="quick-add-input" 
                placeholder="＋ ${t('board.task.add')}..." 
                required 
              />
            </form>
          </div>
        </div>
      `;
    });

    html += `
      </div>
    `;

    this.container.innerHTML = html;
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

    const createBtn = this.container.querySelector('#btn-empty-create-project');
    if (createBtn) {
      createBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('open-new-project-modal'));
      });
    }
  }

  private getFilteredTasks(tasks: Task[], filters: AppFilters): Task[] {
    return tasks.filter(task => {
      // Search text match
      const query = filters.search.toLowerCase().trim();
      const matchesSearch = query === '' || 
        task.title.toLowerCase().includes(query) || 
        task.description.toLowerCase().includes(query) ||
        task.id.toLowerCase().includes(query);

      // Priority match
      const matchesPriority = filters.priority === 'all' || task.priority === filters.priority;

      // Tag match
      const matchesTag = filters.tag === 'all' || task.tags.includes(filters.tag);

      return matchesSearch && matchesPriority && matchesTag;
    });
  }

  private renderTaskCard(task: Task): string {
    // Due Date alert
    let dueDateHtml = '';
    if (task.dueDate) {
      const today = new Date().toISOString().split('T')[0];
      const isOverdue = task.dueDate < today && task.status !== 'done';
      dueDateHtml = `
        <div class="due-date-indicator ${isOverdue ? 'overdue' : ''}" style="display: inline-flex; align-items: center; gap: 4px;">
          <span style="display: flex;">${Icons.calendar(12)}</span>
          <span>${task.dueDate}</span>
          ${isOverdue ? `<span style="color: hsl(var(--hsl-urgent)); display: flex;">${Icons.alert(12)}</span>` : ''}
        </div>
      `;
    }

    // Subtasks Progress
    let progressHtml = '';
    if (task.subTasks.length > 0) {
      const completed = task.subTasks.filter(st => st.completed).length;
      const pct = Math.round((completed / task.subTasks.length) * 100);
      progressHtml = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 10px; font-size: 0.75rem; color: var(--text-secondary);">
          <span style="display: inline-flex; align-items: center; gap: 4px;">
            ${Icons.checklist(12)}
            <span>${completed}/${task.subTasks.length}</span>
          </span>
          <span>${pct}%</span>
        </div>
        <div class="card-progress-bar-container">
          <div class="card-progress-bar" style="width: ${pct}%;"></div>
        </div>
      `;
    }

    // Time logged vs estimated
    let timeHtml = '';
    if (task.estimatedHours > 0 || task.loggedHours > 0) {
      timeHtml = `
        <div class="meta-group" title="${t('task.modal.timeTracking')}" style="display: inline-flex; align-items: center; gap: 4px;">
          ${Icons.clock(12)}
          <span>${task.loggedHours}/${task.estimatedHours}h</span>
        </div>
      `;
    }

    // Comments count
    let commentsHtml = '';
    if (task.comments.length > 0) {
      commentsHtml = `
        <div class="meta-group" style="display: inline-flex; align-items: center; gap: 4px;">
          ${Icons.comment(12)}
          <span>${task.comments.length}</span>
        </div>
      `;
    }

    // Tags
    let tagsHtml = '';
    if (task.tags.length > 0) {
      tagsHtml = `<div class="task-card-tags">`;
      task.tags.slice(0, 3).forEach(tag => {
        tagsHtml += `<span class="tag-badge">${tag}</span>`;
      });
      tagsHtml += `</div>`;
    }

    return `
      <div class="task-card" draggable="true" data-task-id="${task.id}">
        <div class="task-card-header">
          <span class="task-card-key">${task.id}</span>
          <span class="badge-priority badge-priority-${task.priority}">
            ${t('priority.' + task.priority)}
          </span>
        </div>
        <div class="task-card-title">${task.title}</div>
        
        ${tagsHtml}
        
        ${progressHtml}

        <div class="task-card-meta">
          ${dueDateHtml}
          <div style="display: flex; gap: 10px;">
            ${timeHtml}
            ${commentsHtml}
          </div>
        </div>
      </div>
    `;
  }

  private bindEvents() {
    if (!this.container) return;

    // Search filter
    const searchInput = this.container.querySelector('#board-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const val = (e.target as HTMLInputElement).value;
        store.setFilters({ search: val });
      });
    }

    // Priority filter
    const prioritySelect = this.container.querySelector('#filter-priority');
    if (prioritySelect) {
      prioritySelect.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value as TaskPriority | 'all';
        store.setFilters({ priority: val });
      });
    }

    // Tag filter
    const tagSelect = this.container.querySelector('#filter-tag');
    if (tagSelect) {
      tagSelect.addEventListener('change', (e) => {
        const val = (e.target as HTMLSelectElement).value;
        store.setFilters({ tag: val });
      });
    }

    // Task Card Click (to edit/view details)
    this.container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('click', () => {
        const taskId = card.getAttribute('data-task-id');
        if (taskId) {
          window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { taskId } }));
        }
      });
    });

    // Inline task creation
    this.container.querySelectorAll('.quick-add-form').forEach(form => {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const input = form.querySelector('.quick-add-input') as HTMLInputElement;
        const status = form.getAttribute('data-status') as TaskStatus;
        const title = input.value.trim();
        if (title && status) {
          store.addTask(title, status);
          input.value = '';
        }
      });
    });

    // Drag and Drop Event Binding
    this.container.querySelectorAll('.task-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        const dragEvent = e as DragEvent;
        this.activeDragTaskId = card.getAttribute('data-task-id');
        card.classList.add('dragging');
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.effectAllowed = 'move';
          dragEvent.dataTransfer.setData('text/plain', this.activeDragTaskId || '');
        }
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        this.activeDragTaskId = null;
      });
    });

    this.container.querySelectorAll('.column').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault(); // necessary to allow drop
        const dragEvent = e as DragEvent;
        if (dragEvent.dataTransfer) {
          dragEvent.dataTransfer.dropEffect = 'move';
        }
        column.classList.add('drag-over');
      });

      column.addEventListener('dragleave', () => {
        column.classList.remove('drag-over');
      });

      column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');
        const dragEvent = e as DragEvent;
        const taskId = dragEvent.dataTransfer?.getData('text/plain') || this.activeDragTaskId;
        const targetStatus = column.getAttribute('data-column-status') as TaskStatus;
        
        if (taskId && targetStatus) {
          // If dropped directly on another card in that list, we can place it near it
          const dropTargetCard = (e.target as HTMLElement).closest('.task-card');
          if (dropTargetCard) {
            const targetTaskId = dropTargetCard.getAttribute('data-task-id');
            const project = store.getActiveProject();
            if (project && targetTaskId) {
              const colTasks = project.tasks.filter(t => t.status === targetStatus);
              const targetIndex = colTasks.findIndex(t => t.id === targetTaskId);
              store.moveTask(taskId, targetStatus, targetIndex);
              return;
            }
          }
          store.moveTask(taskId, targetStatus);
        }
      });
    });
  }
}
