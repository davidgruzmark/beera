export type Language = 'en' | 'he';

const translations: Record<Language, Record<string, string>> = {
  en: {
    // Navigation & Layout
    'nav.board': 'Kanban Board',
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
    'board.task.add': 'Add task',
    'board.task.placeholder': 'What needs to be done?',

    // Priorities
    'priority.low': 'Low',
    'priority.medium': 'Medium',
    'priority.high': 'High',
    'priority.urgent': 'Urgent',

    // Task Details Modal
    'task.modal.created': 'Created',
    'task.modal.updated': 'Updated',
    'task.modal.status': 'Status',
    'task.modal.priority': 'Priority',
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
    'dash.burnDown': 'Remaining Tasks Curve'
  },
  he: {
    // Navigation & Layout
    'nav.board': 'לוח קנבן',
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
    'board.task.add': 'הוסף משימה',
    'board.task.placeholder': 'מה יש לעשות?',

    // Priorities
    'priority.low': 'נמוכה',
    'priority.medium': 'בינונית',
    'priority.high': 'גבוהה',
    'priority.urgent': 'דחופה',

    // Task Details Modal
    'task.modal.created': 'נוצר ב-',
    'task.modal.updated': 'עודכן ב-',
    'task.modal.status': 'סטטוס',
    'task.modal.priority': 'עדיפות',
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
    'dash.burnDown': 'גרף ירידת עומס משימות'
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
