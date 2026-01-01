/**
 * Performance Metrics Service for Studivex
 * Tracks and analyzes:
 * - Task completion rate
 * - Average completion time
 * - Reminder effectiveness
 * 
 * Data-driven approach to validate productivity improvements
 */

import { getTasks } from './storage.js';

// ============================================
// Constants
// ============================================

const METRICS_STORAGE_KEY = 'studivex_metrics';
const SESSION_STORAGE_KEY = 'studivex_session';

// Metric types
export const METRIC_TYPES = {
  TASK_CREATED: 'task_created',
  TASK_COMPLETED: 'task_completed',
  TASK_ABANDONED: 'task_abandoned',
  REMINDER_SHOWN: 'reminder_shown',
  REMINDER_CLICKED: 'reminder_clicked',
  SESSION_START: 'session_start',
  SESSION_END: 'session_end',
  FOCUS_SESSION: 'focus_session',
};

// Time buckets for analysis
export const TIME_RANGES = {
  TODAY: 'today',
  THIS_WEEK: 'this_week',
  THIS_MONTH: 'this_month',
  ALL_TIME: 'all_time',
};

// ============================================
// Metrics Data Structure
// ============================================

/**
 * Initialize default metrics object
 */
function createDefaultMetrics() {
  return {
    version: '1.0.0',
    startDate: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    events: [], // Array of metric events
    summary: {
      totalTasksCreated: 0,
      totalTasksCompleted: 0,
      totalTasksAbandoned: 0,
      totalRemindersShown: 0,
      totalRemindersClicked: 0,
      totalSessionsStarted: 0,
      totalFocusTime: 0, // minutes
    },
  };
}

// ============================================
// Core Metric Recording
// ============================================

/**
 * Record a metric event
 * @param {string} type - Metric type (from METRIC_TYPES)
 * @param {Object} data - Additional metric data
 */
export async function recordMetric(type, data = {}) {
  try {
    const metrics = await getMetrics();

    const event = {
      type,
      timestamp: new Date().toISOString(),
      data,
    };

    // Add event to history
    metrics.events.push(event);

    // Update summary counters
    switch (type) {
      case METRIC_TYPES.TASK_CREATED:
        metrics.summary.totalTasksCreated++;
        break;
      case METRIC_TYPES.TASK_COMPLETED:
        metrics.summary.totalTasksCompleted++;
        break;
      case METRIC_TYPES.TASK_ABANDONED:
        metrics.summary.totalTasksAbandoned++;
        break;
      case METRIC_TYPES.REMINDER_SHOWN:
        metrics.summary.totalRemindersShown++;
        break;
      case METRIC_TYPES.REMINDER_CLICKED:
        metrics.summary.totalRemindersClicked++;
        break;
      case METRIC_TYPES.SESSION_START:
        metrics.summary.totalSessionsStarted++;
        break;
      case METRIC_TYPES.FOCUS_SESSION:
        if (data.duration) {
          metrics.summary.totalFocusTime += data.duration;
        }
        break;
    }

    metrics.lastUpdated = new Date().toISOString();

    // Keep only last 1000 events (prevent unbounded growth)
    if (metrics.events.length > 1000) {
      metrics.events = metrics.events.slice(-1000);
    }

    // Persist to storage
    await chrome.storage.local.set({
      [METRICS_STORAGE_KEY]: metrics,
    });

    return true;
  } catch (error) {
    console.error('Error recording metric:', error);
    return false;
  }
}

/**
 * Get all metrics
 */
export async function getMetrics() {
  try {
    const result = await chrome.storage.local.get(METRICS_STORAGE_KEY);
    return result[METRICS_STORAGE_KEY] || createDefaultMetrics();
  } catch (error) {
    console.error('Error retrieving metrics:', error);
    return createDefaultMetrics();
  }
}

/**
 * Clear all metrics (reset)
 */
export async function clearMetrics() {
  try {
    await chrome.storage.local.set({
      [METRICS_STORAGE_KEY]: createDefaultMetrics(),
    });
    return true;
  } catch (error) {
    console.error('Error clearing metrics:', error);
    return false;
  }
}

// ============================================
// Task Completion Analysis
// ============================================

/**
 * Calculate task completion rate
 * @param {string} timeRange - Time range for analysis (TODAY, THIS_WEEK, etc.)
 * @returns {Object} Completion rate metrics
 */
export async function getCompletionRate(timeRange = TIME_RANGES.ALL_TIME) {
  try {
    const tasks = await getTasks();
    const metrics = await getMetrics();
    const cutoffDate = getCutoffDate(timeRange);

    // Filter tasks created within time range
    const relevantTasks = tasks.filter(t => {
      const createdAt = new Date(t.createdAt);
      return createdAt >= cutoffDate;
    });

    if (relevantTasks.length === 0) {
      return {
        rate: 0,
        completed: 0,
        total: 0,
        abandoned: 0,
        timeRange,
      };
    }

    const completed = relevantTasks.filter(t => t.completed).length;
    const abandoned = relevantTasks.filter(t => t.status === 'abandoned').length;
    const rate = (completed / relevantTasks.length) * 100;

    return {
      rate: Math.round(rate * 10) / 10, // 1 decimal place
      completed,
      total: relevantTasks.length,
      abandoned,
      pending: relevantTasks.length - completed - abandoned,
      timeRange,
    };
  } catch (error) {
    console.error('Error calculating completion rate:', error);
    return null;
  }
}

/**
 * Calculate average completion time for tasks
 * @param {string} timeRange - Time range for analysis
 * @returns {Object} Average completion time metrics
 */
export async function getAverageCompletionTime(timeRange = TIME_RANGES.ALL_TIME) {
  try {
    const tasks = await getTasks();
    const cutoffDate = getCutoffDate(timeRange);

    // Filter completed tasks within time range
    const completedTasks = tasks.filter(t => {
      const createdAt = new Date(t.createdAt);
      return t.completed && t.completedAt && createdAt >= cutoffDate;
    });

    if (completedTasks.length === 0) {
      return {
        averageMinutes: 0,
        averageHours: 0,
        averageDays: 0,
        taskCount: 0,
        timeRange,
      };
    }

    // Calculate completion times
    const completionTimes = completedTasks.map(t => {
      const created = new Date(t.createdAt);
      const completed = new Date(t.completedAt);
      return completed - created; // milliseconds
    });

    const avgMs = completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length;

    return {
      averageMinutes: Math.round(avgMs / 60000),
      averageHours: Math.round(avgMs / 3600000 * 10) / 10,
      averageDays: Math.round(avgMs / 86400000 * 10) / 10,
      taskCount: completedTasks.length,
      timeRange,
      distribution: analyzeCompletionTimeDistribution(completionTimes),
    };
  } catch (error) {
    console.error('Error calculating average completion time:', error);
    return null;
  }
}

/**
 * Analyze distribution of completion times (for insights)
 */
function analyzeCompletionTimeDistribution(timesMs) {
  if (timesMs.length === 0) return null;

  const sorted = timesMs.sort((a, b) => a - b);
  const median = sorted[Math.floor(sorted.length / 2)];
  const min = sorted[0];
  const max = sorted[sorted.length - 1];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];

  return {
    medianMinutes: Math.round(median / 60000),
    fastestMinutes: Math.round(min / 60000),
    slowestHours: Math.round(max / 3600000),
    p75thPercentileHours: Math.round(p75 / 3600000),
  };
}

/**
 * Get task completion trend
 * Shows progression over time
 */
export async function getCompletionTrend() {
  try {
    const tasks = await getTasks();
    const oneMonthAgo = new Date();
    oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

    // Group by week
    const weeks = new Map();

    tasks
      .filter(t => new Date(t.createdAt) >= oneMonthAgo && t.completed)
      .forEach(t => {
        const created = new Date(t.createdAt);
        const weekStart = getWeekStart(created);
        const key = weekStart.toISOString().split('T')[0];

        if (!weeks.has(key)) {
          weeks.set(key, { week: key, completed: 0, total: 0 });
        }
        weeks.get(key).completed++;
      });

    // Add total counts per week
    tasks
      .filter(t => new Date(t.createdAt) >= oneMonthAgo)
      .forEach(t => {
        const created = new Date(t.createdAt);
        const weekStart = getWeekStart(created);
        const key = weekStart.toISOString().split('T')[0];

        if (!weeks.has(key)) {
          weeks.set(key, { week: key, completed: 0, total: 0 });
        }
        weeks.get(key).total++;
      });

    return Array.from(weeks.values())
      .sort((a, b) => new Date(a.week) - new Date(b.week))
      .map(w => ({
        ...w,
        rate: w.total > 0 ? Math.round((w.completed / w.total) * 100) : 0,
      }));
  } catch (error) {
    console.error('Error calculating completion trend:', error);
    return [];
  }
}

// ============================================
// Reminder Effectiveness Analysis
// ============================================

/**
 * Calculate reminder click-through rate
 * Measures how effective reminders are
 * @returns {Object} Reminder effectiveness metrics
 */
export async function getReminderEffectiveness() {
  try {
    const metrics = await getMetrics();

    const reminderShown = metrics.summary.totalRemindersShown || 0;
    const reminderClicked = metrics.summary.totalRemindersClicked || 0;

    if (reminderShown === 0) {
      return {
        clickThroughRate: 0,
        remindersShown: 0,
        remindersClicked: 0,
        impact: 'insufficient_data',
      };
    }

    const ctr = (reminderClicked / reminderShown) * 100;

    // Estimate impact on completion rate
    let impact = 'low';
    if (ctr > 40) {
      impact = 'high'; // More than 40% of reminders result in action
    } else if (ctr > 20) {
      impact = 'medium';
    }

    return {
      clickThroughRate: Math.round(ctr * 10) / 10,
      remindersShown,
      remindersClicked,
      impact,
      engagementScore: calculateEngagementScore(ctr, reminderShown),
    };
  } catch (error) {
    console.error('Error calculating reminder effectiveness:', error);
    return null;
  }
}

/**
 * Calculate engagement score
 * Weighted by both CTR and volume
 */
function calculateEngagementScore(ctr, volume) {
  // Base score on CTR (0-50 points)
  const ctrScore = Math.min(50, ctr / 2);

  // Bonus for high volume engagement
  const volumeBonus = Math.min(50, volume / 100);

  return Math.round(ctrScore + volumeBonus);
}

/**
 * Get impact of reminders on task completion
 * Compare completion rates with and without reminders
 */
export async function getReminderImpactOnCompletion() {
  try {
    const tasks = await getTasks();
    const metrics = await getMetrics();

    // Tasks that had reminders triggered
    const tasksWithReminders = tasks.filter(t =>
      metrics.events.some(
        e =>
          e.type === METRIC_TYPES.REMINDER_SHOWN &&
          e.data.taskId === t.id
      )
    );

    // Tasks without reminders
    const tasksWithoutReminders = tasks.filter(
      t => !tasksWithReminders.includes(t)
    );

    const completionWithReminders = tasksWithReminders.length > 0
      ? (tasksWithReminders.filter(t => t.completed).length / tasksWithReminders.length) * 100
      : 0;

    const completionWithoutReminders = tasksWithoutReminders.length > 0
      ? (tasksWithoutReminders.filter(t => t.completed).length / tasksWithoutReminders.length) * 100
      : 0;

    const improvement = completionWithReminders - completionWithoutReminders;

    return {
      completionWithReminders: Math.round(completionWithReminders * 10) / 10,
      completionWithoutReminders: Math.round(completionWithoutReminders * 10) / 10,
      improvementPercentage: Math.round(improvement * 10) / 10,
      tasksAnalyzed: tasksWithReminders.length + tasksWithoutReminders.length,
      confidence: getConfidenceLevel(tasksWithReminders.length),
    };
  } catch (error) {
    console.error('Error calculating reminder impact:', error);
    return null;
  }
}

/**
 * Get confidence level based on sample size
 */
function getConfidenceLevel(sampleSize) {
  if (sampleSize < 10) return 'low'; // Not enough data
  if (sampleSize < 30) return 'medium';
  if (sampleSize < 100) return 'high';
  return 'very_high';
}

// ============================================
// Productivity Insights
// ============================================

/**
 * Generate comprehensive productivity report
 * Can be used for "claims" like "Improved efficiency by X%"
 */
export async function getProductivityReport(timeRange = TIME_RANGES.THIS_MONTH) {
  try {
    const completionRate = await getCompletionRate(timeRange);
    const avgCompletionTime = await getAverageCompletionTime(timeRange);
    const reminderEffectiveness = await getReminderEffectiveness();
    const reminderImpact = await getReminderImpactOnCompletion();
    const metrics = await getMetrics();

    return {
      generatedAt: new Date().toISOString(),
      timeRange,
      summary: {
        totalTasksCreated: metrics.summary.totalTasksCreated,
        totalTasksCompleted: metrics.summary.totalTasksCompleted,
        totalRemindersShown: metrics.summary.totalRemindersShown,
      },
      completionRate,
      averageCompletionTime: avgCompletionTime,
      reminderEffectiveness,
      reminderImpact,
      // Key claims
      claims: generateClaims(
        completionRate,
        avgCompletionTime,
        reminderImpact
      ),
    };
  } catch (error) {
    console.error('Error generating productivity report:', error);
    return null;
  }
}

/**
 * Generate data-backed claims
 */
function generateClaims(completionRate, avgCompletionTime, reminderImpact) {
  const claims = [];

  // Completion rate claim
  if (completionRate && completionRate.rate > 50) {
    claims.push({
      type: 'completion_rate',
      claim: `Achieving ${completionRate.rate}% task completion rate`,
      metric: `${completionRate.completed}/${completionRate.total} tasks completed`,
      timeRange: completionRate.timeRange,
    });
  }

  // Completion time claim
  if (avgCompletionTime && avgCompletionTime.averageHours > 0) {
    claims.push({
      type: 'completion_speed',
      claim: `Average task completion time: ${avgCompletionTime.averageHours} hours`,
      metric: `${avgCompletionTime.taskCount} tasks analyzed`,
      improvement: 'Faster completion reduces context switching',
    });
  }

  // Reminder impact claim (THIS IS THE BIG ONE)
  if (reminderImpact && reminderImpact.improvementPercentage > 0) {
    claims.push({
      type: 'reminder_impact',
      claim: `Reminders improved task completion efficiency by ~${Math.round(reminderImpact.improvementPercentage)}%`,
      metric: `With reminders: ${reminderImpact.completionWithReminders}% | Without: ${reminderImpact.completionWithoutReminders}%`,
      confidence: reminderImpact.confidence,
      sample_size: reminderImpact.tasksAnalyzed,
      explanation: `Based on analysis of ${reminderImpact.tasksAnalyzed} tasks over time`,
    });
  }

  return claims;
}

// ============================================
// Utility Functions
// ============================================

// Memoize cutoff dates to avoid recalculation
const cutoffDateCache = new Map();

/**
 * Get cutoff date based on time range (memoized)
 * Caches for current day to avoid redundant calculations
 */
function getCutoffDate(timeRange) {
  // Check cache first
  const cacheKey = `${timeRange}_${new Date().toDateString()}`;
  if (cutoffDateCache.has(cacheKey)) {
    return cutoffDateCache.get(cacheKey);
  }

  const now = new Date();
  let result;

  switch (timeRange) {
    case TIME_RANGES.TODAY:
      result = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;

    case TIME_RANGES.THIS_WEEK: {
      result = getWeekStart(now);
      break;
    }

    case TIME_RANGES.THIS_MONTH:
      result = new Date(now.getFullYear(), now.getMonth(), 1);
      break;

    case TIME_RANGES.ALL_TIME:
    default:
      result = new Date(0); // Unix epoch
  }

  // Cache the result (max 5 entries to prevent memory bloat)
  if (cutoffDateCache.size >= 5) {
    const firstKey = cutoffDateCache.keys().next().value;
    cutoffDateCache.delete(firstKey);
  }
  cutoffDateCache.set(cacheKey, result);

  return result;
}

/**
 * Get start of week (Monday)
 */
function getWeekStart(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

/**
 * Export metrics as JSON for external analysis
 */
export async function exportMetrics() {
  try {
    const metrics = await getMetrics();
    const report = await getProductivityReport();

    return {
      metrics,
      report,
      exportedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error exporting metrics:', error);
    return null;
  }
}

/**
 * Compare metrics between two time periods
 */
export async function compareTimePeriods(period1, period2) {
  try {
    const rate1 = await getCompletionRate(period1);
    const rate2 = await getCompletionRate(period2);
    const time1 = await getAverageCompletionTime(period1);
    const time2 = await getAverageCompletionTime(period2);

    return {
      period1: { rate: rate1, avgTime: time1 },
      period2: { rate: rate2, avgTime: time2 },
      changes: {
        completionRateChange: (rate2.rate - rate1.rate).toFixed(1),
        completionTimeChange: (time2.averageMinutes - time1.averageMinutes).toFixed(0),
      },
    };
  } catch (error) {
    console.error('Error comparing time periods:', error);
    return null;
  }
}

// ============================================
// Session Tracking
// ============================================

/**
 * Start a session
 */
export async function startSession() {
  const sessionId = `session_${Date.now()}`;
  const session = {
    id: sessionId,
    startTime: Date.now(),
    tasksCreated: 0,
    tasksCompleted: 0,
  };

  await chrome.storage.session.setItem(SESSION_STORAGE_KEY, session);
  await recordMetric(METRIC_TYPES.SESSION_START, { sessionId });

  return sessionId;
}

/**
 * End current session
 */
export async function endSession() {
  try {
    const session = await chrome.storage.session.getItem(SESSION_STORAGE_KEY);
    if (!session) return false;

    const duration = Date.now() - session.startTime;
    await recordMetric(METRIC_TYPES.SESSION_END, {
      duration,
      tasksCreated: session.tasksCreated,
      tasksCompleted: session.tasksCompleted,
    });

    await chrome.storage.session.removeItem(SESSION_STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error ending session:', error);
    return false;
  }
}

console.log('Metrics service initialized');
