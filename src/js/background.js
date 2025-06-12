// Timer state
let timerState = null;

// Initialize timer state from storage
chrome.storage.local.get(['timerState'], (result) => {
    if (result.timerState) {
        timerState = result.timerState;
    }
});

function calculateElapsedTime(state) {
    if (!state.startTime) return state.elapsedTime || 0;
    
    const startTime = new Date(state.startTime).getTime();
    const now = Date.now();
    const baseElapsed = state.elapsedTime || 0;
    
    return baseElapsed + (now - startTime);
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
        if (timerState) {
            // Calculate current elapsed time before sending
            const currentState = {
                ...timerState,
                elapsedTime: calculateElapsedTime(timerState)
            };
            sendResponse({ timerState: currentState });
        } else {
            sendResponse({ timerState: null });
        }
        return true;
    }
    
    if (request.action === 'updateTimerState') {
        if (request.state === null) {
            // Clear timer state
            timerState = null;
            chrome.storage.local.remove('timerState');
        } else {
            timerState = request.state;
            if (timerState) {
                // Store the current timestamp when starting
                if (!timerState.startTime) {
                    timerState.startTime = new Date().toISOString();
                }
            }
            chrome.storage.local.set({ timerState });
        }
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