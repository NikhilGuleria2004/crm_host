export const ORGANIZATION_STATUSES = ['active', 'suspended'] as const;
export const USER_STATUSES = ['invited', 'active', 'suspended', 'deactivated'] as const;
export const LEAD_STATUSES = ['new', 'contacted', 'qualified', 'unqualified', 'converted'] as const;
export const DEAL_STATUSES = ['open', 'won', 'lost'] as const;
export const TASK_STATUSES = ['open', 'in_progress', 'completed', 'cancelled'] as const;
export const TASK_PRIORITIES = ['low', 'medium', 'high', 'urgent'] as const;
export const ACTIVITY_TYPES = ['call', 'email', 'meeting', 'demo', 'follow_up', 'note', 'other'] as const;

declare const process: {
  env: {
    NODE_ENV: string;
  };
};

export const DEFAULT_PIPELINE_STAGES = [
  { name: 'New', order: 0, probability: 10, isWon: false, isLost: false },
  { name: 'Qualified', order: 1, probability: 40, isWon: false, isLost: false },
  { name: 'Proposal', order: 2, probability: 70, isWon: false, isLost: false },
  { name: 'Negotiation', order: 3, probability: 85, isWon: false, isLost: false },
  { name: 'Closed Won', order: 4, probability: 100, isWon: true, isLost: false },
  { name: 'Closed Lost', order: 5, probability: 0, isWon: false, isLost: true },
] as const;

export const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP'] as const;
export const LOCALES = ['en', 'hi'] as const;
export const TIMEZONES = ['Asia/Kolkata', 'UTC', 'America/New_York', 'Europe/London'] as const;
export const DATE_FORMATS = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd'] as const;

export const PAGINATION = {
  DEFAULT_LIMIT: 50,
  MIN_LIMIT: 1,
  MAX_LIMIT: 100,
} as const;

export const SESSION = {
  TTL_DAYS: 30,
  COOKIE_NAME: 'crm_session',
  COOKIE_OPTIONS: {
    httpOnly: true,
    secure: typeof process !== 'undefined' && process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  },
};

export const RATE_LIMITS = {
  LOGIN: { windowMs: 15 * 60 * 1000, max: 5 },
  PASSWORD_RESET: { windowMs: 60 * 60 * 1000, max: 3 },
  REGISTER: { windowMs: 60 * 60 * 1000, max: 3 },
  API: { windowMs: 15 * 60 * 1000, max: 100 },
} as const;

export const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'image/png',
  'image/jpeg',
  'text/plain',
] as const;

export const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
