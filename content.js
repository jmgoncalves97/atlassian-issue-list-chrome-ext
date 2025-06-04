function generateTaskId(summary) {
  if (!summary) return null;
  return `task-${summary.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
}

function getIssuesAndPriorities() {
  const issueElements = document.querySelectorAll('[data-testid="native-issue-table.common.ui.issue-cells.issue-summary.issue-summary-cell"]');
  const priorityElements = document.querySelectorAll('[data-testid="issue-field-priority-readview-full.ui.priority.wrapper"]');
  const issuesData = [];

  for (let i = 0; i < issueElements.length; i++) {
    const issueElement = issueElements[i];
    const summary = issueElement.innerText.trim();
    const taskId = generateTaskId(summary);

    if (!taskId) continue;

    const priorityText = (priorityElements[i] && priorityElements[i].innerText)
                         ? priorityElements[i].innerText.trim()
                         : 'N/A';

    issuesData.push({
      id: taskId,
      summary: summary,
      priority: priorityText
    });
  }
  return issuesData;
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getIssues") {
    const data = getIssuesAndPriorities();
    sendResponse({ issues: data });
  }
  return true;
});