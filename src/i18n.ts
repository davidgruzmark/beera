export type Language = 'en' | 'he';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Layout
    'nav.board': 'Kanban Board',
    'nav.backlog': 'Backlog & Sprints',
    'nav.dashboard': 'Dashboard',
    'nav.projects': 'Projects',
    'nav.newProject': 'New Project',
    'nav.theme.light': 'Light Mode',
    'nav.theme.dark': 'Dark Mode',
    'nav.lang.en': 'English',
    'nav.lang.he': 'עברית (Hebrew)',
    'nav.export': 'Export Data',
    'nav.import': 'Import Data',
    'nav.importSuccess': 'Data imported successfully.',
    'nav.importError': 'Failed to import data. Invalid format.',

    // Project Dialog
    'project.create.title': 'Create New Project',
    'project.name': 'Project Name',
    'project.key': 'Project Key (e.g., PROJ)',
    'project.desc': 'Description',
    'project.icon': 'Icon (Emoji)',
    'project.btn.create': 'Create Project',
    'project.btn.cancel': 'Cancel',
    'project.error.exists': 'A project with this key already exists.',
    'project.error.fields': 'Please fill in all fields. Project key must be 2-6 uppercase letters.',
    'project.empty.title': 'Welcome to your Workspace',
    'project.empty.desc': 'Create your first project to start tracking tasks.',

    // Board / Columns
    'column.todo': 'To Do',
    'column.inprogress': 'In Progress',
    'column.review': 'In Review',
    'column.done': 'Done',
    'board.search': 'Search tasks...',
    'board.filter.priority': 'All Priorities',
    'board.filter.tag': 'All Tags',
    'board.filter.assignee': 'All Members',
    'board.filter.myTasks': 'My Tasks',
    'board.mode.sprint': 'Active Sprint',
    'board.mode.all': 'All Tasks (Kanban)',
    'board.sprint.none': 'No active sprint — showing all tasks or start a sprint in Backlog.',
    'board.sprint.daysLeft': 'days left',
    'board.sprint.overdue': 'past end date',
    'board.task.add': 'Add task',
    'board.task.placeholder': 'What needs to be done?',

    // Priorities
    'priority.low': 'Low',
    'priority.medium': 'Medium',
    'priority.high': 'High',
    'priority.urgent': 'Urgent',

    // Issue Types
    'type.task': 'Task',
    'type.bug': 'Bug',
    'type.feature': 'Feature',
    'type.story': 'Story',

    // Sprints & Backlog
    'sprint.create': 'Create Sprint',
    'sprint.start': 'Start Sprint',
    'sprint.complete': 'Complete Sprint',
    'sprint.delete': 'Delete Sprint',
    'sprint.delete.confirm': 'Delete this sprint? Tasks inside will move back to the Product Backlog.',
    'sprint.complete.confirm': 'Complete this sprint? Any unfinished tasks will return to the Product Backlog.',
    'sprint.status.planned': 'Planned',
    'sprint.status.active': 'Active',
    'sprint.status.completed': 'Completed',
    'sprint.backlog.title': 'Product Backlog',
    'sprint.backlog.empty': 'No unassigned tasks in backlog.',
    'sprint.empty.tasks': 'Drag tasks here or add one below to plan this sprint.',
    'sprint.name': 'Sprint Name',
    'sprint.name.placeholder': 'e.g. Sprint 2 — Cloud Sync',
    'sprint.goal': 'Sprint Goal',
    'sprint.goal.placeholder': 'What is the main focus of this sprint?',
    'sprint.startDate': 'Start Date',
    'sprint.endDate': 'End Date',
    'sprint.points': 'pts',
    'sprint.tasksCount': 'tasks',
    'sprint.moveTo': 'Move to...',
    'sprint.noSprint': 'Backlog',
    'sprint.completedArchive': 'Completed Sprints',

    // Team & Sharing
    'share.btn': 'Share / Team',
    'share.title': 'Project Team & Sharing',
    'share.invite.label': 'Invite teammate by email (must have a Beera account)',
    'share.invite.placeholder': 'teammate@example.com',
    'share.invite.btn': 'Add to Board',
    'share.members.title': 'Board Members',
    'share.role.owner': 'Owner',
    'share.role.member': 'Member',
    'share.remove': 'Remove',
    'share.error.notFound': 'No registered Beera user found with this email.',
    'share.error.alreadyMember': 'This user is already a member of this board.',
    'share.success': 'Teammate added to board!',

    // Task Details Modal
    'task.modal.created': 'Created',
    'task.modal.updated': 'Updated',
    'task.modal.status': 'Status',
    'task.modal.priority': 'Priority',
    'task.modal.type': 'Issue Type',
    'task.modal.sprint': 'Sprint',
    'task.modal.assignee': 'Assignee',
    'task.modal.unassigned': 'Unassigned',
    'task.modal.storyPoints': 'Story Points',
    'task.modal.dueDate': 'Due Date',
    'task.modal.tags': 'Tags (comma separated)',
    'task.modal.desc': 'Description',
    'task.modal.desc.placeholder': 'Add a detailed description for this task...',
    'task.modal.subtasks': 'Subtasks / Checklist',
    'task.modal.subtask.add': 'Add subtask...',
    'task.modal.timeTracking': 'Time Tracking',
    'task.modal.time.estimated': 'Estimated (hours)',
    'task.modal.time.logged': 'Logged (hours)',
    'task.modal.comments': 'Activity & Comments',
    'task.modal.comment.add': 'Add a comment...',
    'task.modal.comment.btn': 'Comment',
    'task.modal.delete': 'Delete Task',
    'task.modal.delete.confirm': 'Are you sure you want to delete this task?',
    'task.modal.close': 'Close',

    // Dashboard
    'dash.totalTasks': 'Total Tasks',
    'dash.completedTasks': 'Completed Tasks',
    'dash.completionRate': 'Completion Rate',
    'dash.loggedHours': 'Total Hours Logged',
    'dash.estimatedHours': 'Total Estimated Hours',
    'dash.overdueTasks': 'Overdue Tasks',
    'dash.statusDist': 'Task Status Distribution',
    'dash.projectProgress': 'Project Progress Timeline',
    'dash.noTasks': 'No tasks in this project yet. Go to the Kanban Board to add tasks.',
    'dash.burnDown': 'Remaining Tasks Curve',
    'dash.storyPointsDone': 'Story Points Completed',
    'dash.teamWorkload': 'Workload by Team Member',
    'dash.activeSprint': 'Active Sprint Progress',

    // Cloud Sync Status
    'cloud.synced': 'Synced to Supabase Cloud',
    'cloud.syncing': 'Syncing to Cloud...',
    'cloud.offline': 'Offline (Local Cache)',
    'cloud.unauthenticated': 'Sign in required',

    // Authentication
    'auth.title.signin': 'Sign in to Beera',
    'auth.title.signup': 'Create your Beera Account',
    'auth.subtitle': 'Access your projects and tasks securely from anywhere in the world.',
    'auth.email': 'Email Address',
    'auth.password': 'Password (min 6 characters)',
    'auth.btn.signin': 'Sign In',
    'auth.btn.signup': 'Create Account',
    'auth.switch.toSignup': "Don't have an account? Sign Up",
    'auth.switch.toSignin': 'Already have an account? Sign In',
    'auth.signout': 'Sign Out',
    'auth.signup.checkEmail': 'Account created! If email confirmation is enabled in Supabase, please check your inbox.'
  },
  he: {
    // Navigation & Layout
    'nav.board': 'לוח קנבן',
    'nav.backlog': 'צבר וספרינטים',
    'nav.dashboard': 'מדדים וניתוח',
    'nav.projects': 'פרויקטים',
    'nav.newProject': 'פרויקט חדש',
    'nav.theme.light': 'מצב יום',
    'nav.theme.dark': 'מצב לילה',
    'nav.lang.en': 'English',
    'nav.lang.he': 'עברית',
    'nav.export': 'ייצוא נתונים',
    'nav.import': 'ייבוא נתונים',
    'nav.importSuccess': 'הנתונים יובאו בהצלחה.',
    'nav.importError': 'ייבוא הנתונים נכשל. פורמט שגוי.',

    // Project Dialog
    'project.create.title': 'יצירת פרויקט חדש',
    'project.name': 'שם הפרויקט',
    'project.key': 'מפתח פרויקט (למשל, PROJ)',
    'project.desc': 'תיאור פרויקט',
    'project.icon': 'סמל (אימוג׳י)',
    'project.btn.create': 'צור פרויקט',
    'project.btn.cancel': 'ביטול',
    'project.error.exists': 'פרויקט עם מפתח זה כבר קיים במערכת.',
    'project.error.fields': 'אנא מלא את כל השדות. מפתח הפרויקט חייב להכיל 2 עד 6 אותיות באנגלית (גדולות).',
    'project.empty.title': 'ברוכים הבאים לסביבת העבודה',
    'project.empty.desc': 'צור את הפרויקט הראשון שלך כדי להתחיל לנהל משימות.',

    // Board / Columns
    'column.todo': 'לביצוע',
    'column.inprogress': 'בתהליך',
    'column.review': 'בבחינה',
    'column.done': 'הושלם',
    'board.search': 'חיפוש משימות...',
    'board.filter.priority': 'כל העדיפויות',
    'board.filter.tag': 'כל התגיות',
    'board.filter.assignee': 'כל חברי הצוות',
    'board.filter.myTasks': 'המשימות שלי',
    'board.mode.sprint': 'ספרינט פעיל',
    'board.mode.all': 'כל המשימות (קאנבן)',
    'board.sprint.none': 'אין ספרינט פעיל — מוצגות כל המשימות, או הפעל ספרינט בצבר.',
    'board.sprint.daysLeft': 'ימים נותרו',
    'board.sprint.overdue': 'חריגה מתאריך סיום',
    'board.task.add': 'הוסף משימה',
    'board.task.placeholder': 'מה יש לעשות?',

    // Priorities
    'priority.low': 'נמוכה',
    'priority.medium': 'בינונית',
    'priority.high': 'גבוהה',
    'priority.urgent': 'דחופה',

    // Issue Types
    'type.task': 'משימה',
    'type.bug': 'באג',
    'type.feature': 'פיצ׳ר',
    'type.story': 'סיפור משתמש',

    // Sprints & Backlog
    'sprint.create': 'יצירת ספרינט',
    'sprint.start': 'התחל ספרינט',
    'sprint.complete': 'סיים ספרינט',
    'sprint.delete': 'מחק ספרינט',
    'sprint.delete.confirm': 'למחוק את הספרינט? המשימות שבו יחזרו אל צבר המוצר (Backlog).',
    'sprint.complete.confirm': 'לסיים את הספרינט? משימות שטרם הושלמו יוחזרו אל ה-Backlog.',
    'sprint.status.planned': 'מתוכנן',
    'sprint.status.active': 'פעיל',
    'sprint.status.completed': 'הושלם',
    'sprint.backlog.title': 'צבר משימות (Backlog)',
    'sprint.backlog.empty': 'אין משימות בצבר שאינן משויכות לספרינט.',
    'sprint.empty.tasks': 'גרור משימות לכאן או הוסף משימה חדשה לתכנון הספרינט.',
    'sprint.name': 'שם הספרינט',
    'sprint.name.placeholder': 'למשל, ספרינט 2 — חיבור לענן',
    'sprint.goal': 'מטרת הספרינט',
    'sprint.goal.placeholder': 'מה היעד המרכזי של הספרינט?',
    'sprint.startDate': 'תאריך התחלה',
    'sprint.endDate': 'תאריך סיום',
    'sprint.points': 'נק׳',
    'sprint.tasksCount': 'משימות',
    'sprint.moveTo': 'העבר אל...',
    'sprint.noSprint': 'Backlog',
    'sprint.completedArchive': 'ספרינטים שהושלמו',

    // Team & Sharing
    'share.btn': 'שיתוף וצוות',
    'share.title': 'צוות ושיתוף פרויקט',
    'share.invite.label': 'הזמן חבר צוות לפי אימייל (חייב להיות רשום ב-Beera)',
    'share.invite.placeholder': 'teammate@example.com',
    'share.invite.btn': 'הוסף ללוח',
    'share.members.title': 'חברי הלוח',
    'share.role.owner': 'בעלים',
    'share.role.member': 'חבר צוות',
    'share.remove': 'הסר',
    'share.error.notFound': 'לא נמצא משתמש רשום ב-Beera עם כתובת אימייל זו.',
    'share.error.alreadyMember': 'משתמש זה כבר חבר בלוח.',
    'share.success': 'חבר הצוות נוסף ללוח בהצלחה!',

    // Task Details Modal
    'task.modal.created': 'נוצר ב-',
    'task.modal.updated': 'עודכן ב-',
    'task.modal.status': 'סטטוס',
    'task.modal.priority': 'עדיפות',
    'task.modal.type': 'סוג פריט',
    'task.modal.sprint': 'ספרינט',
    'task.modal.assignee': 'אחראי',
    'task.modal.unassigned': 'ללא שיוך',
    'task.modal.storyPoints': 'נקודות מאמץ (Story Points)',
    'task.modal.dueDate': 'תאריך יעד',
    'task.modal.tags': 'תגיות (מופרדות בפסיקים)',
    'task.modal.desc': 'תיאור משימה',
    'task.modal.desc.placeholder': 'הוסף תיאור מפורט למשימה זו...',
    'task.modal.subtasks': 'תתי-משימות / רשימת תיוג',
    'task.modal.subtask.add': 'הוסף תת-משימה...',
    'task.modal.timeTracking': 'דיווח שעות',
    'task.modal.time.estimated': 'הערכה (שעות)',
    'task.modal.time.logged': 'מושקע (שעות)',
    'task.modal.comments': 'פעילות ותגובות',
    'task.modal.comment.add': 'כתוב תגובה...',
    'task.modal.comment.btn': 'הגב',
    'task.modal.delete': 'מחק משימה',
    'task.modal.delete.confirm': 'האם אתה בטוח שברצונך למחוק משימה זו?',
    'task.modal.close': 'סגור',

    // Dashboard
    'dash.totalTasks': 'סה״כ משימות',
    'dash.completedTasks': 'משימות שהושלמו',
    'dash.completionRate': 'אחוז השלמה',
    'dash.loggedHours': 'סה״כ שעות שהושקעו',
    'dash.estimatedHours': 'סה״כ שעות מוערכות',
    'dash.overdueTasks': 'משימות באיחור',
    'dash.statusDist': 'התפלגות סטטוס משימות',
    'dash.projectProgress': 'גרף התקדמות פרויקט',
    'dash.noTasks': 'אין עדיין משימות בפרויקט זה. עבר ללוח הקנבן כדי להוסיף משימה ראשונה.',
    'dash.burnDown': 'גרף ירידת עומס משימות',
    'dash.storyPointsDone': 'נקודות מאמץ שהושלמו',
    'dash.teamWorkload': 'חלוקת עומס לפי חבר צוות',
    'dash.activeSprint': 'התקדמות ספרינט פעיל',

    // Cloud Sync Status
    'cloud.synced': 'מסונכרן לענן (Supabase)',
    'cloud.syncing': 'מסנכרן לענן...',
    'cloud.offline': 'מצב לא מקוון (שמירה מקומית)',
    'cloud.unauthenticated': 'נדרשת התחברות',

    // Authentication
    'auth.title.signin': 'התחברות ל-Beera',
    'auth.title.signup': 'יצירת חשבון ב-Beera',
    'auth.subtitle': 'גישה מאובטחת לפרויקטים ולמשימות שלך מכל מקום בעולם.',
    'auth.email': 'כתובת אימייל',
    'auth.password': 'סיסמה (לפחות 6 תווים)',
    'auth.btn.signin': 'התחבר',
    'auth.btn.signup': 'צור חשבון',
    'auth.switch.toSignup': 'אין לך חשבון? הירשם כאן',
    'auth.switch.toSignin': 'יש לך כבר חשבון? התחבר',
    'auth.signout': 'התנתק',
    'auth.signup.checkEmail': 'החשבון נוצר! אם אימות מייל מופעל ב-Supabase, בדוק את תיבת הדואר שלך.'
  }
};

let currentLang: Language = 'en';

export function setLanguage(lang: Language) {
  currentLang = lang;
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === 'he' ? 'rtl' : 'ltr';
}

export function getLanguage(): Language {
  return currentLang;
}

export function t(key: string): string {
  return translations[currentLang]?.[key] || key;
}
