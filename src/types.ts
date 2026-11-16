export type TaskStatus = 'todo' | 'inprogress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskType = 'task' | 'bug' | 'feature' | 'story';
export type SprintStatus = 'planned' | 'active' | 'completed';
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

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  avatarColor: string;
}

export interface ProjectMember {
  projectId: string;
  userId: string;
  role: 'owner' | 'member';
  profile: UserProfile;
}

export interface Sprint {
  id: string;
  projectId: string;
  name: string;
  goal: string;
  status: SprintStatus;
  startDate?: string; // YYYY-MM-DD
  endDate?: string;   // YYYY-MM-DD
  position: number;
  createdAt: number;
}

export interface Task {
  id: string; // e.g., "PROJ-1"
  projectKey: string;
  taskNum: number;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  taskType: TaskType;
  storyPoints: number;
  sprintId?: string | null;
  assigneeId?: string | null;
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
  ownerId?: string | null;
  sprints: Sprint[];
  members: ProjectMember[];
  tasks: Task[];
}

export interface AppFilters {
  search: string;
  priority: TaskPriority | 'all';
  tag: string | 'all';
  assignee: string | 'all' | 'me';
  boardScope: 'active_sprint' | 'all';
}

export interface AppState {
  projects: Project[];
  activeProjectId: string | null;
  currentView: 'board' | 'backlog' | 'dashboard';
  language: 'en' | 'he';
  theme: 'dark' | 'light';
  filters: AppFilters;
  syncStatus?: SyncStatus;
  userEmail?: string | null;
  currentUserProfile?: UserProfile | null;
}
