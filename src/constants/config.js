/**
 * Constants for Studivex
 * Centralized configuration and constants
 */

// ============================================
// Time Constants
// ============================================

export const TIME_CONSTANTS = {
  // Millisecond conversions
  MS_PER_SECOND: 1000,
  MS_PER_MINUTE: 60 * 1000,
  MS_PER_HOUR: 60 * 60 * 1000,
  MS_PER_DAY: 24 * 60 * 60 * 1000,
  MS_PER_WEEK: 7 * 24 * 60 * 60 * 1000,
  MS_PER_MONTH: 30 * 24 * 60 * 60 * 1000,
  MS_PER_YEAR: 365 * 24 * 60 * 60 * 1000,

  // Reminder defaults (in minutes)
  REMINDER_DEFAULT_BEFORE: 15,
  REMINDER_URGENT_BEFORE: 60,
  REMINDER_CRITICAL_BEFORE: 24 * 60, // 1 day
};

// ============================================
// Task Priority Constants
// ============================================

export const TASK_PRIORITY = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
};

export const PRIORITY_NAMES = {
  1: 'Low',
  2: 'Medium',
  3: 'High',
  4: 'Critical',
};

// ============================================
// Task Status Constants
// ============================================

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
  ABANDONED: 'abandoned',
};

// ============================================
// Reminder Configuration
// ============================================

export const REMINDER_CONFIG = {
  // Minimum hours before deadline to show reminder
  MIN_HOURS_BEFORE_SHOW: {
    [TASK_PRIORITY.LOW]: 48, // Show 2 days before
    [TASK_PRIORITY.MEDIUM]: 24, // Show 1 day before
    [TASK_PRIORITY.HIGH]: 12, // Show 12 hours before
    [TASK_PRIORITY.CRITICAL]: 1, // Show 1 hour before
  },

  // Cache duration for notification deduplication
  NOTIFICATION_CACHE_TTL: 30 * 60 * 1000, // 30 minutes

  // Quiet hours (no notifications)
  QUIET_HOURS_START: 23, // 11 PM
  QUIET_HOURS_END: 7, // 7 AM

  // Alarm check intervals
  CHECK_INTERVAL_MINUTES: 5,
  CACHE_CLEANUP_INTERVAL: 60,
};

// ============================================
// UI/UX Constants
// ============================================

export const UI_CONSTANTS = {
  // Popup dimensions
  POPUP_WIDTH: 400,
  POPUP_MAX_HEIGHT: 600,

  // Input constraints
  TASK_TITLE_MAX_LENGTH: 150,
  TASK_DESCRIPTION_MAX_LENGTH: 500,

  // Animation durations (ms)
  TRANSITION_DURATION: 200,
  ANIMATION_DURATION: 300,

  // Debounce/Throttle delays
  DEBOUNCE_DELAY: 300,
  THROTTLE_DELAY: 1000,
};

// ============================================
// Storage Constants
// ============================================

export const STORAGE_KEYS = {
  TASKS: 'studivex_tasks',
  SETTINGS: 'studivex_settings',
  METRICS: 'studivex_metrics',
  SESSION: 'studivex_session',
  LAST_SYNC: 'studivex_last_sync',
};

// ============================================
// Default Settings
// ============================================

export const DEFAULT_SETTINGS = {
  notifications_enabled: true,
  sound_enabled: true,
  dark_mode: false,
  auto_sort: 'priority', // 'priority' or 'date'
  reminder_minutes_before: REMINDER_CONFIG.REMINDER_DEFAULT_BEFORE,
  quiet_hours_enabled: true,
  show_completed_tasks: true,
  auto_archive_completed: false,
  archive_after_days: 30,
};

// ============================================
// Notification Types
// ============================================

export const NOTIFICATION_TYPES = {
  TASK_REMINDER: 'task_reminder',
  TASK_OVERDUE: 'task_overdue',
  TASK_COMPLETED: 'task_completed',
  MILESTONE: 'milestone',
  ERROR: 'error',
};

// ============================================
// Metric Events
// ============================================

export const METRIC_EVENTS = {
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  TASK_ABANDONED: 'task_abandoned',
  TASK_DELETED: 'task_deleted',
  REMINDER_SHOWN: 'reminder_shown',
  REMINDER_CLICKED: 'reminder_clicked',
  REMINDER_DISMISSED: 'reminder_dismissed',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  FOCUS_SESSION: 'focus_session',
  SETTING_CHANGED: 'setting_changed',
};

// ============================================
// Error Messages
// ============================================

export const ERROR_MESSAGES = {
  INVALID_TASK_TITLE: 'Task title is required',
  INVALID_DUE_DATE: 'Due date must be in the future',
  TASK_NOT_FOUND: 'Task not found',
  STORAGE_ERROR: 'Failed to access storage',
  NOTIFICATION_ERROR: 'Failed to show notification',
  INVALID_DATE: 'Invalid date format',
};

// ============================================
// Success Messages
// ============================================

export const SUCCESS_MESSAGES = {
  TASK_CREATED: 'Task created successfully',
  TASK_UPDATED: 'Task updated successfully',
  TASK_DELETED: 'Task deleted successfully',
  TASK_COMPLETED: 'Task completed! 🎉',
  REMINDER_SET: 'Reminder set successfully',
  SETTINGS_SAVED: 'Settings saved',
};

// ============================================
// Date Format Patterns
// ============================================

export const DATE_FORMATS = {
  ISO: 'YYYY-MM-DD',
  US: 'MM/DD/YYYY',
  EU: 'DD.MM.YYYY',
  DISPLAY: 'MMM DD, YYYY',
  DISPLAY_WITH_TIME: 'MMM DD, YYYY HH:mm',
};

// ============================================
// Color Palette
// ============================================

export const COLORS = {
  primary: '#4f46e5',
  primaryDark: '#4338ca',
  secondary: '#10b981',
  danger: '#ef4444',
  warning: '#f59e0b',
  info: '#3b82f6',
  success: '#10b981',

  // Priority colors
  priorityLow: '#dbeafe',
  priorityMedium: '#dcfce7',
  priorityHigh: '#fef3c7',
  priorityCritical: '#fee2e2',

  // Text
  textPrimary: '#1f2937',
  textSecondary: '#6b7280',
  textLight: '#9ca3af',

  // Backgrounds
  bgPrimary: '#ffffff',
  bgSecondary: '#f9fafb',
  border: '#e5e7eb',
};

// ============================================
// API Configuration
// ============================================

export const API_CONFIG = {
  TIMEOUT: 10000, // 10 seconds
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
};

// ============================================
// Feature Flags
// ============================================

export const FEATURE_FLAGS = {
  ENABLE_FOCUS_MODE: true,
  ENABLE_ANALYTICS: true,
  ENABLE_CLOUD_SYNC: false,
  ENABLE_DARK_MODE: true,
  ENABLE_BETA_FEATURES: false,
};

// ============================================
// Version Info
// ============================================

export const VERSION = {
  MAJOR: 1,
  MINOR: 0,
  PATCH: 0,
  BUILD: 'alpha',
  get FULL() {
    return `${this.MAJOR}.${this.MINOR}.${this.PATCH}-${this.BUILD}`;
  },
};

console.log(`Studivex v${VERSION.FULL} constants loaded`);
