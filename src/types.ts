export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type SyncStatus = 'synced' | 'syncing' | 'offline' | 'unauthenticated';

export interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

export interface Comment {
  id: string;
  text: string;
  author: string;
  timestamp: number;
}

export interface Task {
  id: string; // e.g., "PROJ-1"
  projectKey: string;
  taskNum: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  subTasks: SubTask[];
  comments: Comment[];
  estimatedHours: number;
  loggedHours: number;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface Project {
  id: string;
  name: string;
  key: string; // e.g., "MKT"
  description: string;
  icon: string; // emoji or icon class
  tasks: Task[];
}

export interface AppFilters {
  search: string;
  priority: TaskPriority | 'all';
  tag: string | 'all';
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  currentView: 'board' | 'dashboard';
  language: 'en' | 'he';
  theme: 'dark' | 'light';
  filters: AppFilters;
  syncStatus?: SyncStatus;
  userEmail?: string | null;
}
