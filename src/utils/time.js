/**
 * Time Utility Functions for Studivex
 * Handles timezone conversions, date calculations, and time formatting
 */

// ============================================
// Timezone Detection & Conversion
// ============================================

// Memoize timezone info (changes only on DST transitions, rare)
let cachedTimezoneInfo = null;
let lastTimezoneCheck = 0;
const TIMEZONE_CACHE_TTL = 60 * 60 * 1000; // 1 hour

/**
 * Get user's timezone info (memoized)
 * Caches result for 1 hour since it rarely changes
 * @returns {Object} Timezone details
 */
export function getTimezoneInfo() {
  const now = Date.now();

  // Return cached value if still valid
  if (cachedTimezoneInfo && now - lastTimezoneCheck < TIMEZONE_CACHE_TTL) {
    return cachedTimezoneInfo;
  }

  const nowDate = new Date();
  const offset = -nowDate.getTimezoneOffset();

  cachedTimezoneInfo = {
    offset: offset,
    offsetMinutes: offset * 60,
    name: Intl.DateTimeFormat().resolvedOptions().timeZone,
    isDST: isDaylightSavingTime(nowDate),
  };

  lastTimezoneCheck = now;
  return cachedTimezoneInfo;
}

/**
 * Check if date is in daylight saving time
 */
export function isDaylightSavingTime(date) {
  const jan = new Date(date.getFullYear(), 0, 1).getTimezoneOffset();
  const jul = new Date(date.getFullYear(), 6, 1).getTimezoneOffset();
  return Math.max(jan, jul) !== date.getTimezoneOffset();
}

/**
 * Format time for display with timezone
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time string
 */
export function formatTimeWithTimezone(date) {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    timeZoneName: 'short',
  });
  return formatter.format(d);
}

/**
 * Get current time in milliseconds
 * @returns {number} Current timestamp
 */
export function now() {
  return Date.now();
}

// ============================================
// Relative Time Calculations
// ============================================

/**
 * Calculate time until a deadline
 * @param {Date|string} deadline - Deadline date
 * @returns {Object} Time remaining details
 */
export function timeUntilDeadline(deadline) {
  const deadlineDate = new Date(deadline);
  const now = new Date();
  const diffMs = deadlineDate - now;

  if (diffMs < 0) {
    return {
      isOverdue: true,
      isUpcoming: false,
      daysOverdue: Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60 * 24)),
      hoursOverdue: Math.ceil(Math.abs(diffMs) / (1000 * 60 * 60)),
      minutesOverdue: Math.ceil(Math.abs(diffMs) / (1000 * 60)),
      display: '⚠️ Overdue',
    };
  }

  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

  let display = '';
  if (days > 0) {
    display = `${days}d ${hours}h`;
  } else if (hours > 0) {
    display = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    display = `${minutes}m`;
  } else {
    display = 'Due soon';
  }

  return {
    isOverdue: false,
    isUpcoming: diffMs < 60 * 60 * 1000, // Less than 1 hour
    days,
    hours,
    minutes,
    totalMinutes: Math.floor(diffMs / (1000 * 60)),
    totalSeconds: Math.floor(diffMs / 1000),
    display,
  };
}

/**
 * Check if deadline is urgent (less than 1 hour away)
 */
export function isUrgent(deadline) {
  const timeLeft = timeUntilDeadline(deadline);
  return timeLeft.totalMinutes < 60 && !timeLeft.isOverdue;
}

/**
 * Check if deadline is overdue
 */
export function isOverdue(deadline) {
  return timeUntilDeadline(deadline).isOverdue;
}

// ============================================
// Date Formatting
// ============================================

/**
 * Format date to readable string
 * Respects user's locale
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export function formatDate(date) {
  const d = new Date(date);
  const formatter = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined,
  });
  return formatter.format(d);
}

/**
 * Format date and time together
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted datetime
 */
export function formatDateTime(date) {
  const d = new Date(date);
  const dateStr = formatDate(d);
  const timeStr = d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
  return `${dateStr} at ${timeStr}`;
}

/**
 * Format time only
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted time
 */
export function formatTime(date) {
  const d = new Date(date);
  return d.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

/**
 * Get human-readable relative time
 * @param {Date|string} date - Date to format
 * @returns {string} Relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date) {
  const d = new Date(date);
  const now = new Date();
  const diffSeconds = Math.floor((now - d) / 1000);

  if (diffSeconds < 60) return 'just now';
  if (diffSeconds < 3600) return `${Math.floor(diffSeconds / 60)}m ago`;
  if (diffSeconds < 86400) return `${Math.floor(diffSeconds / 3600)}h ago`;
  if (diffSeconds < 604800) return `${Math.floor(diffSeconds / 86400)}d ago`;

  return formatDate(d);
}

// ============================================
// Time Calculations
// ============================================

/**
 * Add time to a date
 * @param {Date|string} date - Starting date
 * @param {number} value - Amount to add
 * @param {string} unit - Unit ('days', 'hours', 'minutes', 'seconds')
 * @returns {Date} New date
 */
export function addTime(date, value, unit = 'days') {
  const d = new Date(date);
  const unitMs = {
    days: 24 * 60 * 60 * 1000,
    hours: 60 * 60 * 1000,
    minutes: 60 * 1000,
    seconds: 1000,
  };

  d.setTime(d.getTime() + value * (unitMs[unit] || unitMs.days));
  return d;
}

/**
 * Subtract time from a date
 * @param {Date|string} date - Starting date
 * @param {number} value - Amount to subtract
 * @param {string} unit - Unit ('days', 'hours', 'minutes', 'seconds')
 * @returns {Date} New date
 */
export function subtractTime(date, value, unit = 'days') {
  return addTime(date, -value, unit);
}

/**
 * Get start of day
 * @param {Date|string} date - Input date
 * @returns {Date} Start of day (00:00:00)
 */
export function getStartOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Get end of day
 * @param {Date|string} date - Input date
 * @returns {Date} End of day (23:59:59)
 */
export function getEndOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/**
 * Get start of week (Monday)
 * @param {Date|string} date - Input date
 * @returns {Date} Start of week
 */
export function getStartOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

/**
 * Get start of month
 * @param {Date|string} date - Input date
 * @returns {Date} Start of month
 */
export function getStartOfMonth(date) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

// ============================================
// Comparison & Validation
// ============================================

/**
 * Check if two dates are on the same day
 */
export function isSameDay(date1, date2) {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/**
 * Check if date is today
 */
export function isToday(date) {
  return isSameDay(date, new Date());
}

/**
 * Check if date is in the past
 */
export function isPast(date) {
  return new Date(date) < new Date();
}

/**
 * Check if date is in the future
 */
export function isFuture(date) {
  return new Date(date) > new Date();
}

/**
 * Check if date is valid
 */
export function isValidDate(date) {
  const d = new Date(date);
  return d instanceof Date && !isNaN(d);
}

/**
 * Validate deadline is not in the past
 */
export function isValidDeadline(deadline) {
  if (!isValidDate(deadline)) return false;
  return isFuture(deadline);
}

// ============================================
// Business Hours
// ============================================

/**
 * Check if time is during business hours (9 AM - 5 PM)
 */
export function isBusinessHours(date) {
  const d = new Date(date);
  const hour = d.getHours();
  return hour >= 9 && hour < 17;
}

/**
 * Check if time is during working day (Monday-Friday)
 */
export function isWorkingDay(date) {
  const d = new Date(date);
  const day = d.getDay();
  return day !== 0 && day !== 6; // Not Saturday (6) or Sunday (0)
}

/**
 * Check if time is during quiet hours (for notifications)
 * Quiet hours: 11 PM - 7 AM
 */
export function isQuietHours(date) {
  const d = new Date(date);
  const hour = d.getHours();
  return hour >= 23 || hour < 7;
}

/**
 * Get next business day
 */
export function getNextBusinessDay(date = new Date()) {
  const d = new Date(date);
  d.setDate(d.getDate() + 1);

  while (!isWorkingDay(d)) {
    d.setDate(d.getDate() + 1);
  }

  return d;
}

// ============================================
// Statistics & Reporting
// ============================================

/**
 * Get days until deadline (excludes weekends)
 */
export function getBusinessDaysUntil(deadline) {
  const now = new Date();
  let current = new Date(now);
  let days = 0;

  current.setHours(0, 0, 0, 0);
  const deadlineDate = new Date(deadline);
  deadlineDate.setHours(0, 0, 0, 0);

  while (current < deadlineDate) {
    if (isWorkingDay(current)) {
      days++;
    }
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/**
 * Get week number of the year
 */
export function getWeekNumber(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));

  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNum = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);

  return weekNum;
}

console.log('Time utility initialized');
