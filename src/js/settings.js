document.addEventListener('DOMContentLoaded', () => {
    const jiraUrlInput = document.getElementById('jiraUrl');
    const apiTokenInput = document.getElementById('apiToken');
    const saveSettingsBtn = document.getElementById('saveSettingsBtn');
    const statusMessage = document.getElementById('statusMessage');

    // Load saved settings
    chrome.storage.sync.get(['jiraUrl', 'apiToken'], (result) => {
        if (result.jiraUrl) jiraUrlInput.value = result.jiraUrl;
        if (result.apiToken) apiTokenInput.value = result.apiToken;
    });

    function showStatus(message, isError = false) {
        statusMessage.textContent = message;
        statusMessage.className = 'status-message ' + (isError ? 'error' : 'success');
        
        // Hide the message after 3 seconds
        setTimeout(() => {
            statusMessage.className = 'status-message';
        }, 3000);
    }

    function validateJiraUrl(url) {
        try {
            const urlObj = new URL(url);
            return urlObj.protocol === 'https:' && urlObj.hostname.includes('atlassian.net');
        } catch {
            return false;
        }
    }

    function validateApiToken(token) {
        // API tokens are typically alphanumeric and at least 16 characters long
        return /^[a-zA-Z0-9]{16,}$/.test(token);
    }

    // Save settings when the save button is clicked
    saveSettingsBtn.addEventListener('click', () => {
        const jiraUrl = jiraUrlInput.value.trim();
        const apiToken = apiTokenInput.value.trim();

        // Validate inputs
        if (!jiraUrl) {
            showStatus('Please enter your JIRA URL', true);
            return;
        }

        if (!validateJiraUrl(jiraUrl)) {
            showStatus('Please enter a valid Atlassian JIRA URL (e.g., https://your-domain.atlassian.net)', true);
            return;
        }

        if (!apiToken) {
            showStatus('Please enter your API token', true);
            return;
        }

        if (!validateApiToken(apiToken)) {
            showStatus('Please enter a valid API token', true);
            return;
        }

        // Save settings
        chrome.storage.sync.set({ jiraUrl, apiToken }, () => {
            if (chrome.runtime.lastError) {
                showStatus('Error saving settings: ' + chrome.runtime.lastError.message, true);
            } else {
                showStatus('Settings saved successfully!');
                // Disable the save button temporarily to prevent double-clicks
                saveSettingsBtn.disabled = true;
                setTimeout(() => {
                    saveSettingsBtn.disabled = false;
                }, 1000);
            }
        });
    });

    // Auto-save when inputs change
    let saveTimeout;
    function scheduleAutoSave() {
        clearTimeout(saveTimeout);
        saveTimeout = setTimeout(() => {
            const jiraUrl = jiraUrlInput.value.trim();
            const apiToken = apiTokenInput.value.trim();

            if (jiraUrl && validateJiraUrl(jiraUrl) && apiToken && validateApiToken(apiToken)) {
                chrome.storage.sync.set({ jiraUrl, apiToken }, () => {
                    if (!chrome.runtime.lastError) {
                        showStatus('Settings auto-saved');
                    }
                });
            }
        }, 1000); // Wait 1 second after the last change before auto-saving
    }

    jiraUrlInput.addEventListener('input', scheduleAutoSave);
    apiTokenInput.addEventListener('input', scheduleAutoSave);

    // Show a welcome message if this is the first time opening settings
    chrome.storage.sync.get(['settingsViewed'], (result) => {
        if (!result.settingsViewed) {
            showStatus('Welcome! Please configure your JIRA settings to get started.');
            chrome.storage.sync.set({ settingsViewed: true });
        }
    });
}); 