import { AppState, Project, Task, TaskStatus } from './types';
import { setLanguage } from './i18n';

type StoreSubscriber = (state: AppState) => void;

const STORAGE_KEY = 'antigravity_jira_state';

const defaultProjects: Project[] = [
  {
    id: 'proj-1',
    name: 'Apollo Space Launch',
    key: 'APO',
    description: 'Mission to establish a lunar base by late 2027. Includes propulsion, life support, and landing logistics.',
    icon: '🚀',
    tasks: [
      {
        id: 'APO-1',
        projectKey: 'APO',
        taskNum: 1,
        title: 'Design Lunar Lander Landing Pads',
        description: 'Create architectural designs for shock-absorbent, dust-deflecting titanium landing pads. Must withstand high thermal exposure during thruster engagement.',
        status: 'inprogress',
        priority: 'urgent',
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 2 days from now
        subTasks: [
          { id: 'sub-1-1', title: 'Verify thermal load resistance threshold', completed: true },
          { id: 'sub-1-2', title: 'Stress-test structural integrity simulation', completed: false },
          { id: 'sub-1-3', title: 'Export CAD models for manufacturing team', completed: false }
        ],
        comments: [
          {
            id: 'c-1',
            text: 'We should consider using a honeycombed titanium alloy structure to minimize weight without compromising stability.',
            author: 'David (Commander)',
            timestamp: Date.now() - 3600000 * 4
          },
          {
            id: 'c-2',
            text: 'Agreed. Simulated stress analysis is underway. Will report back soon.',
            author: 'Sarah (Lead Engineer)',
            timestamp: Date.now() - 3600000 * 2
          }
        ],
        estimatedHours: 40,
        loggedHours: 24,
        tags: ['Engineering', 'Simulation'],
        createdAt: Date.now() - 86400000 * 5,
        updatedAt: Date.now() - 3600000 * 2
      },
      {
        id: 'APO-2',
        projectKey: 'APO',
        taskNum: 2,
        title: 'Develop Closed-Loop Oxygen Recycler',
        description: 'Prototype the carbon dioxide scrubber and oxygen generation assembly. Target efficiency rating is 99.8% recovery rate.',
        status: 'todo',
        priority: 'high',
        dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 8 days from now
        subTasks: [
          { id: 'sub-2-1', title: 'Source catalytic converters', completed: true },
          { id: 'sub-2-2', title: 'Assemble intake valve manifolds', completed: false },
          { id: 'sub-2-3', title: 'Perform leak tests under 3 atmospheres of pressure', completed: false }
        ],
        comments: [],
        estimatedHours: 80,
        loggedHours: 12,
        tags: ['LifeSupport', 'Hardware'],
        createdAt: Date.now() - 86400000 * 7,
        updatedAt: Date.now() - 86400000 * 1
      },
      {
        id: 'APO-3',
        projectKey: 'APO',
        taskNum: 3,
        title: 'Calibrate Autonomous Navigation System',
        description: 'Perform deep-space sensor calibration runs. Ensure star trackers and LiDAR arrays coordinate with guidance computers for orbital adjustments.',
        status: 'review',
        priority: 'medium',
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 1 day ago (overdue)
        subTasks: [
          { id: 'sub-3-1', title: 'Integrate star tracking camera feeds', completed: true },
          { id: 'sub-3-2', title: 'Verify telemetry checksum validation algorithms', completed: true }
        ],
        comments: [
          {
            id: 'c-3',
            text: 'Star tracking validation passes with 99.98% certainty in pitch and yaw maneuvers.',
            author: 'Nav Computer Bot',
            timestamp: Date.now() - 86400000
          }
        ],
        estimatedHours: 35,
        loggedHours: 33,
        tags: ['Software', 'Navigation'],
        createdAt: Date.now() - 86400000 * 10,
        updatedAt: Date.now() - 86400000
      },
      {
        id: 'APO-4',
        projectKey: 'APO',
        taskNum: 4,
        title: 'Conduct Thruster Gimbals Pre-Flight Review',
        description: 'Verify gimbal control linkages and electronic servo responses. Ensure precise thrust vector alignment.',
        status: 'done',
        priority: 'high',
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 3 days ago
        subTasks: [
          { id: 'sub-4-1', title: 'Physical linkage inspection', completed: true },
          { id: 'sub-4-2', title: 'Servo power cycle tests', completed: true },
          { id: 'sub-4-3', title: 'Command-to-gimbal latency measurement', completed: true }
        ],
        comments: [
          {
            id: 'c-4',
            text: 'Linked servos responding perfectly. Average response latency is 1.8 milliseconds, well within our 5.0ms threshold.',
            author: 'Tech Lead',
            timestamp: Date.now() - 86400000 * 3
          }
        ],
        estimatedHours: 20,
        loggedHours: 22,
        tags: ['Propulsion', 'Hardware'],
        createdAt: Date.now() - 86400000 * 4,
        updatedAt: Date.now() - 86400000 * 3
      }
    ]
  },
  {
    id: 'proj-2',
    name: 'Personal Dev Workspace',
    key: 'DEV',
    description: 'Refactoring personal apps, building templates, and polishing the portfolio for the 2027 stack.',
    icon: '💻',
    tasks: [
      {
        id: 'DEV-1',
        projectKey: 'DEV',
        taskNum: 1,
        title: 'Refactor Core State Manager',
        description: 'Convert old imperative state logic into clean Pub/Sub stores. Improve performance in heavy list rendering.',
        status: 'done',
        priority: 'medium',
        dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        subTasks: [
          { id: 'sub-d1-1', title: 'Write TypeScript interfaces', completed: true },
          { id: 'sub-d1-2', title: 'Implement Pub/Sub store class', completed: true }
        ],
        comments: [],
        estimatedHours: 8,
        loggedHours: 10,
        tags: ['Architecture'],
        createdAt: Date.now() - 86400000 * 3,
        updatedAt: Date.now() - 86400000 * 2
      }
    ]
  }
];

class AppStore {
  private state: AppState;
  private subscribers: Set<StoreSubscriber> = new Set();

  constructor() {
    this.state = this.loadState();
    // Set initial document language and direction
    setLanguage(this.state.language);
    this.applyTheme(this.state.theme);
  }

  private loadState(): AppState {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        // Basic validation
        if (parsed.projects && Array.isArray(parsed.projects) && parsed.activeProjectId !== undefined) {
          return parsed;
        }
      }
    } catch (e) {
      console.error('Error reading state from localStorage', e);
    }

    // Default fallback state
    return {
      projects: defaultProjects,
      activeProjectId: 'proj-1',
      currentView: 'board',
      language: 'en',
      theme: 'dark',
      filters: {
        search: '',
        priority: 'all',
        tag: 'all'
      }
    };
  }

  private saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Error saving state to localStorage', e);
    }
  }

  private notify() {
    this.subscribers.forEach(sub => sub({ ...this.state }));
  }

  // Pub/Sub registration
  public subscribe(subscriber: StoreSubscriber): () => void {
    this.subscribers.add(subscriber);
    // Initial emission
    subscriber({ ...this.state });
    return () => {
      this.subscribers.delete(subscriber);
    };
  }

  public getState(): AppState {
    return { ...this.state };
  }

  // Theme support
  private applyTheme(theme: 'dark' | 'light') {
    document.documentElement.setAttribute('data-theme', theme);
  }

  public toggleTheme() {
    this.state.theme = this.state.theme === 'dark' ? 'light' : 'dark';
    this.applyTheme(this.state.theme);
    this.saveState();
    this.notify();
  }

  public toggleLanguage() {
    this.state.language = this.state.language === 'en' ? 'he' : 'en';
    setLanguage(this.state.language);
    this.saveState();
    this.notify();
  }

  // Views & Projects
  public setView(view: 'board' | 'dashboard') {
    this.state.currentView = view;
    this.saveState();
    this.notify();
  }

  public setActiveProject(projectId: string | null) {
    this.state.activeProjectId = projectId;
    this.saveState();
    this.notify();
  }

  public createProject(name: string, key: string, description: string, icon: string): boolean {
    const cleanKey = key.trim().toUpperCase();
    const exists = this.state.projects.some(p => p.key === cleanKey);
    if (exists) return false;

    const newProject: Project = {
      id: 'proj-' + Date.now(),
      name: name.trim(),
      key: cleanKey,
      description: description.trim(),
      icon: icon.trim() || '📁',
      tasks: []
    };

    this.state.projects.push(newProject);
    this.state.activeProjectId = newProject.id;
    this.saveState();
    this.notify();
    return true;
  }

  public deleteProject(projectId: string) {
    this.state.projects = this.state.projects.filter(p => p.id !== projectId);
    if (this.state.activeProjectId === projectId) {
      this.state.activeProjectId = this.state.projects.length > 0 ? this.state.projects[0].id : null;
    }
    this.saveState();
    this.notify();
  }

  // Tasks Management
  public getActiveProject(): Project | undefined {
    return this.state.projects.find(p => p.id === this.state.activeProjectId);
  }

  public addTask(title: string, column: TaskStatus): Task | null {
    const project = this.state.projects.find(p => p.id === this.state.activeProjectId);
    if (!project) return null;

    const taskNum = project.tasks.length > 0 ? Math.max(...project.tasks.map(t => t.taskNum)) + 1 : 1;
    const newTask: Task = {
      id: `${project.key}-${taskNum}`,
      projectKey: project.key,
      taskNum,
      title: title.trim(),
      description: '',
      status: column,
      priority: 'medium',
      subTasks: [],
      comments: [],
      estimatedHours: 0,
      loggedHours: 0,
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now()
    };

    project.tasks.push(newTask);
    this.saveState();
    this.notify();
    return newTask;
  }

  public updateTask(taskId: string, fields: Partial<Task>) {
    const project = this.state.projects.find(p => p.id === this.state.activeProjectId);
    if (!project) return;

    const taskIndex = project.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const updatedTask = {
      ...project.tasks[taskIndex],
      ...fields,
      updatedAt: Date.now()
    };

    project.tasks[taskIndex] = updatedTask;
    this.saveState();
    this.notify();
  }

  public deleteTask(taskId: string) {
    const project = this.state.projects.find(p => p.id === this.state.activeProjectId);
    if (!project) return;

    project.tasks = project.tasks.filter(t => t.id !== taskId);
    this.saveState();
    this.notify();
  }

  // Drag and Drop State Manipulation
  public moveTask(taskId: string, targetStatus: TaskStatus, targetIndex?: number) {
    const project = this.state.projects.find(p => p.id === this.state.activeProjectId);
    if (!project) return;

    const taskIndex = project.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const task = project.tasks[taskIndex];
    task.status = targetStatus;
    task.updatedAt = Date.now();

    // Reorder inside tasks if index is provided
    if (targetIndex !== undefined) {
      project.tasks.splice(taskIndex, 1); // remove from old position
      
      // Calculate where to insert
      let colTasks = project.tasks.filter(t => t.status === targetStatus);
      // Let's find index in global list
      let globalInsertIdx = project.tasks.length;
      if (targetIndex < colTasks.length) {
        const targetColTask = colTasks[targetIndex];
        globalInsertIdx = project.tasks.findIndex(t => t.id === targetColTask.id);
      }
      
      project.tasks.splice(globalInsertIdx, 0, task);
    }

    this.saveState();
    this.notify();
  }

  // Filters
  public setFilters(filters: Partial<AppState['filters']>) {
    this.state.filters = {
      ...this.state.filters,
      ...filters
    };
    this.notify();
  }

  // Data Portability
  public exportData(): string {
    return JSON.stringify(this.state);
  }

  public importData(jsonStr: string): boolean {
    try {
      const parsed = JSON.parse(jsonStr);
      if (parsed.projects && Array.isArray(parsed.projects)) {
        this.state = parsed;
        // Apply configs
        setLanguage(this.state.language);
        this.applyTheme(this.state.theme);
        this.saveState();
        this.notify();
        return true;
      }
    } catch (e) {
      console.error('Failed to parse import JSON', e);
    }
    return false;
  }
}

export const store = new AppStore();
export default store;
