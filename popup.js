document.addEventListener('DOMContentLoaded', () => {
  const taskListElement = document.getElementById('taskList');
  let allTasksGlobally = [];

  const ISSUE_TRACKER_PAGE_PATTERNS = [
    "https://*.atlassian.net/",
  ];

  function isIssueTrackerTab(url) {
    if (!url) return false;
    return ISSUE_TRACKER_PAGE_PATTERNS.some(pattern => {
      const regexPattern = "^" + pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*');
      const regex = new RegExp(regexPattern);
      return regex.test(url);
    });
  }

  function generateTaskId(summary) {
    if (!summary) return null;
    return `task-${summary.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
  }

  function sortTasks(tasks) {
    const priorityOrder = { highest: 1, high: 2, medium: 3, low: 4, lowest: 5, 'n/a': 6 };

    return tasks.sort((a, b) => {
      const priorityA = priorityOrder[a.priority?.toLowerCase()] || priorityOrder['n/a'];
      const priorityB = priorityOrder[b.priority?.toLowerCase()] || priorityOrder['n/a'];

      if (a.completed !== b.completed) {
        return a.completed ? 1 : -1;
      }

      if (priorityA !== priorityB) {
        return priorityA - priorityB;
      }

      return 0;
    });
  }

  function reorderTaskList() {
    const tasks = Array.from(taskListElement.children);
    const sortedTasks = sortTasks(
      tasks.map(task => allTasksGlobally.find(t => t.id === task.dataset.taskId))
    );

    sortedTasks.forEach(task => {
      const listItem = taskListElement.querySelector(`[data-task-id="${task.id}"]`);
      if (listItem) taskListElement.appendChild(listItem);
    });
  }

  function renderTasks() {
    taskListElement.innerHTML = '';

    if (!allTasksGlobally || allTasksGlobally.length === 0) {
      const noTasksMessage = document.createElement('li');
      noTasksMessage.textContent = 'No tasks found or saved.';
      if (chrome.tabs && chrome.tabs.query) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0] && tabs[0].url && isIssueTrackerTab(tabs[0].url)) {
            noTasksMessage.textContent = 'No tasks found on this Jira page. Try reloading the page or check the selectors in content.js.';
          }
        });
      }
      taskListElement.appendChild(noTasksMessage);
      return;
    }

    const sortedTasks = sortTasks(allTasksGlobally);

    sortedTasks.forEach(task => {
      const listItem = document.createElement('li');
      listItem.dataset.taskId = task.id;
      if (task.completed) {
        listItem.classList.add('completed');
      }

      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.checked = task.completed;
      checkbox.addEventListener('change', () => {
        task.completed = checkbox.checked;
        if (task.completed) {
          listItem.classList.add('completed');
        } else {
          listItem.classList.remove('completed');
        }
        saveTasksToStorage();
        reorderTaskList();
      });

      const detailsDiv = document.createElement('div');
      detailsDiv.classList.add('task-details');

      const summarySpan = document.createElement('span');
      summarySpan.classList.add('task-summary');
      summarySpan.textContent = task.summary;
      
      detailsDiv.appendChild(summarySpan);

      const tagsContainer = document.createElement('div');
      tagsContainer.classList.add('task-tags-container');

      const priorityText = task.priority || 'N/A';
      const prioritySpan = document.createElement('span');
      prioritySpan.classList.add('task-priority');
      prioritySpan.textContent = priorityText;
      const priorityLower = priorityText.toLowerCase();
      if (priorityLower.includes('highest') || priorityLower.includes('high')) {
        prioritySpan.classList.add('priority-high');
      } else if (priorityLower.includes('medium')) {
        prioritySpan.classList.add('priority-medium');
      } else if (priorityLower.includes('lowest') || priorityLower.includes('low')) {
        prioritySpan.classList.add('priority-low');
      } else {
        prioritySpan.classList.add('priority-default');
      }
      tagsContainer.appendChild(prioritySpan);

      if (task.key) {
        const keySpan = document.createElement('span');
        keySpan.classList.add('task-key');
        keySpan.textContent = task.key;
        tagsContainer.appendChild(keySpan);
      }

      detailsDiv.appendChild(tagsContainer);

      if (task.parent) {
        const parentSpan = document.createElement('span');
        parentSpan.classList.add('task-parent');
        parentSpan.textContent = task.parent;
        detailsDiv.appendChild(parentSpan);
      }

      listItem.appendChild(checkbox);
      listItem.appendChild(detailsDiv);
      taskListElement.appendChild(listItem);
    });
  }

  function saveTasksToStorage() {
    chrome.storage.local.set({ storedTasks: allTasksGlobally }, () => {
      console.log('Tasks saved to storage.');
    });
  }

  function loadTasksFromStorage(callback) {
    chrome.storage.local.get(['storedTasks'], (result) => {
      allTasksGlobally = result.storedTasks || [];
      if (callback) callback();
    });
  }

  function mergeAndRefreshTasks(scrapedIssues) {
    const newMasterTaskList = [];
    const taskMapFromStorage = new Map(allTasksGlobally.map(task => [task.id, task]));

    scrapedIssues.forEach(scrapedIssue => {
      const taskId = scrapedIssue.id || generateTaskId(scrapedIssue.summary);
      if (!taskId) return;

      if (taskMapFromStorage.has(taskId)) {
        const existingTask = taskMapFromStorage.get(taskId);
        newMasterTaskList.push({
          ...existingTask,
          summary: scrapedIssue.summary,
          priority: scrapedIssue.priority,
          key: scrapedIssue.key,
          parent: scrapedIssue.parent,
        });
        taskMapFromStorage.delete(taskId);
      } else {
        newMasterTaskList.push({
          id: taskId,
          summary: scrapedIssue.summary,
          priority: scrapedIssue.priority,
          key: scrapedIssue.key,
          parent: scrapedIssue.parent,
          completed: false,
        });
      }
    });

    taskMapFromStorage.forEach(storedTask => {
      newMasterTaskList.push({ ...storedTask });
    });

    allTasksGlobally = newMasterTaskList;
    saveTasksToStorage();
    renderTasks();
  }

  loadTasksFromStorage(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const currentTab = tabs[0];
      if (currentTab && currentTab.id && currentTab.url) {
        if (isIssueTrackerTab(currentTab.url)) {
          chrome.tabs.sendMessage(currentTab.id, { action: "getIssues" }, (response) => {
            if (chrome.runtime.lastError) {
              console.warn("Error communicating with content script:", chrome.runtime.lastError.message);
              renderTasks();
              return;
            }

            if (response && response.issues) {
              mergeAndRefreshTasks(response.issues);
            } else {
              mergeAndRefreshTasks([]);
            }
          });
        } else {
          renderTasks();
        }
      } else {
        renderTasks();
      }
    });
  });
});