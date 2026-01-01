/**
 * Popup Script for Studivex
 * Manages popup UI and task interactions
 * Uses event delegation and efficient rendering
 */

// ============================================
// DOM Elements
// ============================================

const taskInput = document.getElementById('taskInput');
const prioritySelect = document.getElementById('prioritySelect');
const descriptionInput = document.getElementById('descriptionInput');
const timeEstimateInput = document.getElementById('timeEstimateInput');
const dueDateInput = document.getElementById('dueDateInput');
const addTaskBtn = document.getElementById('addTaskBtn');
const tasksList = document.getElementById('tasksList');
const taskCount = document.getElementById('taskCount');
const settingsBtn = document.getElementById('settingsBtn');
const clearBtn = document.getElementById('clearBtn');
const sortSelect = document.getElementById('sortSelect');
const darkModeBtn = document.getElementById('darkModeBtn');
const focusModal = document.getElementById('focusModal');
const focusCloseBtn = document.getElementById('focusCloseBtn');
const focusTaskTitle = document.getElementById('focusTaskTitle');
const timerStartBtn = document.getElementById('timerStartBtn');
const timerPauseBtn = document.getElementById('timerPauseBtn');
const timerResetBtn = document.getElementById('timerResetBtn');
const timerValue = document.getElementById('timerValue');
const timerProgressBar = document.getElementById('timerProgressBar');

// ============================================
// State Management
// ============================================

let tasks = [];
let isLoading = false;
let currentFilter = 'all';
let currentSort = 'priority';

// Timer state
let timerInterval = null;
let timerRunning = false;
let timerDuration = 0; // in seconds
let timerRemaining = 0;
let currentFocusTask = null;

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  loadDarkMode();
  await loadTasks();
  setupEventListeners();
  setupStorageListener();
});

/**
 * Listen for storage changes from background script
 */
function setupStorageListener() {
  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === 'local' && changes.studivex_tasks) {
      // Reload tasks when storage changes
      loadTasks();
    }
  });
}

/**
 * Setup all event listeners
 * Uses event delegation for efficient event handling
 */
function setupEventListeners() {
  // Add task button
  addTaskBtn.addEventListener('click', handleAddTask);

  // Enter key on input
  taskInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleAddTask();
  });

  // Event delegation for task list
  tasksList.addEventListener('click', handleTaskListClick);

  // Settings button
  settingsBtn.addEventListener('click', () => {
    chrome.runtime.openOptionsPage();
  });

  // Clear completed tasks
  clearBtn.addEventListener('click', handleClearCompleted);

  // Filter buttons
  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');
      currentFilter = e.target.dataset.filter;
      renderTasks();
    });
  });

  // Sort select
  sortSelect.addEventListener('change', (e) => {
    currentSort = e.target.value;
    renderTasks();
  });

  // Dark mode toggle
  darkModeBtn.addEventListener('click', toggleDarkMode);

  // Focus timer modal
  focusCloseBtn.addEventListener('click', closeFocusModal);
  timerStartBtn.addEventListener('click', startTimer);
  timerPauseBtn.addEventListener('click', pauseTimer);
  timerResetBtn.addEventListener('click', resetTimer);
}

// ============================================
// Dark Mode
// ============================================

/**
 * Load dark mode preference from storage
 */
async function loadDarkMode() {
  try {
    const result = await chrome.storage.local.get('studivex_dark_mode');
    const isDarkMode = result.studivex_dark_mode ?? false;
    
    if (isDarkMode) {
      document.documentElement.classList.add('dark-mode');
      darkModeBtn.textContent = '☀️';
    }
  } catch (error) {
    console.error('Error loading dark mode preference:', error);
  }
}

/**
 * Toggle dark mode
 */
async function toggleDarkMode() {
  const isDarkMode = document.documentElement.classList.toggle('dark-mode');
  darkModeBtn.textContent = isDarkMode ? '☀️' : '🌙';
  
  try {
    await chrome.storage.local.set({ studivex_dark_mode: isDarkMode });
  } catch (error) {
    console.error('Error saving dark mode preference:', error);
  }
}

// ============================================
// Task Management
// ============================================

/**
 * Load tasks from storage via background script
 */
async function loadTasks() {
  try {
    isLoading = true;
    const response = await chrome.runtime.sendMessage({ action: 'GET_TASKS' });
    
    if (response?.success) {
      tasks = response.data || [];
    } else {
      tasks = [];
    }

    renderTasks();
  } catch (error) {
    console.error('Error loading tasks:', error);
    showError('Failed to load tasks');
  } finally {
    isLoading = false;
  }
}

/**
 * Add a new task
 */
async function handleAddTask() {
  const title = taskInput.value.trim();

  if (!title) {
    taskInput.focus();
    return;
  }

  if (isLoading) return;

  try {
    isLoading = true;
    addTaskBtn.disabled = true;

    const response = await chrome.runtime.sendMessage({
      action: 'ADD_TASK',
      payload: {
        title,
        priority: parseInt(prioritySelect.value, 10),
        description: descriptionInput.value.trim() || null,
        timeEstimate: timeEstimateInput.value ? parseInt(timeEstimateInput.value, 10) : null,
        dueDate: dueDateInput.value ? new Date(dueDateInput.value).toISOString() : null,
      },
    });

    if (response?.success) {
      // Reload tasks from storage to ensure consistency
      await loadTasks();

      // Clear input
      taskInput.value = '';
      descriptionInput.value = '';
      timeEstimateInput.value = '';
      dueDateInput.value = '';
      taskInput.focus();
    } else {
      showError(response?.error || 'Failed to add task');
    }
  } catch (error) {
    console.error('Error adding task:', error);
    showError('Failed to add task');
  } finally {
    isLoading = false;
    addTaskBtn.disabled = false;
  }
}

/**
 * Handle task list clicks with event delegation
 */
function handleTaskListClick(e) {
  const taskElement = e.target.closest('[data-task-id]');
  if (!taskElement) return;

  const taskId = taskElement.dataset.taskId;

  // Delete button
  if (e.target.closest('.task-delete')) {
    handleDeleteTask(taskId);
    return;
  }

  // Checkbox
  if (e.target.type === 'checkbox') {
    handleToggleTask(taskId, e.target.checked);
    return;
  }

  // Open focus timer on task click
  const task = tasks.find(t => t.id === taskId);
  if (task && !task.completed) {
    openFocusModal(task);
  }
}

/**
 * Toggle task completion status
 */
async function handleToggleTask(taskId, isChecked) {
  try {
    const response = await chrome.runtime.sendMessage({
      action: 'TOGGLE_TASK',
      payload: { taskId, completed: isChecked },
    });

    if (response?.success) {
      // Update local state
      const task = tasks.find(t => t.id === taskId);
      if (task) {
        task.completed = isChecked;
        // Only update the specific task element (efficient!)
        updateTaskElement(taskId);
      }
    } else {
      showError(response?.error || 'Failed to update task');
    }
  } catch (error) {
    console.error('Error toggling task:', error);
    showError('Failed to update task');
  }
}

/**
 * Delete a task
 */
async function handleDeleteTask(taskId) {
  if (!confirm('Delete this task?')) return;

  try {
    const response = await chrome.runtime.sendMessage({
      action: 'DELETE_TASK',
      payload: { taskId },
    });

    if (response?.success) {
      // Remove from local state
      tasks = tasks.filter(t => t.id !== taskId);
      renderTasks();
    } else {
      showError(response?.error || 'Failed to delete task');
    }
  } catch (error) {
    console.error('Error deleting task:', error);
    showError('Failed to delete task');
  }
}

/**
 * Clear all completed tasks
 */
async function handleClearCompleted() {
  const completedTasks = tasks.filter(t => t.completed);
  
  if (completedTasks.length === 0) {
    showError('No completed tasks to clear');
    return;
  }

  if (!confirm(`Clear ${completedTasks.length} completed task(s)?`)) return;

  try {
    clearBtn.disabled = true;
    const response = await chrome.runtime.sendMessage({
      action: 'CLEAR_COMPLETED',
    });

    if (response?.success) {
      // Reload tasks from storage
      await loadTasks();
    } else {
      showError(response?.error || 'Failed to clear tasks');
    }
  } catch (error) {
    console.error('Error clearing completed tasks:', error);
    showError('Failed to clear tasks');
  } finally {
    clearBtn.disabled = false;
  }
}

// ============================================
// Focus Session Timer
// ============================================

/**
 * Open focus session modal
 */
function openFocusModal(task) {
  currentFocusTask = task;
  focusTaskTitle.textContent = task.title;
  
  // Set timer duration from task estimate or 25 minutes default
  timerDuration = (task.timeEstimate || 25) * 60; // Convert to seconds
  timerRemaining = timerDuration;
  
  updateTimerDisplay();
  focusModal.classList.remove('hidden');
  
  // Reset buttons
  timerStartBtn.disabled = false;
  timerPauseBtn.disabled = true;
}

/**
 * Close focus modal
 */
function closeFocusModal() {
  stopTimer();
  focusModal.classList.add('hidden');
  currentFocusTask = null;
}

/**
 * Start timer
 */
function startTimer() {
  if (timerRunning) return;
  
  timerRunning = true;
  timerStartBtn.disabled = true;
  timerPauseBtn.disabled = false;
  
  timerInterval = setInterval(() => {
    timerRemaining--;
    updateTimerDisplay();
    
    if (timerRemaining <= 0) {
      completeTimer();
    }
  }, 1000);
}

/**
 * Pause timer
 */
function pauseTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerStartBtn.disabled = false;
  timerPauseBtn.disabled = true;
}

/**
 * Stop timer
 */
function stopTimer() {
  timerRunning = false;
  clearInterval(timerInterval);
  timerStartBtn.disabled = false;
  timerPauseBtn.disabled = true;
}

/**
 * Reset timer
 */
function resetTimer() {
  stopTimer();
  timerRemaining = timerDuration;
  updateTimerDisplay();
}

/**
 * Timer completed
 */
function completeTimer() {
  stopTimer();
  
  // Show notification
  chrome.notifications.create(`focus_complete_${Date.now()}`, {
    type: 'basic',
    title: '✅ Focus Session Complete!',
    message: `Great job! You completed: ${currentFocusTask.title}`,
    iconUrl: 'public/assets/icons/icon-128.png',
    priority: 2,
  });
  
  // Close modal after 2 seconds
  setTimeout(() => {
    closeFocusModal();
  }, 2000);
}

/**
 * Update timer display
 */
function updateTimerDisplay() {
  const minutes = Math.floor(timerRemaining / 60);
  const seconds = timerRemaining % 60;
  timerValue.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  
  // Update progress bar
  const progress = ((timerDuration - timerRemaining) / timerDuration) * 100;
  timerProgressBar.style.width = `${progress}%`;
}

// ============================================
// Rendering
// ============================================

/**
 * Efficient task list rendering
 * Handles empty state and task items with filtering and sorting
 */
function renderTasks() {
  // Clear current list
  tasksList.innerHTML = '';

  // Apply filter
  let filteredTasks = tasks.filter(task => {
    if (currentFilter === 'active') return !task.completed;
    if (currentFilter === 'completed') return task.completed;
    return true; // 'all'
  });

  // Apply sort
  filteredTasks.sort((a, b) => {
    switch (currentSort) {
      case 'priority':
        return b.priority - a.priority; // High to low
      case 'date':
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      case 'time':
        if (!a.timeEstimate && !b.timeEstimate) return 0;
        if (!a.timeEstimate) return 1;
        if (!b.timeEstimate) return -1;
        return a.timeEstimate - b.timeEstimate;
      case 'created':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt);
    }
  });

  if (filteredTasks.length === 0) {
    tasksList.appendChild(createEmptyState());
  } else {
    // Use DocumentFragment to minimize reflows
    const fragment = document.createDocumentFragment();
    filteredTasks.forEach(task => {
      fragment.appendChild(createTaskElement(task));
    });
    tasksList.appendChild(fragment);
  }

  // Update task count
  updateTaskCount();
}

/**
 * Create empty state element
 */
function createEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `
    <p>🎯 No tasks yet</p>
    <p class="empty-state-hint">Add a task to get started!</p>
  `;
  return div;
}

/**
 * Create a task element
 */
function createTaskElement(task) {
  const div = document.createElement('div');
  div.className = 'task-item';
  div.dataset.taskId = task.id;
  div.setAttribute('role', 'listitem');

  const priorityLabel = getPriorityLabel(task.priority);
  const priorityClass = `priority-${getPriorityClass(task.priority)}`;
  const dueDate = task.dueDate ? new Date(task.dueDate) : null;
  const dueDateStr = dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
  const isOverdue = dueDate && dueDate < new Date() && !task.completed;
  const dueClass = isOverdue ? ' overdue' : '';
  const timeEstimate = task.timeEstimate ? `${task.timeEstimate}m` : '';

  div.innerHTML = `
    <input
      type="checkbox"
      class="task-checkbox"
      ${task.completed ? 'checked' : ''}
      aria-label="Mark task as done"
    />
    <div class="task-content">
      <div class="task-title ${task.completed ? 'completed' : ''}">
        ${escapeHtml(task.title)}
      </div>
      ${task.description ? `<div class="task-description">${escapeHtml(task.description)}</div>` : ''}
      <div class="task-meta">
        <span class="task-priority ${priorityClass}">
          ${priorityLabel}
        </span>
        ${dueDateStr ? `<span class="task-due-date${dueClass}">${dueDateStr}</span>` : ''}
        ${timeEstimate ? `<span class="task-time-estimate">⏱️ ${timeEstimate}</span>` : ''}
      </div>
    </div>
    <button
      class="task-delete"
      aria-label="Delete task"
      type="button"
    >
      🗑️
    </button>
  `;

  return div;
}

/**
 * Update a single task element without full re-render
 * Performance optimization for toggle operations
 */
function updateTaskElement(taskId) {
  const element = tasksList.querySelector(`[data-task-id="${taskId}"]`);
  if (!element) return;

  const task = tasks.find(t => t.id === taskId);
  if (!task) return;

  const checkbox = element.querySelector('.task-checkbox');
  const titleElement = element.querySelector('.task-title');

  checkbox.checked = task.completed;
  titleElement.classList.toggle('completed', task.completed);

  updateTaskCount();
}

/**
 * Update task count badge
 */
function updateTaskCount() {
  const activeCount = tasks.filter(t => !t.completed).length;
  taskCount.textContent = activeCount;
  taskCount.setAttribute('aria-label', `${activeCount} active task${activeCount !== 1 ? 's' : ''}`);
}

// ============================================
// Utility Functions
// ============================================

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, char => map[char]);
}

// Priority label and class mappings (memoized for performance)
const priorityLabelMap = { 1: 'Low', 2: 'Medium', 3: 'High', 4: 'Critical' };
const priorityClassMap = { 1: 'low', 2: 'medium', 3: 'high', 4: 'critical' };
const priorityLabelCache = {};
const priorityClassCache = {};

/**
 * Get priority label from priority level (memoized)
 */
function getPriorityLabel(priority) {
  return priorityLabelCache[priority] ??= priorityLabelMap[priority] || 'Medium';
}

/**
 * Get priority CSS class (memoized)
 */
function getPriorityClass(priority) {
  return priorityClassCache[priority] ??= priorityClassMap[priority] || 'medium';
}

/**
 * Show error message to user
 * Replaces error display in empty state
 */
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'empty-state';
  errorDiv.style.color = '#ef4444';
  errorDiv.innerHTML = `<p>❌ ${escapeHtml(message)}</p>`;
  
  tasksList.innerHTML = '';
  tasksList.appendChild(errorDiv);

  // Auto-dismiss after 3 seconds
  setTimeout(() => loadTasks(), 3000);
}

// ============================================
// Message Listener (for background updates)
// ============================================

/**
 * Listen for updates from background script
 */
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'TASKS_UPDATED') {
    loadTasks();
  }
});
