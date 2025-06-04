# Atlassian Issue Tracker Helper

This Chrome extension helps you extract Atlassian issues and their priorities, mark them as completed, and persist tasks across tabs.

## Features

- Extract issues and priorities from Atlassian Jira pages.
- Mark tasks as completed.
- Save tasks locally for persistence across sessions.
- Automatically sync tasks with the current Jira page.

## Installation

1. Clone or download this repository.
2. Open Chrome and navigate to `chrome://extensions/`.
3. Enable "Developer mode" in the top-right corner.
4. Click "Load unpacked" and select the folder containing this extension.

## Usage

1. Navigate to a Jira issue tracker page, such as [https://yourcompany.atlassian.net/issues](https://sig2000.atlassian.net/issues).
2. Use JQL to filter issues. For example:
   ```sql
   assignee={{user}} AND Sprint in openSprints() AND project = {{project}} AND status NOT IN (Done) ORDER BY priority DESC
   ```
3. Open the extension popup by clicking the extension icon in the Chrome toolbar.
4. View the list of issues, mark tasks as completed, or manage them directly from the popup.

## Permissions

This extension requires the following permissions:
- `storage`: To save tasks locally.
- `activeTab` and `scripting`: To interact with the current Jira page.

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.