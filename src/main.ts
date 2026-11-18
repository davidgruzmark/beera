import { store } from './store';
import { t } from './i18n';
import { Sidebar } from './components/Sidebar';
import { Board } from './components/Board';
import { TableView } from './components/TableView';
import { Backlog } from './components/Backlog';
import { Dashboard } from './components/Dashboard';
import { TaskModal } from './components/TaskModal';
import { ShareModal } from './components/ShareModal';
import { AuthModal } from './components/AuthModal';
import { CommandPalette } from './components/CommandPalette';
import { Icons } from './components/Icons';
import { escapeHtml } from './utils';
import { SyncStatus } from './types';

class App {
  private sidebar: Sidebar;
  private board: Board;
  private tableView: TableView;
  private backlog: Backlog;
  private dashboard: Dashboard;
  private taskModal: TaskModal;
  private shareModal: ShareModal;
  private authModal: AuthModal;
  private commandPalette: CommandPalette;

  private currentMountedView: 'board' | 'table' | 'backlog' | 'dashboard' | null = null;

  constructor() {
    this.sidebar = new Sidebar();
    this.board = new Board();
    this.tableView = new TableView();
    this.backlog = new Backlog();
    this.dashboard = new Dashboard();
    this.taskModal = new TaskModal();
    this.shareModal = new ShareModal();
    this.authModal = new AuthModal();
    this.commandPalette = new CommandPalette();
  }

  public init() {
    // Mount Beera logo in top bar
    const logoMount = document.getElementById('top-bar-logo-mount');
    if (logoMount) {
      logoMount.innerHTML = Icons.beer(24);
    }

    // Mount Sidebar
    const sidebarMount = document.getElementById('sidebar-mount');
    const mobileMenuBtn = document.getElementById('btn-mobile-sidebar-toggle');
    const sidebarBackdrop = document.getElementById('sidebar-backdrop');

    if (sidebarMount) {
      this.sidebar.mount(sidebarMount);
    }

    if (mobileMenuBtn) {
      mobileMenuBtn.innerHTML = Icons.menu(20);
      mobileMenuBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = sidebarMount?.classList.contains('mobile-open');
        sidebarMount?.classList.toggle('mobile-open', !isOpen);
        sidebarBackdrop?.classList.toggle('active', !isOpen);
      });
    }

    const closeMobileSidebar = () => {
      sidebarMount?.classList.remove('mobile-open');
      sidebarBackdrop?.classList.remove('active');
    };

    sidebarBackdrop?.addEventListener('click', closeMobileSidebar);
    window.addEventListener('close-mobile-sidebar', closeMobileSidebar);

    // Mount Task Detail Modal
    const taskModalBackdrop = document.getElementById('task-modal-backdrop');
    if (taskModalBackdrop) {
      this.taskModal.mount(taskModalBackdrop);
    }

    // Mount Project Share / Team Modal
    const shareModalBackdrop = document.getElementById('share-modal-backdrop');
    if (shareModalBackdrop) {
      this.shareModal.mount(shareModalBackdrop);
    }

    // Mount Authentication Modal
    const authModalBackdrop = document.getElementById('auth-modal-backdrop');
    if (authModalBackdrop) {
      this.authModal.mount(authModalBackdrop);
    }

    // Mount Command Palette (Cmd+K / Ctrl+K)
    const cmdBackdrop = document.getElementById('cmd-palette-backdrop');
    if (cmdBackdrop) {
      this.commandPalette.mount(cmdBackdrop);
    }

    const cmdBtn = document.getElementById('btn-cmd-palette');
    const cmdIcon = document.getElementById('cmd-trigger-icon');
    if (cmdIcon) cmdIcon.innerHTML = Icons.search(14);
    cmdBtn?.addEventListener('click', () => {
      this.commandPalette.open();
    });

    // Profile Menu and Sign Out Trigger
    const profileContainer = document.getElementById('profile-menu-container');
    const avatarBtn = document.getElementById('top-bar-avatar');
    const profileSignOutBtn = document.getElementById('btn-profile-signout');

    if (avatarBtn && profileContainer) {
      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = profileContainer.classList.contains('open');
        profileContainer.classList.toggle('open', !isOpen);
        avatarBtn.setAttribute('aria-expanded', String(!isOpen));
      });

      document.addEventListener('click', (e) => {
        if (!profileContainer.contains(e.target as Node)) {
          profileContainer.classList.remove('open');
          avatarBtn.setAttribute('aria-expanded', 'false');
        }
      });

      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && profileContainer.classList.contains('open')) {
          profileContainer.classList.remove('open');
          avatarBtn.setAttribute('aria-expanded', 'false');
        }
      });
    }

    profileSignOutBtn?.addEventListener('click', () => {
      profileContainer?.classList.remove('open');
      void store.signOut();
    });

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

        // Switch to default board view so the new task is immediately in front of the user
        if (state.currentView !== 'board' && state.currentView !== 'table') {
          store.setView('board');
        }

        // Clear any filters that could hide the new task from the board
        if (state.filters.search || state.filters.priority !== 'all' || state.filters.tag !== 'all' || state.filters.assignee !== 'all') {
          store.setFilters({ search: '', priority: 'all', tag: 'all', assignee: 'all' });
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
      this.updateTopBarSyncStatus(state.syncStatus || 'synced', state.userEmail);
    });

    // Setup Project Creation Modal triggers & handlers
    this.setupProjectModal();
  }

  /**
   * Switches views (Kanban Board vs. Backlog & Sprints vs. Dashboard) based on state.
   * Cleans up the previous component to avoid memory leaks.
   */
  private updateView(view: 'board' | 'table' | 'backlog' | 'dashboard') {
    if (this.currentMountedView === view) return;

    const contentMount = document.getElementById('content-mount');
    if (!contentMount) return;

    // Unmount active view
    if (this.currentMountedView === 'board') {
      this.board.unmount();
    } else if (this.currentMountedView === 'table') {
      this.tableView.unmount();
    } else if (this.currentMountedView === 'backlog') {
      this.backlog.unmount();
    } else if (this.currentMountedView === 'dashboard') {
      this.dashboard.unmount();
    }

    // Mount new view
    if (view === 'board') {
      this.board.mount(contentMount);
    } else if (view === 'table') {
      this.tableView.mount(contentMount);
    } else if (view === 'backlog') {
      this.backlog.mount(contentMount);
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
    // Translate global Create Task button & Command Palette trigger
    const globalCreateText = document.getElementById('lbl-global-create-task');
    if (globalCreateText) {
      globalCreateText.textContent = store.getState().language === 'he' ? 'יצירת משימה' : 'Create Task';
    }
    const cmdTriggerText = document.getElementById('lbl-cmd-trigger');
    if (cmdTriggerText) {
      cmdTriggerText.textContent = t('cmd.trigger');
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
        <span>${escapeHtml(project.name)}</span>
      `;
      projectIndicator.style.display = 'flex';
    } else {
      projectIndicator.innerHTML = '';
      projectIndicator.style.display = 'none';
    }
  }

  private updateTopBarSyncStatus(syncStatus: SyncStatus, userEmail?: string | null) {
    const syncEl = document.getElementById('top-bar-sync-status');
    if (syncEl) {
      const dotColor =
        syncStatus === 'synced'
          ? 'hsl(var(--hsl-done))'
          : syncStatus === 'syncing'
          ? 'hsl(var(--hsl-inprogress))'
          : 'hsl(var(--hsl-urgent))';

      const label = t(`cloud.${syncStatus}`);
      syncEl.innerHTML = `
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${dotColor}; display: inline-block; box-shadow: 0 0 8px ${dotColor};"></span>
        <span>${escapeHtml(label)}</span>
      `;
      syncEl.style.display = 'inline-flex';
    }

    const userProfile = store.getState().currentUserProfile;
    const displayName = userProfile?.displayName || userEmail?.split('@')[0] || (store.getState().language === 'he' ? 'משתמש' : 'User');
    const initial = (displayName || userEmail || 'D').charAt(0).toUpperCase();

    const avatarEl = document.getElementById('top-bar-avatar');
    if (avatarEl) {
      avatarEl.textContent = initial;
      avatarEl.title = `${displayName} (${userEmail || ''})`;
    }

    const menuAvatar = document.getElementById('profile-menu-avatar-initial');
    if (menuAvatar) menuAvatar.textContent = initial;

    const menuName = document.getElementById('profile-menu-name');
    if (menuName) menuName.textContent = displayName;

    const menuEmail = document.getElementById('profile-menu-email');
    if (menuEmail) menuEmail.textContent = userEmail || '';

    const signoutIcon = document.getElementById('profile-signout-icon');
    if (signoutIcon) signoutIcon.innerHTML = Icons.logOut(14);

    const signoutLbl = document.getElementById('lbl-profile-signout');
    if (signoutLbl) signoutLbl.textContent = t('auth.signout');
  }
}

// Instantiate and start
const app = new App();
document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
export default app;
