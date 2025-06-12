// Timer state
let timerState = null;
let timerInterval = null;

// Initialize timer state from storage
chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState) {
        timerState = result.timerState;
        if (timerState.startTime && !timerState.isPaused) {
            startBackgroundTimer();
        }
    }
});

function startBackgroundTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
    }
    
    timerInterval = setInterval(() => {
        if (timerState && timerState.startTime && !timerState.isPaused) {
            const now = Date.now();
            const startTime = new Date(timerState.startTime).getTime();
            const lastUpdate = new Date(timerState.lastUpdateTime).getTime();
            timerState.elapsedTime += now - lastUpdate;
            timerState.lastUpdateTime = new Date(now).toISOString();
            chrome.storage.local.set({ timerState });
        }
    }, 60000); // Update every minute
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'submitTime') {
        submitTimeToJira(request.data)
            .then(response => sendResponse({ success: true, data: response }))
            .catch(error => sendResponse({ success: false, error: error.message }));
        return true; // Required for async sendResponse
    }
    
    // Handle timer state messages
    if (request.action === 'getTimerState') {
        sendResponse({ timerState });
        return true;
    }
    
    if (request.action === 'updateTimerState') {
        timerState = request.state;
        if (timerState.startTime && !timerState.isPaused) {
            startBackgroundTimer();
        } else if (timerInterval) {
            clearInterval(timerInterval);
        }
        chrome.storage.local.set({ timerState });
        sendResponse({ success: true });
        return true;
    }
});

async function submitTimeToJira({ ticketId, description, timeSpent, jiraUrl, apiToken }) {
    // Format the time spent in JIRA format (e.g., "1h 30m" or "45m")
    const hours = Math.floor(timeSpent / 60);
    const minutes = timeSpent % 60;
    let timeSpentStr = '';
    if (hours > 0) {
        timeSpentStr += `${hours}h `;
    }
    if (minutes > 0 || hours === 0) {
        timeSpentStr += `${minutes}m`;
    }

    // If no ticket ID is provided, store the time entry locally
    if (!ticketId) {
        const timeEntry = {
            timeSpent: timeSpentStr,
            description,
            timestamp: new Date().toISOString()
        };
        
        // Store in chrome.storage.local
        const storedEntries = await chrome.storage.local.get('timeEntries') || { timeEntries: [] };
        storedEntries.timeEntries.push(timeEntry);
        await chrome.storage.local.set(storedEntries);
        
        return { success: true, message: 'Time entry stored locally' };
    }

    // Prepare the request for JIRA
    const url = `${jiraUrl}/rest/api/2/issue/${ticketId}/worklog`;
    const headers = {
        'Authorization': `Basic ${btoa(apiToken + ':')}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };

    const body = {
        timeSpent: timeSpentStr,
        comment: description
    };

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to submit time to JIRA');
        }

        return await response.json();
    } catch (error) {
        console.error('Error submitting time to JIRA:', error);
        throw error;
    }
} 