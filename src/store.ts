import { AppState, Project, SyncStatus, Task, TaskPriority, TaskStatus } from './types';
import { setLanguage } from './i18n';
import { isSupabaseConfigured, supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type StoreSubscriber = (state: AppState) => void;

const STORAGE_KEY = 'antigravity_jira_state';

interface DbProjectRow {
  id: string;
  user_id?: string | null;
  name: string;
  key: string;
  description: string;
  icon: string;
  position: number;
  created_at?: string;
}

interface DbTaskRow {
  id: string;
  user_id?: string | null;
  project_id: string;
  project_key: string;
  task_num: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  sub_tasks: Task['subTasks'];
  comments: Task['comments'];
  estimated_hours: number | string;
  logged_hours: number | string;
  tags: string[];
  position: number;
  created_at: number | string;
  updated_at: number | string;
}

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
        dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
        dueDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
        dueDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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
        dueDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
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

function mapTaskToRow(task: Task, projectId: string, position: number, userId: string): DbTaskRow {
  return {
    id: task.id,
    user_id: userId,
    project_id: projectId,
    project_key: task.projectKey,
    task_num: task.taskNum,
    title: task.title,
    description: task.description || '',
    status: task.status,
    priority: task.priority,
    due_date: task.dueDate || null,
    sub_tasks: task.subTasks || [],
    comments: task.comments || [],
    estimated_hours: task.estimatedHours || 0,
    logged_hours: task.loggedHours || 0,
    tags: task.tags || [],
    position,
    created_at: task.createdAt,
    updated_at: task.updatedAt
  };
}

function mapRowToTask(row: DbTaskRow): Task {
  return {
    id: row.id,
    projectKey: row.project_key,
    taskNum: Number(row.task_num),
    title: row.title,
    description: row.description || '',
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date || undefined,
    subTasks: Array.isArray(row.sub_tasks) ? row.sub_tasks : [],
    comments: Array.isArray(row.comments) ? row.comments : [],
    estimatedHours: Number(row.estimated_hours) || 0,
    loggedHours: Number(row.logged_hours) || 0,
    tags: Array.isArray(row.tags) ? row.tags : [],
    createdAt: Number(row.created_at) || Date.now(),
    updatedAt: Number(row.updated_at) || Date.now()
  };
}

class AppStore {
  private state: AppState;
  private subscribers: Set<StoreSubscriber> = new Set();
  private isApplyingRemote = false;
  private currentUserId: string | null = null;
  private realtimeChannel: RealtimeChannel | null = null;

  constructor() {
    this.state = this.loadState();
    setLanguage(this.state.language);
    this.applyTheme(this.state.theme);
    void this.initAuthAndSync();
  }

  private loadState(): AppState {
    try {
      const serialized = localStorage.getItem(STORAGE_KEY);
      if (serialized) {
        const parsed = JSON.parse(serialized);
        if (parsed.projects && Array.isArray(parsed.projects) && parsed.activeProjectId !== undefined) {
          return {
            ...parsed,
            syncStatus: 'unauthenticated',
            userEmail: null
          };
        }
      }
    } catch (e) {
      console.error('Error reading state from localStorage', e);
    }

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
      },
      syncStatus: 'unauthenticated',
      userEmail: null
    };
  }

  private saveLocalCache() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('Error saving state to localStorage', e);
    }
  }

  private setSyncStatus(status: SyncStatus) {
    if (this.state.syncStatus !== status) {
      this.state.syncStatus = status;
      this.notify();
    }
  }

  /**
   * Initializes Supabase Auth listener and loads user-owned projects & tasks once authenticated.
   */
  private async initAuthAndSync() {
    if (!isSupabaseConfigured) {
      this.setSyncStatus('offline');
      return;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      this.currentUserId = session.user.id;
      this.state.userEmail = session.user.email || null;
      await this.fetchFromCloud();
      this.subscribeRealtime();
    } else {
      this.currentUserId = null;
      this.state.userEmail = null;
      this.setSyncStatus('unauthenticated');
    }

    supabase.auth.onAuthStateChange((_event, newSession) => {
      const nextUserId = newSession?.user?.id || null;
      const nextEmail = newSession?.user?.email || null;

      if (nextUserId && nextUserId !== this.currentUserId) {
        this.currentUserId = nextUserId;
        this.state.userEmail = nextEmail;
        void this.fetchFromCloud();
        this.subscribeRealtime();
      } else if (!nextUserId) {
        this.currentUserId = null;
        this.state.userEmail = null;
        if (this.realtimeChannel) {
          void supabase.removeChannel(this.realtimeChannel);
          this.realtimeChannel = null;
        }
        this.setSyncStatus('unauthenticated');
      }
    });
  }

  private subscribeRealtime() {
    if (this.realtimeChannel) {
      void supabase.removeChannel(this.realtimeChannel);
    }
    this.realtimeChannel = supabase
      .channel('beera-workspace-sync')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'projects' },
        () => {
          if (!this.isApplyingRemote && this.currentUserId) {
            void this.fetchFromCloud();
          }
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tasks' },
        () => {
          if (!this.isApplyingRemote && this.currentUserId) {
            void this.fetchFromCloud();
          }
        }
      )
      .subscribe();
  }

  public async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  public async signUp(email: string, password: string): Promise<{ error: string | null; needsConfirmation: boolean }> {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      return { error: error.message, needsConfirmation: false };
    }
    return { error: null, needsConfirmation: !data.session };
  }

  public async signOut(): Promise<void> {
    await supabase.auth.signOut();
  }

  public async fetchFromCloud() {
    if (!this.currentUserId) {
      this.setSyncStatus('unauthenticated');
      return;
    }

    try {
      this.setSyncStatus('syncing');
      const [{ data: projRows, error: projErr }, { data: taskRows, error: taskErr }] = await Promise.all([
        supabase.from('projects').select('*').order('position', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('tasks').select('*').order('position', { ascending: true }).order('created_at', { ascending: true })
      ]);

      if (projErr) throw projErr;
      if (taskErr) throw taskErr;

      const typedProjects = (projRows || []) as DbProjectRow[];
      const typedTasks = (taskRows || []) as DbTaskRow[];

      if (typedProjects.length === 0 && this.state.projects.length > 0) {
        await this.pushAllToCloud(this.state.projects);
        this.setSyncStatus('synced');
        return;
      }

      // Claim any initial unowned seed rows so they belong strictly to this authenticated user
      const hasUnownedProjects = typedProjects.some(p => !p.user_id);
      const hasUnownedTasks = typedTasks.some(t => !t.user_id);
      if (hasUnownedProjects || hasUnownedTasks) {
        this.isApplyingRemote = true;
        if (hasUnownedProjects) {
          await supabase.from('projects').update({ user_id: this.currentUserId }).is('user_id', null);
        }
        if (hasUnownedTasks) {
          await supabase.from('tasks').update({ user_id: this.currentUserId }).is('user_id', null);
        }
        this.isApplyingRemote = false;
      }

      const tasksByProject = new Map<string, Task[]>();
      for (const row of typedTasks) {
        const list = tasksByProject.get(row.project_id) || [];
        list.push(mapRowToTask(row));
        tasksByProject.set(row.project_id, list);
      }

      const cloudProjects: Project[] = typedProjects.map(p => ({
        id: p.id,
        name: p.name,
        key: p.key,
        description: p.description || '',
        icon: p.icon || '📁',
        tasks: tasksByProject.get(p.id) || []
      }));

      this.state.projects = cloudProjects;
      if (
        !this.state.activeProjectId ||
        !cloudProjects.some(p => p.id === this.state.activeProjectId)
      ) {
        this.state.activeProjectId = cloudProjects.length > 0 ? cloudProjects[0].id : null;
      }

      this.state.syncStatus = 'synced';
      this.saveLocalCache();
      this.notify();
    } catch (err) {
      console.error('Supabase fetch error (using local cache):', err);
      this.setSyncStatus('offline');
    }
  }

  private async pushAllToCloud(projects: Project[]) {
    if (!this.currentUserId) return;
    try {
      this.isApplyingRemote = true;
      this.setSyncStatus('syncing');

      const projectRows: DbProjectRow[] = projects.map((p, idx) => ({
        id: p.id,
        user_id: this.currentUserId,
        name: p.name,
        key: p.key,
        description: p.description || '',
        icon: p.icon || '📁',
        position: idx
      }));

      const taskRows: DbTaskRow[] = [];
      for (const p of projects) {
        p.tasks.forEach((t, idx) => {
          taskRows.push(mapTaskToRow(t, p.id, idx, this.currentUserId!));
        });
      }

      if (projectRows.length > 0) {
        const { error: pErr } = await supabase.from('projects').upsert(projectRows, { onConflict: 'id' });
        if (pErr) throw pErr;
      }

      if (taskRows.length > 0) {
        const { error: tErr } = await supabase.from('tasks').upsert(taskRows, { onConflict: 'id' });
        if (tErr) throw tErr;
      }

      this.setSyncStatus('synced');
    } catch (err) {
      console.error('Failed to push state to Supabase:', err);
      this.setSyncStatus('offline');
    } finally {
      this.isApplyingRemote = false;
    }
  }

  private notify() {
    this.subscribers.forEach(sub => sub({ ...this.state }));
  }

  // Pub/Sub registration
  public subscribe(subscriber: StoreSubscriber): () => void {
    this.subscribers.add(subscriber);
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
    this.saveLocalCache();
    this.notify();
  }

  public toggleLanguage() {
    this.state.language = this.state.language === 'en' ? 'he' : 'en';
    setLanguage(this.state.language);
    this.saveLocalCache();
    this.notify();
  }

  // Views & Projects
  public setView(view: 'board' | 'dashboard') {
    this.state.currentView = view;
    this.saveLocalCache();
    this.notify();
  }

  public setActiveProject(projectId: string | null) {
    this.state.activeProjectId = projectId;
    this.saveLocalCache();
    this.notify();
  }

  public createProject(name: string, key: string, description: string, icon: string): boolean {
    const cleanKey = key.trim().toUpperCase();
    const exists = this.state.projects.some(p => p.key === cleanKey);
    if (exists) return false;

    const position = this.state.projects.length;
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
    this.saveLocalCache();
    this.notify();

    if (this.currentUserId) {
      const userId = this.currentUserId;
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const { error } = await supabase.from('projects').insert({
            id: newProject.id,
            user_id: userId,
            name: newProject.name,
            key: newProject.key,
            description: newProject.description,
            icon: newProject.icon,
            position
          });
          if (error) throw error;
          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to create project in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }

    return true;
  }

  public deleteProject(projectId: string) {
    this.state.projects = this.state.projects.filter(p => p.id !== projectId);
    if (this.state.activeProjectId === projectId) {
      this.state.activeProjectId = this.state.projects.length > 0 ? this.state.projects[0].id : null;
    }
    this.saveLocalCache();
    this.notify();

    if (this.currentUserId) {
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const { error } = await supabase.from('projects').delete().eq('id', projectId);
          if (error) throw error;
          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to delete project in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }
  }

  // Tasks Management
  public getActiveProject(): Project | undefined {
    return this.state.projects.find(p => p.id === this.state.activeProjectId);
  }

  public addTask(title: string, column: TaskStatus): Task | null {
    const project = this.state.projects.find(p => p.id === this.state.activeProjectId);
    if (!project) return null;

    const taskNum = project.tasks.length > 0 ? Math.max(...project.tasks.map(t => t.taskNum)) + 1 : 1;
    const position = project.tasks.length;
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
    this.saveLocalCache();
    this.notify();

    if (this.currentUserId) {
      const userId = this.currentUserId;
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const { error } = await supabase
            .from('tasks')
            .upsert(mapTaskToRow(newTask, project.id, position, userId), { onConflict: 'id' });
          if (error) throw error;
          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to add task in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }

    return newTask;
  }

  public updateTask(taskId: string, fields: Partial<Task>) {
    const project = this.state.projects.find(p => p.id === this.state.activeProjectId);
    if (!project) return;

    const taskIndex = project.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) return;

    const updatedTask: Task = {
      ...project.tasks[taskIndex],
      ...fields,
      updatedAt: Date.now()
    };

    project.tasks[taskIndex] = updatedTask;
    this.saveLocalCache();
    this.notify();

    if (this.currentUserId) {
      const userId = this.currentUserId;
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const { error } = await supabase
            .from('tasks')
            .upsert(mapTaskToRow(updatedTask, project.id, taskIndex, userId), { onConflict: 'id' });
          if (error) throw error;
          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to update task in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }
  }

  public deleteTask(taskId: string) {
    const project = this.state.projects.find(p => p.id === this.state.activeProjectId);
    if (!project) return;

    project.tasks = project.tasks.filter(t => t.id !== taskId);
    this.saveLocalCache();
    this.notify();

    if (this.currentUserId) {
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const { error } = await supabase.from('tasks').delete().eq('id', taskId);
          if (error) throw error;
          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to delete task in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }
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

    if (targetIndex !== undefined) {
      project.tasks.splice(taskIndex, 1);

      const colTasks = project.tasks.filter(t => t.status === targetStatus);
      let globalInsertIdx = project.tasks.length;
      if (targetIndex < colTasks.length) {
        const targetColTask = colTasks[targetIndex];
        globalInsertIdx = project.tasks.findIndex(t => t.id === targetColTask.id);
      }

      project.tasks.splice(globalInsertIdx, 0, task);
    }

    this.saveLocalCache();
    this.notify();

    if (this.currentUserId) {
      const userId = this.currentUserId;
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const rows = project.tasks.map((t, idx) => mapTaskToRow(t, project.id, idx, userId));
          const { error } = await supabase.from('tasks').upsert(rows, { onConflict: 'id' });
          if (error) throw error;
          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to reorder/move task in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }
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
        this.state = {
          ...parsed,
          syncStatus: this.currentUserId ? 'syncing' : 'unauthenticated',
          userEmail: this.state.userEmail
        };
        setLanguage(this.state.language);
        this.applyTheme(this.state.theme);
        this.saveLocalCache();
        this.notify();
        void this.pushAllToCloud(this.state.projects);
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
