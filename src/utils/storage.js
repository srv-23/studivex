/**
 * Storage Service for Studivex
 * Abstracts Chrome Storage API with async/await wrapper
 * 
 * Benefits of this abstraction:
 * - Single source of truth for storage operations
 * - Easy to swap storage backends (IndexedDB, Firestore, etc.)
 * - Centralized error handling and validation
 * - Testable with mock storage
 * - Reduces coupling between UI and storage
 */

// ============================================
// Constants
// ============================================

const STORAGE_KEYS = {
  TASKS: 'studivex_tasks',
  SETTINGS: 'studivex_settings',
  LAST_SYNC: 'studivex_last_sync',
};

const DEFAULT_SETTINGS = {
  notifications_enabled: true,
  auto_sort: 'priority', // 'priority' or 'date'
  theme: 'light',
};

// ============================================
// Core Storage Functions
// ============================================

/**
 * Get all tasks from storage
 * @returns {Promise<Array>} Array of task objects
 */
export async function getTasks() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.TASKS);
    return result[STORAGE_KEYS.TASKS] || [];
  } catch (error) {
    console.error('Error retrieving tasks:', error);
    throw new Error('Failed to retrieve tasks from storage');
  }
}

/**
 * Get a single task by ID
 * @param {string} taskId - The task ID
 * @returns {Promise<Object|null>} Task object or null if not found
 */
export async function getTask(taskId) {
  try {
    const tasks = await getTasks();
    return tasks.find(t => t.id === taskId) || null;
  } catch (error) {
    console.error(`Error retrieving task ${taskId}:`, error);
    throw new Error(`Failed to retrieve task ${taskId}`);
  }
}

/**
 * Save a new task
 * @param {Object} task - Task object with title, priority, etc.
 * @returns {Promise<Object>} The saved task with ID and timestamps
 */
export async function saveTask(task) {
  try {
    // Validate task
    if (!task.title || typeof task.title !== 'string' || task.title.trim().length === 0) {
      throw new Error('Task title is required');
    }

    // Prepare task object
    const newTask = {
      id: generateTaskId(),
      title: task.title.trim(),
      priority: task.priority || 2, // Default to Medium
      completed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      ...task, // Allow override of fields
    };

    // Get existing tasks
    const tasks = await getTasks();

    // Add new task
    tasks.push(newTask);

    // Batch save to storage (single API call instead of multiple)
    await chrome.storage.local.set({
      [STORAGE_KEYS.TASKS]: tasks,
      [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString(),
    });

    console.log('Task saved:', newTask.id);
    return newTask;
  } catch (error) {
    console.error('Error saving task:', error);
    throw error;
  }
}

/**
 * Update an existing task
 * @param {string} taskId - The task ID
 * @param {Object} updates - Object with fields to update
 * @returns {Promise<Object>} The updated task
 */
export async function updateTask(taskId, updates) {
  try {
    const tasks = await getTasks();
    const taskIndex = tasks.findIndex(t => t.id === taskId);

    if (taskIndex === -1) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Preserve immutability
    const updatedTask = {
      ...tasks[taskIndex],
      ...updates,
      id: tasks[taskIndex].id, // Prevent ID changes
      createdAt: tasks[taskIndex].createdAt, // Preserve creation time
      updatedAt: new Date().toISOString(),
    };

    // Update in array
    tasks[taskIndex] = updatedTask;

    // Save to storage
    await chrome.storage.local.set({
      [STORAGE_KEYS.TASKS]: tasks,
      [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString(),
    });

    console.log('Task updated:', taskId);
    return updatedTask;
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
}

/**
 * Delete a task
 * @param {string} taskId - The task ID to delete
 * @returns {Promise<boolean>} True if deleted successfully
 */
export async function deleteTask(taskId) {
  try {
    const tasks = await getTasks();
    const filtered = tasks.filter(t => t.id !== taskId);

    // Verify task was actually deleted
    if (filtered.length === tasks.length) {
      throw new Error(`Task ${taskId} not found`);
    }

    // Save to storage
    await chrome.storage.local.set({
      [STORAGE_KEYS.TASKS]: filtered,
      [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString(),
    });

    console.log('Task deleted:', taskId);
    return true;
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
}

/**
 * Delete all completed tasks
 * @returns {Promise<number>} Number of tasks deleted
 */
export async function deleteCompletedTasks() {
  try {
    const tasks = await getTasks();
    const completed = tasks.filter(t => t.completed);
    const remaining = tasks.filter(t => !t.completed);

    await chrome.storage.local.set({
      [STORAGE_KEYS.TASKS]: remaining,
      [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString(),
    });

    console.log(`Deleted ${completed.length} completed tasks`);
    return completed.length;
  } catch (error) {
    console.error('Error deleting completed tasks:', error);
    throw error;
  }
}

// ============================================
// Batch Operations
// ============================================

/**
 * Bulk update multiple tasks
 * @param {Array<string>} taskIds - Array of task IDs to update
 * @param {Object} updates - Fields to update
 * @returns {Promise<Array>} Array of updated tasks
 */
export async function bulkUpdateTasks(taskIds, updates) {
  try {
    const tasks = await getTasks();
    const updated = tasks.map(t => {
      if (taskIds.includes(t.id)) {
        return {
          ...t,
          ...updates,
          updatedAt: new Date().toISOString(),
        };
      }
      return t;
    });

    await chrome.storage.local.set({
      [STORAGE_KEYS.TASKS]: updated,
      [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString(),
    });

    return updated.filter(t => taskIds.includes(t.id));
  } catch (error) {
    console.error('Error bulk updating tasks:', error);
    throw error;
  }
}

/**
 * Clear all tasks (destructive operation)
 * @returns {Promise<boolean>} True if cleared
 */
export async function clearAllTasks() {
  try {
    await chrome.storage.local.set({
      [STORAGE_KEYS.TASKS]: [],
      [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString(),
    });

    console.warn('All tasks cleared');
    return true;
  } catch (error) {
    console.error('Error clearing tasks:', error);
    throw error;
  }
}

// ============================================
// Settings Management
// ============================================

/**
 * Get all settings
 * @returns {Promise<Object>} Settings object with defaults
 */
export async function getSettings() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEYS.SETTINGS);
    return {
      ...DEFAULT_SETTINGS,
      ...(result[STORAGE_KEYS.SETTINGS] || {}),
    };
  } catch (error) {
    console.error('Error retrieving settings:', error);
    return DEFAULT_SETTINGS;
  }
}

/**
 * Save settings (merges with existing)
 * @param {Object} settings - Settings to save
 * @returns {Promise<Object>} Updated settings
 */
export async function saveSettings(settings) {
  try {
    const current = await getSettings();
    const updated = { ...current, ...settings };

    await chrome.storage.local.set({
      [STORAGE_KEYS.SETTINGS]: updated,
    });

    console.log('Settings saved');
    return updated;
  } catch (error) {
    console.error('Error saving settings:', error);
    throw error;
  }
}

// ============================================
// Utility Functions
// ============================================

/**
 * Generate unique task ID
 * Uses timestamp + random string for uniqueness
 * @returns {string} Unique task ID
 */
function generateTaskId() {
  return `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get storage usage info
 * @returns {Promise<Object>} Storage usage details
 */
export async function getStorageInfo() {
  try {
    if (!chrome.storage.local.getBytesInUse) {
      console.warn('getBytesInUse not available');
      return null;
    }

    const bytesInUse = await chrome.storage.local.getBytesInUse();
    const QUOTA = 10 * 1024 * 1024; // 10MB

    return {
      used: bytesInUse,
      quota: QUOTA,
      percentUsed: Math.round((bytesInUse / QUOTA) * 100),
    };
  } catch (error) {
    console.error('Error getting storage info:', error);
    return null;
  }
}

/**
 * Export all data as JSON
 * @returns {Promise<Object>} All data in storage
 */
export async function exportData() {
  try {
    const tasks = await getTasks();
    const settings = await getSettings();

    return {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tasks,
      settings,
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
}

/**
 * Import data from JSON
 * @param {Object} data - Data object to import
 * @returns {Promise<boolean>} True if imported successfully
 */
export async function importData(data) {
  try {
    if (!data.tasks || !Array.isArray(data.tasks)) {
      throw new Error('Invalid data format');
    }

    await chrome.storage.local.set({
      [STORAGE_KEYS.TASKS]: data.tasks,
      [STORAGE_KEYS.SETTINGS]: data.settings || DEFAULT_SETTINGS,
      [STORAGE_KEYS.LAST_SYNC]: new Date().toISOString(),
    });

    console.log('Data imported successfully');
    return true;
  } catch (error) {
    console.error('Error importing data:', error);
    throw error;
  }
}

/**
 * Clear all storage (factory reset)
 * @returns {Promise<boolean>} True if cleared
 */
export async function clearAllStorage() {
  try {
    await chrome.storage.local.clear();
    console.warn('All storage cleared - factory reset');
    return true;
  } catch (error) {
    console.error('Error clearing storage:', error);
    throw error;
  }
}
