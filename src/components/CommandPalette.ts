import { store } from '../store';
import { t } from '../i18n';
import { Icons } from './Icons';
import { escapeHtml } from '../utils';

interface CommandItem {
  id: string;
  category: string;
  title: string;
  subtitle?: string;
  badge?: string;
  shortcut?: string;
  iconHtml: string;
  action: () => void;
}

export class CommandPalette {
  private backdrop: HTMLElement | null = null;
  private isOpen = false;
  private query = '';
  private selectedIndex = 0;
  private filteredItems: CommandItem[] = [];

  private handleKeyDownBound = (e: KeyboardEvent) => this.onGlobalKeyDown(e);
  private handleOpenEventBound = () => this.open();

  public mount(backdropElement: HTMLElement) {
    this.backdrop = backdropElement;
    document.addEventListener('keydown', this.handleKeyDownBound);
    window.addEventListener('open-command-palette', this.handleOpenEventBound);
  }

  public unmount() {
    document.removeEventListener('keydown', this.handleKeyDownBound);
    window.removeEventListener('open-command-palette', this.handleOpenEventBound);
    if (this.backdrop) {
      this.backdrop.classList.remove('active');
      this.backdrop.innerHTML = '';
      this.backdrop = null;
    }
  }

  public open() {
    if (!this.backdrop) return;
    const state = store.getState();
    if (state.syncStatus === 'unauthenticated') return;

    this.isOpen = true;
    this.query = '';
    this.selectedIndex = 0;
    this.backdrop.classList.add('active');
    this.renderShell();
    this.renderResults();

    const input = this.backdrop.querySelector('#cmd-search-input') as HTMLInputElement | null;
    requestAnimationFrame(() => input?.focus());
  }

  public close() {
    if (!this.backdrop) return;
    this.isOpen = false;
    this.backdrop.classList.remove('active');
  }

  public toggle() {
    if (this.isOpen) {
      this.close();
    } else {
      this.open();
    }
  }

  private onGlobalKeyDown(e: KeyboardEvent) {
    const state = store.getState();
    if (state.syncStatus === 'unauthenticated') return;

    // Cmd+K / Ctrl+K (also supports KeyK when keyboard layout is Hebrew)
    if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === 'k' || e.code === 'KeyK')) {
      e.preventDefault();
      this.toggle();
      return;
    }

    if (this.isOpen) {
      if (e.key === 'Escape') {
        e.preventDefault();
        this.close();
        return;
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (this.filteredItems.length > 0) {
          this.selectedIndex = (this.selectedIndex + 1) % this.filteredItems.length;
          this.updateSelectionHighlight();
        }
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (this.filteredItems.length > 0) {
          this.selectedIndex =
            (this.selectedIndex - 1 + this.filteredItems.length) % this.filteredItems.length;
          this.updateSelectionHighlight();
        }
        return;
      }
      if (e.key === 'Enter') {
        e.preventDefault();
        const chosen = this.filteredItems[this.selectedIndex];
        if (chosen) {
          this.executeItem(chosen);
        }
        return;
      }
      return;
    }

    // Do not intercept single-key shortcuts while another modal is active or typing in an input
    if (document.querySelector('.modal-backdrop.active')) return;
    if (e.metaKey || e.ctrlKey || e.altKey) return;

    const active = document.activeElement as HTMLElement | null;
    if (
      active &&
      (active.tagName === 'INPUT' ||
        active.tagName === 'TEXTAREA' ||
        active.tagName === 'SELECT' ||
        active.isContentEditable)
    ) {
      return;
    }

    if (e.key === 'c' || e.key === 'C') {
      e.preventDefault();
      document.getElementById('btn-global-create-task')?.click();
      return;
    }

    if (e.key === '/') {
      e.preventDefault();
      const searchEl =
        (document.getElementById('board-search') as HTMLInputElement | null) ||
        (document.getElementById('table-search') as HTMLInputElement | null);
      if (searchEl) {
        searchEl.focus();
      } else {
        this.open();
      }
      return;
    }

    if (e.key === '1') {
      store.setView('board');
    } else if (e.key === '2') {
      store.setView('table');
    } else if (e.key === '3') {
      store.setView('backlog');
    } else if (e.key === '4') {
      store.setView('dashboard');
    }
  }

  private buildCommandItems(): CommandItem[] {
    const state = store.getState();
    const activeProject = store.getActiveProject();
    const q = this.query.trim().toLowerCase();

    const items: CommandItem[] = [];

    // 1. Quick Actions
    const actionsCategory = t('cmd.section.actions');
    items.push(
      {
        id: 'act-new-task',
        category: actionsCategory,
        title: t('cmd.action.newTask'),
        shortcut: 'C',
        iconHtml: Icons.plus(15),
        action: () => document.getElementById('btn-global-create-task')?.click()
      },
      {
        id: 'act-new-project',
        category: actionsCategory,
        title: t('cmd.action.newProject'),
        iconHtml: Icons.project(15),
        action: () => window.dispatchEvent(new CustomEvent('open-new-project-modal'))
      },
      {
        id: 'act-share',
        category: actionsCategory,
        title: t('cmd.action.share'),
        iconHtml: Icons.users(15),
        action: () => window.dispatchEvent(new CustomEvent('open-share-modal'))
      },
      {
        id: 'act-theme',
        category: actionsCategory,
        title: t('cmd.action.toggleTheme'),
        iconHtml: state.theme === 'dark' ? Icons.sun(15) : Icons.moon(15),
        action: () => store.toggleTheme()
      },
      {
        id: 'act-lang',
        category: actionsCategory,
        title: t('cmd.action.toggleLang'),
        iconHtml: Icons.globe(15),
        action: () => store.toggleLanguage()
      }
    );

    // 2. Views & Navigation
    const viewsCategory = t('cmd.section.views');
    items.push(
      {
        id: 'view-board',
        category: viewsCategory,
        title: t('nav.board'),
        shortcut: '1',
        iconHtml: Icons.board(15),
        action: () => store.setView('board')
      },
      {
        id: 'view-table',
        category: viewsCategory,
        title: t('nav.table'),
        shortcut: '2',
        iconHtml: Icons.table(15),
        action: () => store.setView('table')
      },
      {
        id: 'view-backlog',
        category: viewsCategory,
        title: t('nav.backlog'),
        shortcut: '3',
        iconHtml: Icons.layers(15),
        action: () => store.setView('backlog')
      },
      {
        id: 'view-dashboard',
        category: viewsCategory,
        title: t('nav.dashboard'),
        shortcut: '4',
        iconHtml: Icons.dashboard(15),
        action: () => store.setView('dashboard')
      }
    );

    // 3. Tasks (prioritize active project tasks first, or all projects when searching)
    const tasksCategory = t('cmd.section.tasks');
    const orderedProjects = activeProject
      ? [activeProject, ...state.projects.filter(p => p.id !== activeProject.id)]
      : state.projects;

    const maxTasks = q ? 20 : 8;
    let taskCount = 0;

    for (const proj of orderedProjects) {
      for (const task of proj.tasks) {
        if (!q && activeProject && proj.id !== activeProject.id) continue;
        const matches =
          !q ||
          task.id.toLowerCase().includes(q) ||
          task.title.toLowerCase().includes(q) ||
          task.tags.some(tag => tag.toLowerCase().includes(q));
        if (!matches) continue;

        items.push({
          id: `task-${proj.id}-${task.id}`,
          category: tasksCategory,
          title: task.title,
          subtitle: `${proj.name} • ${t('column.' + task.status)}`,
          badge: task.id,
          iconHtml: Icons.checklist(15),
          action: () => {
            if (store.getState().activeProjectId !== proj.id) {
              store.setActiveProject(proj.id);
            }
            window.dispatchEvent(new CustomEvent('open-task-modal', { detail: { taskId: task.id } }));
          }
        });

        taskCount++;
        if (taskCount >= maxTasks) break;
      }
      if (taskCount >= maxTasks) break;
    }

    // 4. Projects
    const projectsCategory = t('cmd.section.projects');
    for (const proj of state.projects) {
      items.push({
        id: `proj-${proj.id}`,
        category: projectsCategory,
        title: `${proj.icon} ${proj.name}`,
        badge: proj.key,
        iconHtml: Icons.project(15),
        action: () => store.setActiveProject(proj.id)
      });
    }

    if (!q) {
      return items;
    }

    return items.filter(
      item =>
        item.title.toLowerCase().includes(q) ||
        (item.subtitle && item.subtitle.toLowerCase().includes(q)) ||
        (item.badge && item.badge.toLowerCase().includes(q)) ||
        item.category.toLowerCase().includes(q)
    );
  }

  private executeItem(item: CommandItem) {
    this.close();
    item.action();
  }

  private renderShell() {
    if (!this.backdrop) return;

    this.backdrop.innerHTML = `
      <div class="modal-card cmd-palette-card" role="dialog" aria-modal="true" aria-label="${escapeHtml(t('cmd.trigger'))}">
        <div class="cmd-search-header">
          <span class="cmd-search-icon">${Icons.search(18)}</span>
          <input
            type="text"
            class="cmd-search-input"
            id="cmd-search-input"
            placeholder="${escapeHtml(t('cmd.placeholder'))}"
            autocomplete="off"
          />
          <button type="button" class="modal-close-btn" id="cmd-close-btn" style="font-size: 0.9rem; padding: 4px 8px;">Esc</button>
        </div>
        <div class="cmd-results-list" id="cmd-results-list"></div>
        <div class="cmd-footer-hints">
          <span>${escapeHtml(t('cmd.hint'))}</span>
        </div>
      </div>
    `;

    this.backdrop.onclick = e => {
      if (e.target === this.backdrop) {
        this.close();
      }
    };

    this.backdrop.querySelector('#cmd-close-btn')?.addEventListener('click', () => this.close());

    const input = this.backdrop.querySelector('#cmd-search-input') as HTMLInputElement | null;
    input?.addEventListener('input', e => {
      this.query = (e.target as HTMLInputElement).value;
      this.selectedIndex = 0;
      this.renderResults();
    });
  }

  private renderResults() {
    if (!this.backdrop) return;
    const listEl = this.backdrop.querySelector('#cmd-results-list');
    if (!listEl) return;

    this.filteredItems = this.buildCommandItems();
    if (this.selectedIndex >= this.filteredItems.length) {
      this.selectedIndex = Math.max(0, this.filteredItems.length - 1);
    }

    if (this.filteredItems.length === 0) {
      listEl.innerHTML = `<div class="cmd-empty-state">${escapeHtml(t('cmd.empty'))}</div>`;
      return;
    }

    // Group items sequentially by category while tracking flat index
    const grouped: { category: string; entries: { item: CommandItem; index: number }[] }[] = [];
    const map = new Map<string, { item: CommandItem; index: number }[]>();

    this.filteredItems.forEach((item, index) => {
      let bucket = map.get(item.category);
      if (!bucket) {
        bucket = [];
        map.set(item.category, bucket);
        grouped.push({ category: item.category, entries: bucket });
      }
      bucket.push({ item, index });
    });

    listEl.innerHTML = grouped
      .map(
        group => `
        <div class="cmd-category-label">${escapeHtml(group.category)}</div>
        ${group.entries
          .map(
            ({ item, index }) => `
            <button
              type="button"
              class="cmd-item ${index === this.selectedIndex ? 'selected' : ''}"
              data-cmd-index="${index}"
            >
              <div class="cmd-item-left">
                <span class="cmd-item-icon">${item.iconHtml}</span>
                ${item.badge ? `<span class="cmd-item-badge">${escapeHtml(item.badge)}</span>` : ''}
                <div class="cmd-item-text">
                  <span class="cmd-item-title">${escapeHtml(item.title)}</span>
                  ${item.subtitle ? `<span class="cmd-item-subtitle">${escapeHtml(item.subtitle)}</span>` : ''}
                </div>
              </div>
              ${item.shortcut ? `<kbd class="cmd-kbd">${escapeHtml(item.shortcut)}</kbd>` : ''}
            </button>
          `
          )
          .join('')}
      `
      )
      .join('');

    listEl.querySelectorAll('.cmd-item').forEach(btn => {
      const idx = Number(btn.getAttribute('data-cmd-index'));
      btn.addEventListener('mouseenter', () => {
        if (!Number.isNaN(idx) && this.selectedIndex !== idx) {
          this.selectedIndex = idx;
          this.updateSelectionHighlight();
        }
      });
      btn.addEventListener('click', () => {
        const chosen = this.filteredItems[idx];
        if (chosen) this.executeItem(chosen);
      });
    });
  }

  private updateSelectionHighlight() {
    if (!this.backdrop) return;
    const buttons = this.backdrop.querySelectorAll('.cmd-item');
    buttons.forEach(btn => {
      const idx = Number(btn.getAttribute('data-cmd-index'));
      const isSelected = idx === this.selectedIndex;
      btn.classList.toggle('selected', isSelected);
      if (isSelected) {
        (btn as HTMLElement).scrollIntoView({ block: 'nearest' });
      }
    });
  }
}

export default CommandPalette;
