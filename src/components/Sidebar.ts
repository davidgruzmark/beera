import { store } from '../store';
import { t } from '../i18n';
import { Icons } from './Icons';
import { escapeHtml } from '../utils';

export class Sidebar {
  private container: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;

  constructor() {}

  public mount(container: HTMLElement) {
    this.container = container;
    
    // Read saved width and apply as CSS custom property
    const savedWidth = localStorage.getItem('beera_sidebar_width');
    if (savedWidth) {
      document.documentElement.style.setProperty('--sidebar-width', savedWidth);
    }

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
    const activeProjectId = state.activeProjectId;

    this.container.className = 'sidebar';
    
    let projectsHtml = '';
    state.projects.forEach(project => {
      const isActive = project.id === activeProjectId;
      projectsHtml += `
        <div class="project-item ${isActive ? 'active' : ''}" data-project-id="${escapeHtml(project.id)}">
          <div class="project-item-meta">
            <span class="project-icon" style="display: flex; color: var(--primary);">${Icons.project(16)}</span>
            <span class="project-name" title="${escapeHtml(project.name)}">${escapeHtml(project.name)}</span>
            <span class="project-key-badge">${escapeHtml(project.key)}</span>
          </div>
          ${state.projects.length > 1 ? `
            <button class="project-delete-btn" data-project-id="${escapeHtml(project.id)}" title="${t('task.modal.delete')}">
              ✕
            </button>
          ` : ''}
        </div>
      `;
    });

    const activeView = state.currentView;

    this.container.innerHTML = `
      <div class="sidebar-nav" style="margin-top: 0;">
        <div class="nav-item ${activeView === 'board' ? 'active' : ''}" data-view="board">
          <span style="display: flex; color: currentColor;">${Icons.board(18)}</span>
          <span>${t('nav.board')}</span>
        </div>
        <div class="nav-item ${activeView === 'dashboard' ? 'active' : ''}" data-view="dashboard">
          <span style="display: flex; color: currentColor;">${Icons.dashboard(18)}</span>
          <span>${t('nav.dashboard')}</span>
        </div>
        
        <div class="projects-section-title-wrap" style="display: flex; justify-content: space-between; align-items: center;">
          <div class="projects-section-title">${t('nav.projects')}</div>
          <button class="btn-text" id="btn-new-project" style="display: flex; align-items: center; justify-content: center; cursor: pointer; padding: 4px; border-radius: 4px;" title="${t('nav.newProject')}">
            ${Icons.plus(16)}
          </button>
        </div>
        
        <div class="project-list">
          ${projectsHtml || `<div style="padding: 12px; color: var(--text-muted); font-size: 0.9rem;">${t('project.empty.desc')}</div>`}
        </div>
      </div>
      
      <div class="sidebar-footer">
        <div class="toggle-controls">
          <button class="toggle-btn" id="btn-toggle-lang" title="${t('nav.lang.' + (state.language === 'en' ? 'he' : 'en'))}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            ${Icons.globe(14)}
            <span>${state.language === 'en' ? 'עברית' : 'English'}</span>
          </button>
          <button class="toggle-btn" id="btn-toggle-theme" title="${t('nav.theme.' + (state.theme === 'dark' ? 'light' : 'dark'))}" style="display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            ${state.theme === 'dark' ? Icons.sun(14) : Icons.moon(14)}
            <span>${state.theme === 'dark' ? t('nav.theme.light') : t('nav.theme.dark')}</span>
          </button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button class="btn btn-secondary" id="btn-export-data" style="flex: 1; padding: 8px; font-size: 0.8rem; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            ${Icons.export(12)}
            <span>${t('nav.export')}</span>
          </button>
          <button class="btn btn-secondary" id="btn-import-data" style="flex: 1; padding: 8px; font-size: 0.8rem; display: inline-flex; align-items: center; justify-content: center; gap: 6px;">
            ${Icons.import(12)}
            <span>${t('nav.import')}</span>
          </button>
        </div>
        <input type="file" id="import-file-input" style="display: none;" accept=".json" />
      </div>
      <div class="sidebar-resizer" id="sidebar-resizer"></div>
    `;

    this.bindEvents();
  }

  private bindEvents() {
    if (!this.container) return;

    // View switcher (board vs dashboard)
    this.container.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view') as 'board' | 'dashboard';
        store.setView(view);
      });
    });

    // Project switching
    this.container.querySelectorAll('.project-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const target = e.target as HTMLElement;
        // Don't switch project if delete button was clicked
        if (target.classList.contains('project-delete-btn')) return;

        const projectId = item.getAttribute('data-project-id');
        if (projectId) {
          store.setActiveProject(projectId);
        }
      });
    });

    // Delete project
    this.container.querySelectorAll('.project-delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const projectId = btn.getAttribute('data-project-id');
        if (projectId) {
          const project = store.getState().projects.find(p => p.id === projectId);
          const name = project ? project.name : '';
          const confirmMsg = store.getState().language === 'he' 
            ? `האם למחוק את הפרויקט "${name}" ואת כל משימותיו?`
            : `Are you sure you want to delete project "${name}" and all its tasks?`;
          if (confirm(confirmMsg)) {
            store.deleteProject(projectId);
          }
        }
      });
    });

    // Toggle Language
    const langBtn = this.container.querySelector('#btn-toggle-lang');
    if (langBtn) {
      langBtn.addEventListener('click', () => {
        store.toggleLanguage();
      });
    }

    // Toggle Theme
    const themeBtn = this.container.querySelector('#btn-toggle-theme');
    if (themeBtn) {
      themeBtn.addEventListener('click', () => {
        store.toggleTheme();
      });
    }

    // New Project Modal open trigger (global event)
    const newProjectBtn = this.container.querySelector('#btn-new-project');
    if (newProjectBtn) {
      newProjectBtn.addEventListener('click', () => {
        window.dispatchEvent(new CustomEvent('open-new-project-modal'));
      });
    }

    // Export Data
    const exportBtn = this.container.querySelector('#btn-export-data');
    if (exportBtn) {
      exportBtn.addEventListener('click', () => {
        const dataStr = store.exportData();
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `antigravity-jira-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      });
    }

    // Import Data
    const importBtn = this.container.querySelector('#btn-import-data');
    const importInput = this.container.querySelector('#import-file-input') as HTMLInputElement;
    if (importBtn && importInput) {
      importBtn.addEventListener('click', () => {
        importInput.click();
      });

      importInput.addEventListener('change', () => {
        const file = importInput.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
          const content = e.target?.result as string;
          const success = store.importData(content);
          if (success) {
            alert(t('nav.importSuccess'));
          } else {
            alert(t('nav.importError'));
          }
        };
        reader.readAsText(file);
      });
    }

    // Initialize sidebar resizing listeners
    this.setupResizer();
  }

  /**
   * Binds custom col-resize dragging event listeners to the edge handle.
   * Calculates delta constraints and handles LTR/RTL drag inversion automatically.
   */
  private setupResizer() {
    if (!this.container) return;
    const resizer = this.container.querySelector('#sidebar-resizer') as HTMLElement;
    if (!resizer) return;

    let startX = 0;
    let startWidth = 0;

    const onMouseMove = (e: MouseEvent) => {
      const deltaX = e.clientX - startX;
      const isRtl = document.documentElement.dir === 'rtl';
      // In RTL, dragging left (negative deltaX) increases width, dragging right decreases width
      const multiplier = isRtl ? -1 : 1;
      const newWidth = startWidth + deltaX * multiplier;
      
      // Limit sidebar width between 200px and 480px to protect responsive column layout
      const constrainedWidth = Math.max(200, Math.min(480, newWidth));
      
      document.documentElement.style.setProperty('--sidebar-width', `${constrainedWidth}px`);
      localStorage.setItem('beera_sidebar_width', `${constrainedWidth}px`);
    };

    const onMouseUp = () => {
      resizer.classList.remove('dragging');
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      
      // Re-enable text selection and clear global cursor lock
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };

    resizer.addEventListener('mousedown', (e) => {
      e.preventDefault(); // prevent unwanted text highlighting during resize
      startX = e.clientX;
      startWidth = this.container!.getBoundingClientRect().width;
      resizer.classList.add('dragging');
      
      // Lock global document cursor and disable selection
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';

      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    });
  }
}
