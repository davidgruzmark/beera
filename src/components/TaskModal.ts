import { store } from '../store';
import { t } from '../i18n';
import { Task, TaskPriority, TaskStatus, TaskType, SubTask, Comment } from '../types';
import { Icons } from './Icons';
import { escapeHtml } from '../utils';

export class TaskModal {
  private backdrop: HTMLElement | null = null;
  private activeTaskId: string | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {}

  public mount(backdropElement: HTMLElement) {
    this.backdrop = backdropElement;
    this.bindGlobalEvents();
  }

  private bindGlobalEvents() {
    window.addEventListener('open-task-modal', (e: Event) => {
      const customEvent = e as CustomEvent<{ taskId: string }>;
      this.activeTaskId = customEvent.detail.taskId;
      this.open();
    });
  }

  private open() {
    if (!this.backdrop) return;

    // Subscribe to updates for this task specifically
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
    this.activeTaskId = null;
  }

  private render() {
    if (!this.backdrop || !this.activeTaskId) return;

    const project = store.getActiveProject();
    const task = project?.tasks.find(t => t.id === this.activeTaskId);

    // If task was deleted, close modal
    if (!task) {
      this.close();
      return;
    }

    const createdStr = new Date(task.createdAt).toLocaleString(store.getState().language === 'he' ? 'he-IL' : 'en-US');
    const updatedStr = new Date(task.updatedAt).toLocaleString(store.getState().language === 'he' ? 'he-IL' : 'en-US');

    // Generate checklist elements
    let subtasksHtml = '';
    task.subTasks.forEach(st => {
      subtasksHtml += `
        <div class="subtask-item ${st.completed ? 'completed' : ''}" data-subtask-id="${escapeHtml(st.id)}">
          <input 
            type="checkbox" 
            class="subtask-checkbox" 
            ${st.completed ? 'checked' : ''} 
          />
          <input 
            type="text" 
            class="subtask-title-input" 
            value="${escapeHtml(st.title)}" 
            placeholder="Subtask description..." 
          />
          <button class="subtask-delete-btn" title="Delete Subtask">✕</button>
        </div>
      `;
    });

    // Generate time tracking variables
    const logged = task.loggedHours || 0;
    const est = task.estimatedHours || 0;
    const timePct = est > 0 ? Math.min(Math.round((logged / est) * 100), 100) : 0;
    const isOverLogged = logged > est && est > 0;

    // Generate comments
    let commentsHtml = '';
    task.comments.forEach(c => {
      const commentTime = new Date(c.timestamp).toLocaleString(store.getState().language === 'he' ? 'he-IL' : 'en-US');
      commentsHtml += `
        <div class="comment-bubble">
          <div class="comment-meta">
            <span class="comment-author">${escapeHtml(c.author)}</span>
            <span>${escapeHtml(commentTime)}</span>
          </div>
          <div class="comment-text">${escapeHtml(c.text)}</div>
        </div>
      `;
    });

    const sprintOptions = [
      `<option value="" ${!task.sprintId ? 'selected' : ''}>${t('sprint.noSprint')}</option>`,
      ...(project?.sprints || [])
        .filter(s => s.status !== 'completed' || s.id === task.sprintId)
        .map(
          s =>
            `<option value="${escapeHtml(s.id)}" ${task.sprintId === s.id ? 'selected' : ''}>${escapeHtml(s.name)} (${t('sprint.status.' + s.status)})</option>`
        )
    ].join('');

    const assigneeOptions = [
      `<option value="" ${!task.assigneeId ? 'selected' : ''}>${t('task.modal.unassigned')}</option>`,
      ...(project?.members || []).map(
        m =>
          `<option value="${escapeHtml(m.userId)}" ${task.assigneeId === m.userId ? 'selected' : ''}>${escapeHtml(m.profile.displayName)} (${escapeHtml(m.profile.email)})</option>`
      )
    ].join('');

    const pointValues = [0, 1, 2, 3, 5, 8, 13, 21];
    const pointOptions = pointValues
      .map(
        pts =>
          `<option value="${pts}" ${(task.storyPoints || 0) === pts ? 'selected' : ''}>${pts} ${t('sprint.points')}</option>`
      )
      .join('');

    const taskType = task.taskType || 'task';

    this.backdrop.innerHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <div style="display: flex; align-items: center; gap: 12px;">
            <span class="project-key-title" style="font-size: 0.95rem;">${escapeHtml(task.id)}</span>
            <span style="font-size: 0.8rem; color: var(--text-muted);">
              ${t('task.modal.created')}: ${escapeHtml(createdStr)}
            </span>
          </div>
          <button class="modal-close-btn" id="modal-close">✕</button>
        </div>

        <div class="modal-body">
          <div class="task-detail-grid">
            
            <!-- Left Main Details Column -->
            <div class="task-detail-main">
              <!-- Editable Title -->
              <input 
                type="text" 
                class="task-modal-title" 
                id="task-title-edit" 
                value="${escapeHtml(task.title)}" 
                placeholder="Task Title"
              />

              <!-- Description -->
              <div class="form-group">
                <label class="form-label">${t('task.modal.desc')}</label>
                <textarea 
                  class="form-textarea" 
                  id="task-desc-edit" 
                  placeholder="${t('task.modal.desc.placeholder')}"
                >${escapeHtml(task.description || '')}</textarea>
              </div>

              <!-- Subtasks / Checklist -->
              <div class="form-group">
                <div class="subtasks-title-section">
                  <label class="form-label" style="display: inline-flex; align-items: center; gap: 6px;">
                    ${Icons.checklist(14)}
                    <span>${t('task.modal.subtasks')}</span>
                  </label>
                </div>
                <div class="subtasks-list">
                  ${subtasksHtml}
                </div>
                <form id="add-subtask-form" style="display: flex; gap: 8px;">
                  <input 
                    type="text" 
                    class="form-input" 
                    id="new-subtask-title" 
                    placeholder="${t('task.modal.subtask.add')}" 
                    required 
                  />
                  <button type="submit" class="btn btn-secondary" style="display: flex; align-items: center; justify-content: center; padding: 12px;">${Icons.plus(14)}</button>
                </form>
              </div>

              <!-- Comments Feed -->
              <div class="comments-section">
                <label class="form-label" style="display: inline-flex; align-items: center; gap: 6px;">
                  ${Icons.comment(14)}
                  <span>${t('task.modal.comments')}</span>
                </label>
                <div class="comment-input-area">
                  <textarea 
                    class="form-input" 
                    id="new-comment-text" 
                    placeholder="${t('task.modal.comment.add')}" 
                    style="min-height: 70px; resize: none;"
                  ></textarea>
                  <button class="btn btn-primary" id="btn-add-comment" style="align-self: flex-end;">
                    ${t('task.modal.comment.btn')}
                  </button>
                </div>
                <div class="comment-history">
                  ${commentsHtml || `<div style="text-align: center; color: var(--text-muted); padding: 16px; font-size: 0.9rem;">No activity yet.</div>`}
                </div>
              </div>
            </div>

            <!-- Right Sidebar Panel -->
            <div class="task-detail-aside">
              <div class="meta-aside-list">
                
                <!-- Issue Type Select -->
                <div class="form-group">
                  <label class="form-label">${t('task.modal.type')}</label>
                  <select class="form-select" id="task-type-edit">
                    <option value="task" ${taskType === 'task' ? 'selected' : ''}>${t('type.task')}</option>
                    <option value="feature" ${taskType === 'feature' ? 'selected' : ''}>${t('type.feature')}</option>
                    <option value="story" ${taskType === 'story' ? 'selected' : ''}>${t('type.story')}</option>
                    <option value="bug" ${taskType === 'bug' ? 'selected' : ''}>${t('type.bug')}</option>
                  </select>
                </div>

                <!-- Status Select -->
                <div class="form-group">
                  <label class="form-label">${t('task.modal.status')}</label>
                  <select class="form-select" id="task-status-edit">
                    <option value="todo" ${task.status === 'todo' ? 'selected' : ''}>${t('column.todo')}</option>
                    <option value="inprogress" ${task.status === 'inprogress' ? 'selected' : ''}>${t('column.inprogress')}</option>
                    <option value="review" ${task.status === 'review' ? 'selected' : ''}>${t('column.review')}</option>
                    <option value="done" ${task.status === 'done' ? 'selected' : ''}>${t('column.done')}</option>
                  </select>
                </div>

                <!-- Priority Select -->
                <div class="form-group">
                  <label class="form-label">${t('task.modal.priority')}</label>
                  <select class="form-select" id="task-priority-edit">
                    <option value="low" ${task.priority === 'low' ? 'selected' : ''}>${t('priority.low')}</option>
                    <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>${t('priority.medium')}</option>
                    <option value="high" ${task.priority === 'high' ? 'selected' : ''}>${t('priority.high')}</option>
                    <option value="urgent" ${task.priority === 'urgent' ? 'selected' : ''}>${t('priority.urgent')}</option>
                  </select>
                </div>

                <!-- Sprint Select -->
                <div class="form-group">
                  <label class="form-label">${t('task.modal.sprint')}</label>
                  <select class="form-select" id="task-sprint-edit">
                    ${sprintOptions}
                  </select>
                </div>

                <!-- Assignee Select -->
                <div class="form-group">
                  <label class="form-label">${t('task.modal.assignee')}</label>
                  <select class="form-select" id="task-assignee-edit">
                    ${assigneeOptions}
                  </select>
                </div>

                <!-- Story Points Select -->
                <div class="form-group">
                  <label class="form-label">${t('task.modal.storyPoints')}</label>
                  <select class="form-select" id="task-points-edit">
                    ${pointOptions}
                  </select>
                </div>

                <!-- Due Date Picker -->
                <div class="form-group">
                  <label class="form-label">${t('task.modal.dueDate')}</label>
                  <input 
                    type="date" 
                    class="form-input" 
                    id="task-duedate-edit" 
                    value="${escapeHtml(task.dueDate || '')}" 
                  />
                </div>

                <!-- Tags Input -->
                <div class="form-group">
                  <label class="form-label">${t('task.modal.tags')}</label>
                  <input 
                    type="text" 
                    class="form-input" 
                    id="task-tags-edit" 
                    value="${escapeHtml(task.tags.join(', '))}" 
                    placeholder="Engineering, Design" 
                  />
                </div>

                <!-- Time Tracking Section -->
                <div class="form-group" style="border-top: 1px solid var(--border-color); padding-top: 16px;">
                  <label class="form-label" style="display: inline-flex; align-items: center; gap: 6px;">
                    ${Icons.clock(14)}
                    <span>${t('task.modal.timeTracking')}</span>
                  </label>
                  <div style="display: flex; gap: 12px; margin-bottom: 8px;">
                    <div style="flex: 1;">
                      <span style="font-size: 0.8rem; color: var(--text-secondary);">${t('task.modal.time.estimated')}</span>
                      <input 
                        type="number" 
                        class="form-input" 
                        id="task-time-est" 
                        min="0" 
                        step="0.5" 
                        value="${task.estimatedHours}" 
                        style="padding: 8px;"
                      />
                    </div>
                    <div style="flex: 1;">
                      <span style="font-size: 0.8rem; color: var(--text-secondary);">${t('task.modal.time.logged')}</span>
                      <input 
                        type="number" 
                        class="form-input" 
                        id="task-time-logged" 
                        min="0" 
                        step="0.5" 
                        value="${task.loggedHours}" 
                        style="padding: 8px;"
                      />
                    </div>
                  </div>
                  
                  ${est > 0 || logged > 0 ? `
                    <div class="time-progress-container">
                      <div class="time-progress-header">
                        <span>${logged} / ${est} hours</span>
                        <span>${est > 0 ? Math.round((logged/est)*100) : 100}%</span>
                      </div>
                      <div class="time-progress-bar-bg">
                        <div 
                          class="time-progress-bar-fill" 
                          style="width: ${timePct}%; background-color: ${isOverLogged ? 'hsl(var(--hsl-urgent))' : 'var(--accent)'};"
                        ></div>
                      </div>
                    </div>
                  ` : ''}
                </div>

                <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 10px; border-top: 1px solid var(--border-color); padding-top: 10px;">
                  ${t('task.modal.updated')}: ${updatedStr}
                </div>

              </div>
            </div>

          </div>
        </div>

        <div class="modal-footer task-modal-footer" style="padding: 20px 32px; background: var(--bg-surface);">
          <button class="btn btn-danger" id="btn-delete-task" style="display: inline-flex; align-items: center; gap: 6px;">
            ${Icons.trash(14)}
            <span>${t('task.modal.delete')}</span>
          </button>
          <button class="btn btn-secondary" id="modal-footer-close">
            ${t('task.modal.close')}
          </button>
        </div>
      </div>
    `;

    this.bindFormEvents(task);
  }

  private bindFormEvents(task: Task) {
    if (!this.backdrop) return;

    // Close buttons
    const closeBtn = this.backdrop.querySelector('#modal-close');
    const footerCloseBtn = this.backdrop.querySelector('#modal-footer-close');
    [closeBtn, footerCloseBtn].forEach(btn => {
      btn?.addEventListener('click', () => this.close());
    });

    // Close on backdrop click (but not card click)
    this.backdrop.onclick = (e) => {
      if (e.target === this.backdrop) {
        this.close();
      }
    };

    // Edit Title (on blur or keydown Enter)
    const titleInput = this.backdrop.querySelector('#task-title-edit') as HTMLInputElement;
    titleInput?.addEventListener('blur', () => {
      const title = titleInput.value.trim();
      if (title && title !== task.title) {
        store.updateTask(task.id, { title });
      }
    });
    titleInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        titleInput.blur();
      }
    });

    // Edit Description (on blur)
    const descTextarea = this.backdrop.querySelector('#task-desc-edit') as HTMLTextAreaElement;
    descTextarea?.addEventListener('blur', () => {
      const description = descTextarea.value.trim();
      if (description !== task.description) {
        store.updateTask(task.id, { description });
      }
    });

    // Edit Issue Type
    const typeSelect = this.backdrop.querySelector('#task-type-edit') as HTMLSelectElement;
    typeSelect?.addEventListener('change', () => {
      const taskType = typeSelect.value as TaskType;
      store.updateTask(task.id, { taskType });
    });

    // Edit Status
    const statusSelect = this.backdrop.querySelector('#task-status-edit') as HTMLSelectElement;
    statusSelect?.addEventListener('change', () => {
      const status = statusSelect.value as TaskStatus;
      store.updateTask(task.id, { status });
    });

    // Edit Priority
    const prioritySelect = this.backdrop.querySelector('#task-priority-edit') as HTMLSelectElement;
    prioritySelect?.addEventListener('change', () => {
      const priority = prioritySelect.value as TaskPriority;
      store.updateTask(task.id, { priority });
    });

    // Edit Sprint
    const sprintSelect = this.backdrop.querySelector('#task-sprint-edit') as HTMLSelectElement;
    sprintSelect?.addEventListener('change', () => {
      const sprintId = sprintSelect.value || null;
      store.updateTask(task.id, { sprintId });
    });

    // Edit Assignee
    const assigneeSelect = this.backdrop.querySelector('#task-assignee-edit') as HTMLSelectElement;
    assigneeSelect?.addEventListener('change', () => {
      const assigneeId = assigneeSelect.value || null;
      store.updateTask(task.id, { assigneeId });
    });

    // Edit Story Points
    const pointsSelect = this.backdrop.querySelector('#task-points-edit') as HTMLSelectElement;
    pointsSelect?.addEventListener('change', () => {
      const storyPoints = parseInt(pointsSelect.value, 10) || 0;
      store.updateTask(task.id, { storyPoints });
    });

    // Edit Due Date
    const duedateInput = this.backdrop.querySelector('#task-duedate-edit') as HTMLInputElement;
    duedateInput?.addEventListener('change', () => {
      const dueDate = duedateInput.value || undefined;
      store.updateTask(task.id, { dueDate });
    });

    // Edit Tags (on blur)
    const tagsInput = this.backdrop.querySelector('#task-tags-edit') as HTMLInputElement;
    tagsInput?.addEventListener('blur', () => {
      const val = tagsInput.value.trim();
      const tags = val ? val.split(',').map(s => s.trim()).filter(s => s !== '') : [];
      // check if changed
      if (JSON.stringify(tags) !== JSON.stringify(task.tags)) {
        store.updateTask(task.id, { tags });
      }
    });
    tagsInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        tagsInput.blur();
      }
    });

    // Time Estimates
    const timeEstInput = this.backdrop.querySelector('#task-time-est') as HTMLInputElement;
    timeEstInput?.addEventListener('change', () => {
      const estimatedHours = Math.max(0, parseFloat(timeEstInput.value) || 0);
      store.updateTask(task.id, { estimatedHours });
    });

    // Time Logged
    const timeLoggedInput = this.backdrop.querySelector('#task-time-logged') as HTMLInputElement;
    timeLoggedInput?.addEventListener('change', () => {
      const loggedHours = Math.max(0, parseFloat(timeLoggedInput.value) || 0);
      store.updateTask(task.id, { loggedHours });
    });

    // Subtasks Checkbox Toggle & Title editing
    this.backdrop.querySelectorAll('.subtask-item').forEach(item => {
      const subtaskId = item.getAttribute('data-subtask-id');
      if (!subtaskId) return;

      const checkbox = item.querySelector('.subtask-checkbox') as HTMLInputElement;
      checkbox?.addEventListener('change', () => {
        const subTasks = task.subTasks.map(st => 
          st.id === subtaskId ? { ...st, completed: checkbox.checked } : st
        );
        store.updateTask(task.id, { subTasks });
      });

      const titleInput = item.querySelector('.subtask-title-input') as HTMLInputElement;
      titleInput?.addEventListener('blur', () => {
        const title = titleInput.value.trim();
        if (title) {
          const subTasks = task.subTasks.map(st => 
            st.id === subtaskId ? { ...st, title } : st
          );
          store.updateTask(task.id, { subTasks });
        }
      });

      const delBtn = item.querySelector('.subtask-delete-btn');
      delBtn?.addEventListener('click', () => {
        const subTasks = task.subTasks.filter(st => st.id !== subtaskId);
        store.updateTask(task.id, { subTasks });
      });
    });

    // Add Subtask
    const addSubtaskForm = this.backdrop.querySelector('#add-subtask-form');
    addSubtaskForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = this.backdrop?.querySelector('#new-subtask-title') as HTMLInputElement;
      const title = input?.value.trim();
      if (title) {
        const newSub: SubTask = {
          id: 'sub-' + Date.now(),
          title,
          completed: false
        };
        const subTasks = [...task.subTasks, newSub];
        store.updateTask(task.id, { subTasks });
        input.value = '';
      }
    });

    // Add Comment
    const addCommentBtn = this.backdrop.querySelector('#btn-add-comment');
    const commentInput = this.backdrop.querySelector('#new-comment-text') as HTMLTextAreaElement;
    
    const submitComment = () => {
      const text = commentInput.value.trim();
      if (text) {
        const currentState = store.getState();
        const author =
          currentState.currentUserProfile?.displayName ||
          currentState.userEmail ||
          (currentState.language === 'he' ? 'משתמש' : 'Member');
        const newComment: Comment = {
          id: 'comment-' + Date.now(),
          text,
          author,
          timestamp: Date.now()
        };
        const comments = [newComment, ...task.comments];
        store.updateTask(task.id, { comments });
        commentInput.value = '';
      }
    };

    addCommentBtn?.addEventListener('click', submitComment);
    commentInput?.addEventListener('keydown', (e) => {
      // CMD/CTRL + Enter to comment
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        submitComment();
      }
    });

    // Delete Task Button
    const deleteBtn = this.backdrop.querySelector('#btn-delete-task');
    deleteBtn?.addEventListener('click', () => {
      if (confirm(t('task.modal.delete.confirm'))) {
        store.deleteTask(task.id);
        this.close();
      }
    });
  }
}
