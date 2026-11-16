import { store } from '../store';
import { t } from '../i18n';
import { Task, TaskStatus } from '../types';
import { Icons } from './Icons';
import { escapeHtml } from '../utils';

export class Dashboard {
  private container: HTMLElement | null = null;
  private unsubscribe: (() => void) | null = null;

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

    const project = store.getActiveProject();
    if (!project) {
      this.renderEmptyState();
      return;
    }

    this.container.className = 'main-content';

    const tasks = project.tasks;
    const totalTasks = tasks.length;

    if (totalTasks === 0) {
      this.container.innerHTML = `
        <div class="content-header">
          <div class="project-details-title">
            <span>${escapeHtml(project.icon)}</span>
            <span>${escapeHtml(project.name)}</span>
            <span class="project-key-title">${escapeHtml(project.key)}</span>
          </div>
        </div>
        <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; height: 60vh; text-align: center;">
          <span style="font-size: 4rem; margin-bottom: 16px;">📊</span>
          <h3>${t('dash.statusDist')}</h3>
          <p style="color: var(--text-secondary); max-width: 400px; margin-top: 8px;">${t('dash.noTasks')}</p>
        </div>
      `;
      return;
    }

    // Calculations
    const completedTasks = tasks.filter(t => t.status === 'done').length;
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

    let totalLogged = 0;
    let totalEst = 0;
    let overdueCount = 0;
    const todayStr = new Date().toISOString().split('T')[0];

    tasks.forEach(task => {
      totalLogged += task.loggedHours || 0;
      totalEst += task.estimatedHours || 0;
      
      if (task.dueDate && task.dueDate < todayStr && task.status !== 'done') {
        overdueCount++;
      }
    });

    // Count by status
    const statusCounts: Record<TaskStatus, number> = {
      todo: tasks.filter(t => t.status === 'todo').length,
      inprogress: tasks.filter(t => t.status === 'inprogress').length,
      review: tasks.filter(t => t.status === 'review').length,
      done: completedTasks
    };

    const isRtl = store.getState().language === 'he';

    this.container.innerHTML = `
      <div class="content-header">
        <div class="project-details-title">
          <span>${project.icon}</span>
          <span>${project.name}</span>
          <span class="project-key-title">${project.key}</span>
        </div>
      </div>

      <div class="dashboard-viewport">
        
        <!-- Key Metrics Cards -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">${t('dash.totalTasks')}</span>
              <span class="stat-value">${totalTasks}</span>
            </div>
            <div class="stat-icon-wrap" style="background: var(--primary-glow); color: var(--primary); display: flex; align-items: center; justify-content: center;">${Icons.board(18)}</div>
          </div>

          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">${t('dash.completedTasks')}</span>
              <span class="stat-value">${completedTasks}</span>
            </div>
            <div class="stat-icon-wrap" style="background: hsla(var(--hsl-done), 0.12); color: hsl(var(--hsl-done)); display: flex; align-items: center; justify-content: center;">${Icons.checklist(18)}</div>
          </div>

          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">${t('dash.completionRate')}</span>
              <span class="stat-value">${completionRate}%</span>
            </div>
            <div class="stat-icon-wrap" style="background: hsla(var(--hsl-inprogress), 0.12); color: hsl(var(--hsl-inprogress)); display: flex; align-items: center; justify-content: center;">${Icons.dashboard(18)}</div>
          </div>

          <div class="stat-card">
            <div class="stat-info">
              <span class="stat-label">${t('dash.overdueTasks')}</span>
              <span class="stat-value" style="color: ${overdueCount > 0 ? 'hsl(var(--hsl-urgent))' : 'var(--text-primary)'};">${overdueCount}</span>
            </div>
            <div class="stat-icon-wrap" style="background: hsla(var(--hsl-urgent), 0.12); color: hsl(var(--hsl-urgent)); display: flex; align-items: center; justify-content: center;">${Icons.alert(18)}</div>
          </div>
        </div>

        <!-- Visual Analytics Charts Grid -->
        <div class="charts-grid">
          
          <!-- Donut Chart: Status Distribution -->
          <div class="chart-card">
            <div class="chart-header">${t('dash.statusDist')}</div>
            <div class="chart-container" style="flex-direction: ${isRtl ? 'row-reverse' : 'row'};">
              ${this.renderDonutChart(statusCounts, totalTasks)}
            </div>
          </div>

          <!-- Burn-down / Progress Velocity Chart -->
          <div class="chart-card">
            <div class="chart-header">${t('dash.burnDown')}</div>
            <div class="chart-container">
              ${this.renderBurnDownChart(tasks)}
            </div>
          </div>

        </div>

        <!-- Hours tracking Summary -->
        <div class="stat-card" style="margin-top: 8px;">
          <div style="display: flex; flex-direction: column; gap: 8px; flex: 1;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-weight: 600;">
              <span style="display: inline-flex; align-items: center; gap: 6px;">
                ${Icons.clock(16)}
                <span>${t('dash.loggedHours')} vs ${t('dash.estimatedHours')}</span>
              </span>
              <span>${totalLogged}h / ${totalEst}h</span>
            </div>
            <div class="time-progress-bar-bg" style="height: 12px; border-radius: 6px;">
              <div 
                class="time-progress-bar-fill" 
                style="height: 100%; border-radius: 6px; width: ${totalEst > 0 ? Math.min(Math.round((totalLogged/totalEst)*100), 100) : 0}%; background: var(--accent);"
              ></div>
            </div>
          </div>
        </div>

      </div>
    `;
  }

  private renderDonutChart(counts: Record<TaskStatus, number>, total: number): string {
    const radius = 65;
    const circumference = 2 * Math.PI * radius; // ~408.4
    
    // Status definitions with corresponding colors matching style.css HSL tokens
    const segments: { status: TaskStatus; label: string; count: number; color: string }[] = [
      { status: 'todo', label: t('column.todo'), count: counts.todo, color: 'hsl(var(--hsl-todo))' },
      { status: 'inprogress', label: t('column.inprogress'), count: counts.inprogress, color: 'hsl(var(--hsl-inprogress))' },
      { status: 'review', label: t('column.review'), count: counts.review, color: 'hsl(var(--hsl-review))' },
      { status: 'done', label: t('column.done'), count: counts.done, color: 'hsl(var(--hsl-done))' }
    ];

    let accumulatedPercentage = 0;
    let svgPaths = '';
    let legendItems = '';

    segments.forEach(seg => {
      if (seg.count === 0) return;
      
      const pct = (seg.count / total) * 100;
      const strokeDasharray = `${(pct / 100) * circumference} ${circumference}`;
      const strokeDashoffset = `${- (accumulatedPercentage / 100) * circumference}`;
      
      svgPaths += `
        <circle 
          class="donut-segment" 
          cx="80" cy="80" r="${radius}" 
          stroke="${seg.color}" 
          stroke-width="16" 
          stroke-dasharray="${strokeDasharray}" 
          stroke-dashoffset="${strokeDashoffset}" 
          title="${seg.label}: ${seg.count} (${Math.round(pct)}%)"
        />
      `;
      
      accumulatedPercentage += pct;
    });

    // If there is no task at all (handled outside, but just in case)
    if (svgPaths === '') {
      svgPaths = `<circle cx="80" cy="80" r="${radius}" stroke="var(--border-color)" stroke-width="16" fill="none" />`;
    }

    segments.forEach(seg => {
      legendItems += `
        <div class="legend-item">
          <span class="legend-color" style="background: ${seg.color};"></span>
          <span style="font-weight: 500;">${seg.label}:</span>
          <span style="color: var(--text-secondary); font-weight: 700;">${seg.count}</span>
        </div>
      `;
    });

    return `
      <div style="position: relative; width: 160px; height: 160px; display: flex; align-items: center; justify-content: center;">
        <svg width="160" height="160" class="donut-svg">
          ${svgPaths}
        </svg>
        <div class="donut-center-text">
          <span class="donut-center-val">${total}</span>
          <span class="donut-center-lbl">${t('dash.totalTasks')}</span>
        </div>
      </div>
      <div class="donut-legend">
        ${legendItems}
      </div>
    `;
  }

  /**
   * Renders a simulated work curve / burn-down chart.
   * In a real system this depends on historical logs; here we project the current active cards 
   * over a logical timeline (Todo -> InProgress -> Review -> Done) or mock timeline to represent remaining tasks.
   */
  private renderBurnDownChart(tasks: Task[]): string {
    const total = tasks.length;
    // We will draw a line starting at total tasks and dropping as tasks transition
    // Status counts
    const todo = tasks.filter(t => t.status === 'todo').length;
    const inprogress = tasks.filter(t => t.status === 'inprogress').length;
    const review = tasks.filter(t => t.status === 'review').length;

    // Y values (remaining workload count after each step)
    const y0 = total;                // start (backlog)
    const y1 = todo + inprogress + review; // after done (todo + inprogress + review remaining)
    const y2 = todo + inprogress;    // in progress or todo remaining
    const y3 = todo;                 // only todo remaining
    const y4 = 0;                    // target (zero remaining)

    const points = [y0, y1, y2, y3, y4];
    const width = 450;
    const height = 200;
    const paddingX = 40;
    const paddingY = 20;

    const chartWidth = width - 2 * paddingX;
    const chartHeight = height - 2 * paddingY;

    // Map points to SVG coordinate space
    const xStep = chartWidth / (points.length - 1);
    const coords = points.map((val, idx) => {
      const x = paddingX + idx * xStep;
      // invert Y since SVG coordinates start at top
      const y = paddingY + chartHeight - (val / Math.max(total, 1)) * chartHeight;
      return { x, y, val };
    });

    // Construct path string
    let pathD = `M ${coords[0].x} ${coords[0].y}`;
    for (let i = 1; i < coords.length; i++) {
      // Use cubic bezier to draw smooth curves instead of jaggy lines!
      const cpX1 = coords[i-1].x + xStep / 2;
      const cpY1 = coords[i-1].y;
      const cpX2 = coords[i].x - xStep / 2;
      const cpY2 = coords[i].y;
      pathD += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${coords[i].x} ${coords[i].y}`;
    }

    // Area path closing coordinates (down to bottom and back to start)
    const areaD = `${pathD} L ${coords[coords.length - 1].x} ${height - paddingY} L ${coords[0].x} ${height - paddingY} Z`;

    // Horizontal Grid Lines
    let gridHtml = '';
    const gridCount = 4;
    for (let i = 0; i <= gridCount; i++) {
      const y = paddingY + (i / gridCount) * chartHeight;
      const val = Math.round(total - (i / gridCount) * total);
      gridHtml += `
        <line class="chart-grid-line" x1="${paddingX}" y1="${y}" x2="${width - paddingX}" y2="${y}" />
        <text class="chart-axis-text" x="${paddingX - 10}" y="${y + 4}" text-anchor="end">${val}</text>
      `;
    }

    // X axis labels
    const xLabels = [
      store.getState().language === 'he' ? 'צבר' : 'Backlog',
      t('column.done'),
      t('column.review'),
      t('column.inprogress'),
      t('column.todo')
    ];
    
    let labelsHtml = '';
    coords.forEach((c, idx) => {
      labelsHtml += `
        <text class="chart-axis-text" x="${c.x}" y="${height - 2}" text-anchor="middle">${xLabels[idx]}</text>
        <circle class="chart-point" cx="${c.x}" cy="${c.y}" r="6" title="Remaining: ${c.val} tasks" />
      `;
    });

    return `
      <svg viewBox="0 0 ${width} ${height}" style="width: 100%; height: 100%;">
        <defs>
          <linearGradient id="chart-gradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stop-color="var(--primary)" />
            <stop offset="100%" stop-color="var(--primary)" stop-opacity="0" />
          </linearGradient>
        </defs>
        
        <!-- Grid -->
        ${gridHtml}
        
        <!-- Fill Area -->
        <path class="chart-area" d="${areaD}" />

        <!-- Stroke Line -->
        <path class="chart-line" d="${pathD}" />
        
        <!-- Data Points & Labels -->
        ${labelsHtml}
      </svg>
    `;
  }

  private renderEmptyState() {
    if (!this.container) return;
    this.container.className = 'main-content';
    this.container.innerHTML = `
      <div class="empty-state-container">
        <div class="empty-state-illustration">📈</div>
        <div class="empty-state-title">${t('project.empty.title')}</div>
        <div class="empty-state-desc">${t('project.empty.desc')}</div>
      </div>
    `;
  }
}
