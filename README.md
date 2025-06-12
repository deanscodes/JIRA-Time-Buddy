# JIRA Time Buddy

A browser extension for tracking and logging time against JIRA tickets. Works with Chrome, Edge, and Firefox.

## Features

- Simple timer interface for tracking work time
- Pause and resume functionality
- Direct time logging to JIRA tickets
- Configurable JIRA instance URL and API token
- Cross-browser compatibility

## Installation

### Chrome/Edge
1. Download or clone this repository
2. Open Chrome/Edge and navigate to `chrome://extensions/`
3. Enable "Developer mode" in the top right
4. Click "Load unpacked" and select the extension directory

### Firefox
1. Download or clone this repository
2. Open Firefox and navigate to `about:debugging#/runtime/this-firefox`
3. Click "Load Temporary Add-on"
4. Select any file from the extension directory

## Setup

1. After installing the extension, click the extension icon in your browser
2. Click the settings (⚙️) icon
3. Enter your JIRA instance URL (e.g., `https://your-domain.atlassian.net`)
4. Enter your JIRA API token
   - You can generate an API token from your Atlassian account settings
   - Go to https://id.atlassian.com/manage-profile/security/api-tokens

## Usage

1. Click the extension icon to open the popup
2. Enter the JIRA ticket ID (e.g., "PROJ-123")
3. Click the start button (▶️) to begin tracking time
4. Use pause (⏸️) and stop (⏹️) as needed
5. Add an optional description of your work
6. Click "Submit Time" to log the time to JIRA

## Security Note

Your JIRA API token is stored securely in your browser's storage and is only used to make API calls to your JIRA instance. The token is never sent to any other servers.

## Development

This extension is built using:
- Manifest V3
- Vanilla JavaScript
- JIRA REST API v2

## License

MIT License 