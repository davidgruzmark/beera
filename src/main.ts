import { store } from './store';
import { t } from './i18n';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { Dashboard } from './components/Dashboard';
import { TaskModal } from './components/TaskModal';
import { Icons } from './components/Icons';

class App {
  private sidebar: Sidebar;
  private board: Board;
  private dashboard: Dashboard;
  private taskModal: TaskModal;

  private currentMountedView: 'board' | 'dashboard' | null = null;

  constructor() {
    this.sidebar = new Sidebar();
    this.board = new Board();
    this.dashboard = new Dashboard();
    this.taskModal = new TaskModal();
  }

  public init() {
    // Mount Beera logo in top bar
    const logoMount = document.getElementById('top-bar-logo-mount');
    if (logoMount) {
      logoMount.innerHTML = Icons.beer(24);
    }

    // Mount Sidebar
    const sidebarMount = document.getElementById('sidebar-mount');
    if (sidebarMount) {
      this.sidebar.mount(sidebarMount);
    }

    // Mount Task Detail Modal
    const taskModalBackdrop = document.getElementById('task-modal-backdrop');
    if (taskModalBackdrop) {
      this.taskModal.mount(taskModalBackdrop);
    }

    // Global Create Task Trigger
    const globalCreateBtn = document.getElementById('btn-global-create-task');
    if (globalCreateBtn) {
      const createIcon = document.getElementById('global-create-task-icon');
      if (createIcon) createIcon.innerHTML = Icons.plus(14);

      globalCreateBtn.addEventListener('click', () => {
        const state = store.getState();
        if (!state.activeProjectId) {
          const warning = state.language === 'he' 
            ? 'אנא צור פרויקט תחילה כדי להוסיף משימה.' 
            : 'Please create a project first to add a task.';
          alert(warning);
          // Auto-trigger project creation modal
          window.dispatchEvent(new CustomEvent('open-new-project-modal'));
          return;
        }
        
        const title = state.language === 'he' ? 'משימה חדשה' : 'New Task';
        const task = store.addTask(title, 'todo');
        if (task) {
          // Instantly focus and edit the newly created task
          window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { taskId: task.id } }));
        }
      });
    }

    // Subscribe to state changes for view orchestrations and translation updates
    store.subscribe((state) => {
      this.updateView(state.currentView);
      this.translateProjectModal();
      this.updateTopBarProject();
      this.updateTopBarSyncStatus(state.syncStatus || 'synced');
    });

    // Setup Project Creation Modal triggers & handlers
    this.setupProjectModal();
  }

  /**
   * Switches views (Kanban Board vs. Dashboard) based on state.
   * Cleans up the previous component to avoid memory leaks.
   */
  private updateView(view: 'board' | 'dashboard') {
    if (this.currentMountedView === view) return;

    const contentMount = document.getElementById('content-mount');
    if (!contentMount) return;

    // Unmount active view
    if (this.currentMountedView === 'board') {
      this.board.unmount();
    } else if (this.currentMountedView === 'dashboard') {
      this.dashboard.unmount();
    }

    // Mount new view
    if (view === 'board') {
      this.board.mount(contentMount);
    } else {
      this.dashboard.mount(contentMount);
    }

    this.currentMountedView = view;
  }

  /**
   * Binds modal triggers, escape keys, and submissions for Project Creation.
   */
  private setupProjectModal() {
    const backdrop = document.getElementById('project-modal-backdrop');
    const closeBtn = document.getElementById('btn-close-project-modal');
    const cancelBtn = document.getElementById('btn-cancel-project-modal');
    const form = document.getElementById('form-create-project') as HTMLFormElement;

    const openModal = () => {
      if (backdrop) {
        // Pre-fill a random emoji icon
        const icons = ['🚀', '💻', '🎨', '📊', '⚡', '🧠', '🎯', '🛠️', '📅', '📣', '🔒', '🌍', '🔑', '🏆', '📦', '💡', '🏷️', '💬', '👔', '🧩'];
        const randomIcon = icons[Math.floor(Math.random() * icons.length)];
        const iconInput = document.getElementById('project-icon-input') as HTMLInputElement;
        const emojiTrigger = document.getElementById('btn-emoji-picker-trigger');
        
        if (iconInput) iconInput.value = randomIcon;
        if (emojiTrigger) emojiTrigger.textContent = randomIcon;
        
        backdrop.classList.add('active');
        const nameInput = document.getElementById('project-name-input');
        if (nameInput) (nameInput as HTMLInputElement).focus();
      }
    };

    const closeModal = () => {
      if (backdrop) {
        backdrop.classList.remove('active');
        form.reset();
        const pickerPopup = document.getElementById('emoji-picker-popup');
        pickerPopup?.classList.remove('active');
      }
    };

    // Populate and bind Emoji Picker
    const emojis = ['🚀', '💻', '🎨', '📊', '⚡', '🧠', '🎯', '🛠️', '📅', '📣', '🔒', '🌍', '🔑', '🏆', '📦', '💡', '🏷️', '💬', '👔', '🧩'];
    const pickerPopup = document.getElementById('emoji-picker-popup');
    const emojiTrigger = document.getElementById('btn-emoji-picker-trigger');
    const iconInput = document.getElementById('project-icon-input') as HTMLInputElement;

    if (pickerPopup) {
      pickerPopup.innerHTML = emojis.map(emoji => `
        <div class="emoji-item" data-emoji="${emoji}">${emoji}</div>
      `).join('');

      // Select emoji
      pickerPopup.addEventListener('click', (e) => {
        const item = (e.target as HTMLElement).closest('.emoji-item');
        if (item) {
          const selectedEmoji = item.getAttribute('data-emoji') || '🚀';
          if (iconInput) iconInput.value = selectedEmoji;
          if (emojiTrigger) emojiTrigger.textContent = selectedEmoji;
          pickerPopup.classList.remove('active');
        }
      });
    }

    // Toggle emoji keyboard popup
    emojiTrigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      pickerPopup?.classList.toggle('active');
    });

    // Click outside closes emoji keyboard
    window.addEventListener('click', (e) => {
      if (pickerPopup && !pickerPopup.contains(e.target as Node) && e.target !== emojiTrigger) {
        pickerPopup.classList.remove('active');
      }
    });

    // Global triggers (from Sidebar click)
    window.addEventListener('open-new-project-modal', openModal);

    // Close actions
    [closeBtn, cancelBtn].forEach(btn => {
      btn?.addEventListener('click', closeModal);
    });

    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal();
    });

    // Escape key closes modals
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeModal();
      }
    });

    // Form submission
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      
      const nameInput = document.getElementById('project-name-input') as HTMLInputElement;
      const keyInput = document.getElementById('project-key-input') as HTMLInputElement;
      const iconInput = document.getElementById('project-icon-input') as HTMLInputElement;
      const descInput = document.getElementById('project-desc-input') as HTMLTextAreaElement;

      const name = nameInput.value.trim();
      const key = keyInput.value.trim().toUpperCase();
      const icon = iconInput.value.trim();
      const desc = descInput.value.trim();

      // Simple Validation
      const keyRegex = /^[A-Z]{2,6}$/;
      if (!name || !key || !keyRegex.test(key)) {
        alert(t('project.error.fields'));
        return;
      }

      // Create project
      const success = store.createProject(name, key, desc, icon);
      if (success) {
        closeModal();
      } else {
        alert(t('project.error.exists'));
      }
    });
  }

  /**
   * Translates elements inside the project modal markup in-place.
   */
  private translateProjectModal() {
    // Translate global Create Task button
    const globalCreateText = document.getElementById('lbl-global-create-task');
    if (globalCreateText) {
      globalCreateText.textContent = store.getState().language === 'he' ? 'יצירת משימה' : 'Create Task';
    }

    const elements = [
      { id: 'lbl-create-project-title', key: 'project.create.title' },
      { id: 'lbl-proj-name', key: 'project.name' },
      { id: 'lbl-proj-key', key: 'project.key' },
      { id: 'lbl-proj-icon', key: 'project.icon' },
      { id: 'lbl-proj-desc', key: 'project.desc' },
      { id: 'btn-cancel-project-modal', key: 'project.btn.cancel' },
      { id: 'btn-submit-project', key: 'project.btn.create' }
    ];

    elements.forEach(item => {
      const el = document.getElementById(item.id);
      if (el) {
        el.textContent = t(item.key);
      }
    });

    // Update placeholders
    const nameInput = document.getElementById('project-name-input') as HTMLInputElement;
    if (nameInput) {
      nameInput.placeholder = store.getState().language === 'he' ? 'למשל, משימת חלל אפולו' : 'e.g. Apollo Space Mission';
    }

    const keyInput = document.getElementById('project-key-input') as HTMLInputElement;
    if (keyInput) {
      keyInput.placeholder = store.getState().language === 'he' ? 'למשל, APO' : 'e.g. APO';
    }

    const descInput = document.getElementById('project-desc-input') as HTMLTextAreaElement;
    if (descInput) {
      descInput.placeholder = store.getState().language === 'he' ? 'פרטים קצרים על הפרויקט...' : 'Brief project details...';
    }
  }

  /**
   * Updates the project indicator in the top header bar in real-time.
   */
  private updateTopBarProject() {
    const projectIndicator = document.getElementById('top-bar-project-name');
    if (!projectIndicator) return;

    const project = store.getActiveProject();
    if (project) {
      projectIndicator.innerHTML = `
        <span style="display: flex; align-items: center; justify-content: center; color: var(--primary);">${Icons.project(16)}</span>
        <span>${project.name}</span>
      `;
      projectIndicator.style.display = 'flex';
    } else {
      projectIndicator.innerHTML = '';
      projectIndicator.style.display = 'none';
    }
  }

  private updateTopBarSyncStatus(syncStatus: 'synced' | 'syncing' | 'offline') {
    const syncEl = document.getElementById('top-bar-sync-status');
    if (!syncEl) return;

    const dotColor =
      syncStatus === 'synced'
        ? 'hsl(var(--hsl-done))'
        : syncStatus === 'syncing'
        ? 'hsl(var(--hsl-inprogress))'
        : 'hsl(var(--hsl-urgent))';

    const label = t(`cloud.${syncStatus}`);
    syncEl.innerHTML = `
      <span style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor}; display: inline-block; box-shadow: 0 0 8px ${dotColor};"></span>
      <span>${label}</span>
    `;
    syncEl.style.display = 'inline-flex';
  }
}

// Instantiate and start
const app = new App();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
export default app;
