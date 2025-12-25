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
const addTaskBtn = document.getElementById('addTaskBtn');
const tasksList = document.getElementById('tasksList');
const taskCount = document.getElementById('taskCount');
const settingsBtn = document.getElementById('settingsBtn');
const clearBtn = document.getElementById('clearBtn');

// ============================================
// State Management
// ============================================

let tasks = [];
let isLoading = false;

// ============================================
// Initialization
// ============================================

document.addEventListener('DOMContentLoaded', async () => {
  await loadTasks();
  setupEventListeners();
});

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
    chrome.runtime.openOptionsPage?.();
  });

  // Clear completed tasks
  clearBtn.addEventListener('click', handleClearCompleted);
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
      },
    });

    if (response?.success) {
      // Optimistic UI update
      tasks.push(response.data);
      renderTasks();

      // Clear input
      taskInput.value = '';
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
    const response = await chrome.runtime.sendMessage({
      action: 'CLEAR_COMPLETED',
    });

    if (response?.success) {
      tasks = tasks.filter(t => !t.completed);
      renderTasks();
    } else {
      showError(response?.error || 'Failed to clear tasks');
    }
  } catch (error) {
    console.error('Error clearing completed tasks:', error);
    showError('Failed to clear tasks');
  }
}

// ============================================
// Rendering
// ============================================

/**
 * Efficient task list rendering
 * Handles empty state and task items
 */
function renderTasks() {
  // Clear current list
  tasksList.innerHTML = '';

  if (tasks.length === 0) {
    tasksList.appendChild(createEmptyState());
  } else {
    // Use DocumentFragment to minimize reflows
    const fragment = document.createDocumentFragment();
    tasks.forEach(task => {
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
      <span class="task-priority ${priorityClass}">
        ${priorityLabel}
      </span>
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
