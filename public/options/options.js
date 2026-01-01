/**
 * Studivex Options/Settings Page
 * Manages user settings and displays metrics
 */

// ============================================
// DOM Elements
// ============================================

const notificationsEnabledToggle = document.getElementById('notificationsEnabled');
const quietHoursEnabledToggle = document.getElementById('quietHoursEnabled');
const quietHoursStartInput = document.getElementById('quietHoursStart');
const quietHoursEndInput = document.getElementById('quietHoursEnd');
const quietHoursContainer = document.getElementById('quietHoursContainer');
const quietHoursEndContainer = document.getElementById('quietHoursEndContainer');
const themeSelect = document.getElementById('themeSelect');
const autoSortSelect = document.getElementById('autoSortSelect');
const clearDataBtn = document.getElementById('clearDataBtn');
const saveStatus = document.getElementById('saveStatus');

// Metric elements
const metricTodayRate = document.getElementById('metricTodayRate');
const metricTodayCreated = document.getElementById('metricTodayCreated');
const metricWeekRate = document.getElementById('metricWeekRate');
const metricTotalCreated = document.getElementById('metricTotalCreated');

// ============================================
// Constants
// ============================================

const SETTINGS_KEY = 'studivex_settings';

const DEFAULT_SETTINGS = {
  notifications_enabled: true,
  quiet_hours_enabled: true,
  quiet_hours_start: '23:00',
  quiet_hours_end: '07:00',
  theme: 'light',
  auto_sort: 'priority',
};

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadSettings();
  await loadMetrics();
  setupEventListeners();
});

/**
 * Load settings from storage
 */
async function loadSettings() {
  try {
    const result = await chrome.storage.local.get(SETTINGS_KEY);
    const settings = result[SETTINGS_KEY] || DEFAULT_SETTINGS;

    // Update UI
    notificationsEnabledToggle.checked = settings.notifications_enabled ?? true;
    quietHoursEnabledToggle.checked = settings.quiet_hours_enabled ?? true;
    quietHoursStartInput.value = settings.quiet_hours_start || '23:00';
    quietHoursEndInput.value = settings.quiet_hours_end || '07:00';
    themeSelect.value = settings.theme || 'light';
    autoSortSelect.value = settings.auto_sort || 'priority';

    // Show/hide quiet hours inputs
    toggleQuietHoursInputs();
  } catch (error) {
    console.error('Error loading settings:', error);
  }
}

/**
 * Load and display metrics
 */
async function loadMetrics() {
  try {
    const response = await fetch(chrome.runtime.getURL('../../src/utils/metrics.js'));
    
    // Get tasks to calculate metrics manually
    const tasksResult = await chrome.storage.local.get('studivex_tasks');
    const tasks = tasksResult.studivex_tasks || [];
    const metricsResult = await chrome.storage.local.get('studivex_metrics');
    const metrics = metricsResult.studivex_metrics;

    // Calculate today's metrics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tasksToday = tasks.filter(t => {
      const createdDate = new Date(t.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      return createdDate.getTime() === today.getTime();
    });

    const completedToday = tasksToday.filter(t => t.completed).length;
    const rateToday = tasksToday.length > 0 ? Math.round((completedToday / tasksToday.length) * 100) : 0;

    // Calculate this week's metrics
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    
    const tasksWeek = tasks.filter(t => {
      const createdDate = new Date(t.createdAt);
      createdDate.setHours(0, 0, 0, 0);
      return createdDate >= weekStart;
    });

    const completedWeek = tasksWeek.filter(t => t.completed).length;
    const rateWeek = tasksWeek.length > 0 ? Math.round((completedWeek / tasksWeek.length) * 100) : 0;

    // Update UI
    metricTodayRate.textContent = `${rateToday}%`;
    metricTodayCreated.textContent = tasksToday.length;
    metricWeekRate.textContent = `${rateWeek}%`;
    metricTotalCreated.textContent = tasks.length;
  } catch (error) {
    console.error('Error loading metrics:', error);
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  notificationsEnabledToggle.addEventListener('change', saveSettings);
  quietHoursEnabledToggle.addEventListener('change', () => {
    toggleQuietHoursInputs();
    saveSettings();
  });
  quietHoursStartInput.addEventListener('change', saveSettings);
  quietHoursEndInput.addEventListener('change', saveSettings);
  themeSelect.addEventListener('change', saveSettings);
  autoSortSelect.addEventListener('change', saveSettings);
  clearDataBtn.addEventListener('click', handleClearData);
}

/**
 * Toggle quiet hours input visibility
 */
function toggleQuietHoursInputs() {
  const isEnabled = quietHoursEnabledToggle.checked;
  quietHoursContainer.style.display = isEnabled ? 'flex' : 'none';
  quietHoursEndContainer.style.display = isEnabled ? 'flex' : 'none';
}

/**
 * Save settings to storage
 */
async function saveSettings() {
  try {
    const settings = {
      notifications_enabled: notificationsEnabledToggle.checked,
      quiet_hours_enabled: quietHoursEnabledToggle.checked,
      quiet_hours_start: quietHoursStartInput.value,
      quiet_hours_end: quietHoursEndInput.value,
      theme: themeSelect.value,
      auto_sort: autoSortSelect.value,
    };

    await chrome.storage.local.set({ [SETTINGS_KEY]: settings });

    // Show save status
    showSaveStatus();
  } catch (error) {
    console.error('Error saving settings:', error);
    saveStatus.textContent = '❌ Failed to save';
  }
}

/**
 * Show save status feedback
 */
function showSaveStatus() {
  saveStatus.textContent = '✓ Settings saved';
  saveStatus.style.color = 'var(--success-color)';

  setTimeout(() => {
    saveStatus.textContent = '✓ Settings saved';
  }, 3000);
}

/**
 * Clear all data
 */
async function handleClearData() {
  if (!confirm('Are you sure you want to delete all tasks, settings, and data? This cannot be undone.')) {
    return;
  }

  if (!confirm('This is your final warning. All data will be permanently deleted.')) {
    return;
  }

  try {
    clearDataBtn.disabled = true;
    clearDataBtn.textContent = 'Clearing...';

    // Clear all storage
    await chrome.storage.local.clear();

    // Reset UI
    await loadSettings();
    await loadMetrics();

    clearDataBtn.disabled = false;
    clearDataBtn.textContent = 'Clear All Data';

    alert('All data has been cleared.');
  } catch (error) {
    console.error('Error clearing data:', error);
    alert('Failed to clear data');
    clearDataBtn.disabled = false;
    clearDataBtn.textContent = 'Clear All Data';
  }
}
