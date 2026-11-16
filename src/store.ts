import {
  AppState,
  Project,
  ProjectMember,
  Sprint,
  SyncStatus,
  Task,
  TaskPriority,
  TaskStatus,
  TaskType,
  UserProfile
} from './types';
import { setLanguage, t } from './i18n';
import { isSupabaseConfigured, supabase } from './supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

type StoreSubscriber = (state: AppState) => void;

const STORAGE_KEY = 'antigravity_jira_state';

const AVATAR_COLORS = [
  '#f59e0b',
  '#fbbf24',
  '#38bdf8',
  '#34d399',
  '#fb7185',
  '#a78bfa'
];

function pickAvatarColor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

interface DbProfileRow {
  id: string;
  email: string;
  display_name: string;
  avatar_color: string;
}

interface DbProjectMemberRow {
  project_id: string;
  user_id: string;
  role: 'owner' | 'member';
}

interface DbSprintRow {
  id: string;
  project_id: string;
  name: string;
  goal: string;
  status: 'planned' | 'active' | 'completed';
  start_date: string | null;
  end_date: string | null;
  position: number;
  created_at: number | string;
}

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
  task_type?: TaskType;
  story_points?: number;
  sprint_id?: string | null;
  assignee_id?: string | null;
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
    task_type: task.taskType || 'task',
    story_points: Number(task.storyPoints) || 0,
    sprint_id: task.sprintId || null,
    assignee_id: task.assigneeId || null,
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
    taskType: row.task_type || 'task',
    storyPoints: Number(row.story_points) || 0,
    sprintId: row.sprint_id || null,
    assigneeId: row.assignee_id || null,
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

function mapRowToSprint(row: DbSprintRow): Sprint {
  return {
    id: row.id,
    projectId: row.project_id,
    name: row.name,
    goal: row.goal || '',
    status: row.status,
    startDate: row.start_date || undefined,
    endDate: row.end_date || undefined,
    position: Number(row.position) || 0,
    createdAt: Number(row.created_at) || Date.now()
  };
}

function mapSprintToRow(sprint: Sprint): DbSprintRow {
  return {
    id: sprint.id,
    project_id: sprint.projectId,
    name: sprint.name,
    goal: sprint.goal || '',
    status: sprint.status,
    start_date: sprint.startDate || null,
    end_date: sprint.endDate || null,
    position: sprint.position,
    created_at: sprint.createdAt
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
          const normalizedProjects: Project[] = parsed.projects.map((p: Partial<Project>) => ({
            id: p.id || '',
            name: p.name || '',
            key: p.key || '',
            description: p.description || '',
            icon: p.icon || '📁',
            ownerId: p.ownerId || null,
            sprints: Array.isArray(p.sprints) ? p.sprints : [],
            members: Array.isArray(p.members) ? p.members : [],
            tasks: Array.isArray(p.tasks)
              ? p.tasks.map((task: Partial<Task>) => ({
                  ...task,
                  taskType: task.taskType || 'task',
                  storyPoints: Number(task.storyPoints) || 0,
                  sprintId: task.sprintId || null,
                  assigneeId: task.assigneeId || null,
                  subTasks: Array.isArray(task.subTasks) ? task.subTasks : [],
                  comments: Array.isArray(task.comments) ? task.comments : [],
                  tags: Array.isArray(task.tags) ? task.tags : []
                }))
              : []
          }));

          return {
            projects: normalizedProjects,
            activeProjectId: parsed.activeProjectId ?? null,
            currentView:
              parsed.currentView === 'backlog' || parsed.currentView === 'dashboard'
                ? parsed.currentView
                : 'board',
            language: parsed.language === 'he' ? 'he' : 'en',
            theme: parsed.theme === 'light' ? 'light' : 'dark',
            filters: {
              search: parsed.filters?.search || '',
              priority: parsed.filters?.priority || 'all',
              tag: parsed.filters?.tag || 'all',
              assignee: parsed.filters?.assignee || 'all',
              boardScope: parsed.filters?.boardScope === 'active_sprint' ? 'active_sprint' : 'all'
            },
            syncStatus: 'unauthenticated',
            userEmail: null,
            currentUserProfile: null
          };
        }
      }
    } catch (e) {
      console.error('Error reading state from localStorage', e);
    }

    return {
      projects: [],
      activeProjectId: null,
      currentView: 'board',
      language: 'en',
      theme: 'dark',
      filters: {
        search: '',
        priority: 'all',
        tag: 'all',
        assignee: 'all',
        boardScope: 'all'
      },
      syncStatus: 'unauthenticated',
      userEmail: null,
      currentUserProfile: null
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

  private async ensureCurrentUserProfile(userId: string, email: string) {
    const cleanEmail = email.toLowerCase();
    try {
      const { data: existing, error: fetchErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (!fetchErr && existing) {
        const row = existing as DbProfileRow;
        this.state.currentUserProfile = {
          id: row.id,
          email: row.email,
          displayName: row.display_name,
          avatarColor: row.avatar_color
        };
        return;
      }

      const displayName = cleanEmail.split('@')[0] || 'User';
      const avatarColor = pickAvatarColor(cleanEmail);

      const { error: upsertErr } = await supabase.from('profiles').upsert(
        {
          id: userId,
          email: cleanEmail,
          display_name: displayName,
          avatar_color: avatarColor
        },
        { onConflict: 'id' }
      );

      if (!upsertErr) {
        this.state.currentUserProfile = {
          id: userId,
          email: cleanEmail,
          displayName,
          avatarColor
        };
      }
    } catch (err) {
      console.error('Failed to ensure current user profile:', err);
    }
  }

  /**
   * Initializes Supabase Auth listener and loads collaborative projects, sprints, members & tasks.
   */
  private async initAuthAndSync() {
    if (!isSupabaseConfigured) {
      this.setSyncStatus('offline');
      return;
    }

    const {
      data: { session }
    } = await supabase.auth.getSession();

    if (session?.user) {
      this.currentUserId = session.user.id;
      this.state.userEmail = session.user.email || null;
      await this.ensureCurrentUserProfile(session.user.id, session.user.email || '');
      await this.fetchFromCloud();
      this.subscribeRealtime();
    } else {
      this.currentUserId = null;
      this.state.userEmail = null;
      this.state.currentUserProfile = null;
      this.setSyncStatus('unauthenticated');
    }

    supabase.auth.onAuthStateChange((_event, newSession) => {
      const nextUserId = newSession?.user?.id || null;
      const nextEmail = newSession?.user?.email || null;

      if (nextUserId && nextUserId !== this.currentUserId) {
        this.currentUserId = nextUserId;
        this.state.userEmail = nextEmail;
        void (async () => {
          await this.ensureCurrentUserProfile(nextUserId, nextEmail || '');
          await this.fetchFromCloud();
          this.subscribeRealtime();
        })();
      } else if (!nextUserId) {
        this.currentUserId = null;
        this.state.userEmail = null;
        this.state.currentUserProfile = null;
        this.state.projects = [];
        this.state.activeProjectId = null;
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, () => {
        if (!this.isApplyingRemote && this.currentUserId) void this.fetchFromCloud();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sprints' }, () => {
        if (!this.isApplyingRemote && this.currentUserId) void this.fetchFromCloud();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks' }, () => {
        if (!this.isApplyingRemote && this.currentUserId) void this.fetchFromCloud();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'project_members' }, () => {
        if (!this.isApplyingRemote && this.currentUserId) void this.fetchFromCloud();
      })
      .subscribe();
  }

  public async signIn(email: string, password: string): Promise<{ error: string | null }> {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error ? error.message : null };
  }

  public async signUp(
    email: string,
    password: string
  ): Promise<{ error: string | null; needsConfirmation: boolean }> {
    const redirectUrl = `${window.location.origin}${window.location.pathname}`;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: redirectUrl
      }
    });
    if (error) {
      return { error: error.message, needsConfirmation: false };
    }
    return { error: null, needsConfirmation: !data.session };
  }

  public async signOut(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY);
    await supabase.auth.signOut();
  }

  public async fetchFromCloud() {
    if (!this.currentUserId) {
      this.setSyncStatus('unauthenticated');
      return;
    }

    try {
      this.setSyncStatus('syncing');
      const [
        { data: projRows, error: projErr },
        { data: sprintRows, error: sprintErr },
        { data: taskRows, error: taskErr },
        { data: memberRows, error: memberErr },
        { data: profileRows, error: profileErr }
      ] = await Promise.all([
        supabase
          .from('projects')
          .select('*')
          .order('position', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('sprints')
          .select('*')
          .order('position', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase
          .from('tasks')
          .select('*')
          .order('position', { ascending: true })
          .order('created_at', { ascending: true }),
        supabase.from('project_members').select('*'),
        supabase.from('profiles').select('*')
      ]);

      if (projErr) throw projErr;
      if (sprintErr) throw sprintErr;
      if (taskErr) throw taskErr;
      if (memberErr) throw memberErr;
      if (profileErr) throw profileErr;

      const typedProjects = (projRows || []) as DbProjectRow[];
      const typedSprints = (sprintRows || []) as DbSprintRow[];
      const typedTasks = (taskRows || []) as DbTaskRow[];
      const typedMembers = (memberRows || []) as DbProjectMemberRow[];
      const typedProfiles = (profileRows || []) as DbProfileRow[];

      const profilesMap = new Map<string, UserProfile>();
      for (const prof of typedProfiles) {
        profilesMap.set(prof.id, {
          id: prof.id,
          email: prof.email,
          displayName: prof.display_name,
          avatarColor: prof.avatar_color || '#f59e0b'
        });
      }

      if (typedProjects.length === 0) {
        this.state.projects = [];
        this.state.activeProjectId = null;
        this.state.syncStatus = 'synced';
        this.saveLocalCache();
        this.notify();
        return;
      }

      // Claim any initial unowned seed rows so they belong to the authenticated user
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

      const sprintsByProject = new Map<string, Sprint[]>();
      for (const row of typedSprints) {
        const list = sprintsByProject.get(row.project_id) || [];
        list.push(mapRowToSprint(row));
        sprintsByProject.set(row.project_id, list);
      }

      const tasksByProject = new Map<string, Task[]>();
      for (const row of typedTasks) {
        const list = tasksByProject.get(row.project_id) || [];
        list.push(mapRowToTask(row));
        tasksByProject.set(row.project_id, list);
      }

      const membersByProject = new Map<string, ProjectMember[]>();
      for (const row of typedMembers) {
        const profile = profilesMap.get(row.user_id);
        if (!profile) continue;
        const list = membersByProject.get(row.project_id) || [];
        list.push({
          projectId: row.project_id,
          userId: row.user_id,
          role: row.role,
          profile
        });
        membersByProject.set(row.project_id, list);
      }

      const cloudProjects: Project[] = typedProjects.map(p => {
        const members = membersByProject.get(p.id) || [];
        const ownerId = p.user_id || this.currentUserId;
        if (ownerId && !members.some(m => m.userId === ownerId)) {
          const ownerProf = profilesMap.get(ownerId);
          if (ownerProf) {
            members.unshift({
              projectId: p.id,
              userId: ownerId,
              role: 'owner',
              profile: ownerProf
            });
          }
        }
        return {
          id: p.id,
          name: p.name,
          key: p.key,
          description: p.description || '',
          icon: p.icon || '📁',
          ownerId,
          sprints: sprintsByProject.get(p.id) || [],
          members,
          tasks: tasksByProject.get(p.id) || []
        };
      });

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
        user_id: p.ownerId || this.currentUserId,
        name: p.name,
        key: p.key,
        description: p.description || '',
        icon: p.icon || '📁',
        position: idx
      }));

      const sprintRows: DbSprintRow[] = [];
      const taskRows: DbTaskRow[] = [];
      const memberRows: DbProjectMemberRow[] = [];

      for (const p of projects) {
        memberRows.push({
          project_id: p.id,
          user_id: this.currentUserId,
          role: 'owner'
        });
        (p.sprints || []).forEach(s => {
          sprintRows.push(mapSprintToRow(s));
        });
        p.tasks.forEach((t, idx) => {
          taskRows.push(mapTaskToRow(t, p.id, idx, this.currentUserId!));
        });
      }

      if (projectRows.length > 0) {
        const { error: pErr } = await supabase.from('projects').upsert(projectRows, { onConflict: 'id' });
        if (pErr) throw pErr;
      }

      if (memberRows.length > 0) {
        const { error: mErr } = await supabase
          .from('project_members')
          .upsert(memberRows, { onConflict: 'project_id,user_id' });
        if (mErr) throw mErr;
      }

      if (sprintRows.length > 0) {
        const { error: sErr } = await supabase.from('sprints').upsert(sprintRows, { onConflict: 'id' });
        if (sErr) throw sErr;
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

  public getCurrentUserId(): string | null {
    return this.currentUserId;
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
  public setView(view: 'board' | 'backlog' | 'dashboard') {
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
    const ownerProfile: UserProfile | null = this.state.currentUserProfile || null;
    const initialMembers: ProjectMember[] =
      this.currentUserId && ownerProfile
        ? [{ projectId: '', userId: this.currentUserId, role: 'owner', profile: ownerProfile }]
        : [];

    const newProject: Project = {
      id: 'proj-' + Date.now(),
      name: name.trim(),
      key: cleanKey,
      description: description.trim(),
      icon: icon.trim() || '📁',
      ownerId: this.currentUserId,
      sprints: [],
      members: initialMembers,
      tasks: []
    };
    if (newProject.members[0]) {
      newProject.members[0].projectId = newProject.id;
    }

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

          await supabase
            .from('project_members')
            .upsert({ project_id: newProject.id, user_id: userId, role: 'owner' }, { onConflict: 'project_id,user_id' });

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

  // Team Collaboration
  public async inviteMemberByEmail(email: string): Promise<{ error: string | null }> {
    const project = this.getActiveProject();
    if (!project || !this.currentUserId) {
      return { error: 'No active project' };
    }

    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      return { error: t('share.error.notFound') };
    }

    try {
      const { data: profData, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .ilike('email', cleanEmail)
        .maybeSingle();

      if (profErr) throw profErr;
      if (!profData) {
        return { error: t('share.error.notFound') };
      }

      const row = profData as DbProfileRow;
      if (project.members.some(m => m.userId === row.id)) {
        return { error: t('share.error.alreadyMember') };
      }

      this.isApplyingRemote = true;
      this.setSyncStatus('syncing');

      const { error: insertErr } = await supabase.from('project_members').insert({
        project_id: project.id,
        user_id: row.id,
        role: 'member'
      });

      if (insertErr) throw insertErr;

      project.members.push({
        projectId: project.id,
        userId: row.id,
        role: 'member',
        profile: {
          id: row.id,
          email: row.email,
          displayName: row.display_name,
          avatarColor: row.avatar_color || '#f59e0b'
        }
      });

      this.saveLocalCache();
      this.setSyncStatus('synced');
      this.notify();
      return { error: null };
    } catch (err) {
      console.error('Failed to invite member:', err);
      this.setSyncStatus('offline');
      return { error: err instanceof Error ? err.message : 'Failed to invite member' };
    } finally {
      this.isApplyingRemote = false;
    }
  }

  public removeMember(userId: string) {
    const project = this.getActiveProject();
    if (!project) return;

    const target = project.members.find(m => m.userId === userId);
    if (!target || target.role === 'owner') return;

    project.members = project.members.filter(m => m.userId !== userId);
    // Clear assignee on tasks assigned to removed member
    project.tasks.forEach(task => {
      if (task.assigneeId === userId) {
        task.assigneeId = null;
      }
    });

    this.saveLocalCache();
    this.notify();

    if (this.currentUserId) {
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const { error } = await supabase
            .from('project_members')
            .delete()
            .eq('project_id', project.id)
            .eq('user_id', userId);
          if (error) throw error;
          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to remove member in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }
  }

  // Sprint Management
  public getActiveSprint(project?: Project): Sprint | undefined {
    const targetProject = project || this.getActiveProject();
    if (!targetProject) return undefined;
    return targetProject.sprints.find(s => s.status === 'active');
  }

  public createSprint(name: string, goal: string, startDate?: string, endDate?: string): Sprint | null {
    const project = this.getActiveProject();
    if (!project) return null;

    const position = project.sprints.length;
    const newSprint: Sprint = {
      id: 'sprint-' + Date.now(),
      projectId: project.id,
      name: name.trim(),
      goal: goal.trim(),
      status: 'planned',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      position,
      createdAt: Date.now()
    };

    project.sprints.push(newSprint);
    this.saveLocalCache();
    this.notify();

    if (this.currentUserId) {
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const { error } = await supabase.from('sprints').insert(mapSprintToRow(newSprint));
          if (error) throw error;
          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to create sprint in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }

    return newSprint;
  }

  public startSprint(sprintId: string) {
    const project = this.getActiveProject();
    if (!project) return;

    const target = project.sprints.find(s => s.id === sprintId);
    if (!target) return;

    const updatedSprints: Sprint[] = [];
    for (const s of project.sprints) {
      if (s.id === sprintId) {
        s.status = 'active';
        if (!s.startDate) {
          s.startDate = new Date().toISOString().split('T')[0];
        }
        if (!s.endDate) {
          s.endDate = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];
        }
        updatedSprints.push(s);
      } else if (s.status === 'active') {
        s.status = 'planned';
        updatedSprints.push(s);
      }
    }

    this.saveLocalCache();
    this.notify();

    if (this.currentUserId && updatedSprints.length > 0) {
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const { error } = await supabase
            .from('sprints')
            .upsert(updatedSprints.map(mapSprintToRow), { onConflict: 'id' });
          if (error) throw error;
          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to start sprint in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }
  }

  public completeSprint(sprintId: string) {
    const project = this.getActiveProject();
    if (!project) return;

    const sprint = project.sprints.find(s => s.id === sprintId);
    if (!sprint) return;

    sprint.status = 'completed';

    const returnedTasks: { task: Task; idx: number }[] = [];
    project.tasks.forEach((task, idx) => {
      if (task.sprintId === sprintId && task.status !== 'done') {
        task.sprintId = null;
        task.updatedAt = Date.now();
        returnedTasks.push({ task, idx });
      }
    });

    this.saveLocalCache();
    this.notify();

    if (this.currentUserId) {
      const userId = this.currentUserId;
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const { error: sErr } = await supabase
            .from('sprints')
            .upsert(mapSprintToRow(sprint), { onConflict: 'id' });
          if (sErr) throw sErr;

          if (returnedTasks.length > 0) {
            const rows = returnedTasks.map(({ task, idx }) => mapTaskToRow(task, project.id, idx, userId));
            const { error: tErr } = await supabase.from('tasks').upsert(rows, { onConflict: 'id' });
            if (tErr) throw tErr;
          }

          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to complete sprint in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }
  }

  public deleteSprint(sprintId: string) {
    const project = this.getActiveProject();
    if (!project) return;

    project.sprints = project.sprints.filter(s => s.id !== sprintId);
    project.tasks.forEach(task => {
      if (task.sprintId === sprintId) {
        task.sprintId = null;
      }
    });

    this.saveLocalCache();
    this.notify();

    if (this.currentUserId) {
      void (async () => {
        try {
          this.isApplyingRemote = true;
          this.setSyncStatus('syncing');
          const { error } = await supabase.from('sprints').delete().eq('id', sprintId);
          if (error) throw error;
          this.setSyncStatus('synced');
        } catch (err) {
          console.error('Failed to delete sprint in Supabase:', err);
          this.setSyncStatus('offline');
        } finally {
          this.isApplyingRemote = false;
        }
      })();
    }
  }

  public assignTaskToSprint(taskId: string, sprintId: string | null) {
    this.updateTask(taskId, { sprintId });
  }

  // Tasks Management
  public getActiveProject(): Project | undefined {
    return this.state.projects.find(p => p.id === this.state.activeProjectId);
  }

  public addTask(
    title: string,
    column: TaskStatus,
    options?: {
      sprintId?: string | null;
      taskType?: TaskType;
      storyPoints?: number;
      assigneeId?: string | null;
    }
  ): Task | null {
    const project = this.state.projects.find(p => p.id === this.state.activeProjectId);
    if (!project) return null;

    const taskNum = project.tasks.length > 0 ? Math.max(...project.tasks.map(t => t.taskNum)) + 1 : 1;
    const position = project.tasks.length;
    const activeSprint = this.getActiveSprint(project);
    const defaultSprintId =
      options?.sprintId !== undefined
        ? options.sprintId
        : this.state.filters.boardScope === 'active_sprint' && activeSprint
        ? activeSprint.id
        : null;

    const newTask: Task = {
      id: `${project.key}-${taskNum}`,
      projectKey: project.key,
      taskNum,
      title: title.trim(),
      description: '',
      status: column,
      priority: 'medium',
      taskType: options?.taskType || 'task',
      storyPoints: options?.storyPoints ?? 0,
      sprintId: defaultSprintId,
      assigneeId: options?.assigneeId ?? null,
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
    this.saveLocalCache();
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
          userEmail: this.state.userEmail,
          currentUserProfile: this.state.currentUserProfile
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
