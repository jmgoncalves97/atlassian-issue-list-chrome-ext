function generateTaskId(summary) {
  if (!summary) return null;
  return `task-${summary.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '')}`;
}

function getColumnData(selectedThElement) {
  let data = {};

  if (!selectedThElement || selectedThElement.tagName !== 'TH') {
    return { error: "The selected element is not a th." };
  }

  const parentTr = selectedThElement.parentElement;
  if (!parentTr || parentTr.tagName !== 'TR') {
    return { error: "Could not find the parent row (tr)." };
  }

  const cellIndex = Array.from(parentTr.children).indexOf(selectedThElement);
  const parentTable = parentTr.parentElement;

  if (!parentTable || (parentTable.tagName !== 'TBODY' && parentTable.tagName !== 'THEAD' && parentTable.tagName !== 'TABLE')) {
    return { error: "Could not find the parent tbody, thead or table." };
  }

  const table = parentTable.tagName === 'TABLE' ? parentTable : parentTable.parentElement;
  if (!table || table.tagName !== 'TABLE') {
    return { error: "Could not find the parent table." };
  }

  const columnValues = [];
  const rows = table.querySelectorAll('tr');
  let isHeaderRow = true;

  rows.forEach(row => {
    if (isHeaderRow) {
      isHeaderRow = false;
      return;
    }
    const cells = row.querySelectorAll('td');
    if (cells.length > cellIndex) {
      columnValues.push(cells[cellIndex].innerText.trim());
    }
  });

  return { columnValues: columnValues };
}

function getIssuesAndPriorities() {
  const issueElements = document.querySelectorAll('[data-testid="native-issue-table.common.ui.issue-cells.issue-summary.issue-summary-cell"]');
  const priorityElements = document.querySelectorAll('[data-testid="issue-field-priority-readview-full.ui.priority.wrapper"]');
  const keys = document.querySelectorAll('[data-vc="native-issue-table-ui-issue-key-cell"]');
  const parentElements = getColumnData(document.querySelector('[aria-label="Pai"]'));
  const issuesData = [];

  for (let i = 0; i < issueElements.length; i++) {
    const issueElement = issueElements[i];
    const summary = issueElement.innerText.trim();
    const taskId = generateTaskId(summary);

    if (!taskId) continue;

    const priorityText = (priorityElements[i] && priorityElements[i].innerText)
                         ? priorityElements[i].innerText.trim()
                         : 'N/A';

    const key = (keys[i] && keys[i].innerText)
                ? keys[i].innerText.trim()
                : 'N/A';

    const parent = parentElements.columnValues[i];

    issuesData.push({
      id: taskId,
      summary: summary,
      priority: priorityText,
      key: key,
      parent: parent
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