document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timeDisplay = document.getElementById('timeDisplay');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');
    const submitAllBtn = document.getElementById('submitAllBtn');
    const timeLogsList = document.getElementById('timeLogsList');
    const emptyState = document.getElementById('emptyState');
    const timerInputs = document.getElementById('timerInputs');
    const ticketIdInput = document.getElementById('ticketId');
    const descriptionInput = document.getElementById('description');
    const editModal = document.getElementById('editModal');
    const editTicketId = document.getElementById('editTicketId');
    const editDescription = document.getElementById('editDescription');
    const editDate = document.getElementById('editDate');
    const editStartTime = document.getElementById('editStartTime');
    const editEndTime = document.getElementById('editEndTime');
    const saveEditBtn = document.getElementById('saveEditBtn');
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    const closeModalBtn = document.getElementById('closeModal');

    // Timer state
    let timerState = {
        elapsedTime: 0,
        startTime: null
    };

    // Activity state
    let timeLogs = [];
    let lastUpdateTime = null;

    // Load saved time logs and get timer state from background
    chrome.storage.local.get(['timeLogs'], (result) => {
        if (result.timeLogs) {
            timeLogs = result.timeLogs;
            renderTimeLogs();
        }
        updateSubmitButton();
    });

    // Get timer state from background service worker
    chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
        if (response.timerState) {
            timerState = response.timerState;
            updateTimerDisplay();
            updateButtonStates();
            // Hide inputs if timer is running
            if (timerState.startTime) {
                timerInputs.classList.add('hidden');
            }
        }
    });

    function updateTimerState() {
        const state = {
            startTime: timerState.startTime ? new Date(timerState.startTime).toISOString() : null,
            elapsedTime: timerState.elapsedTime,
            currentTimeLog: null,
            lastUpdateTime: lastUpdateTime ? new Date(lastUpdateTime).toISOString() : null
        };
        chrome.runtime.sendMessage({ action: 'updateTimerState', state });
    }

    function startTimer() {
        if (!timerState.startTime) {
            timerState.startTime = new Date().toISOString();
            timerState.elapsedTime = 0;
            lastUpdateTime = Date.now();
            timerInputs.classList.add('hidden');
            timeDisplay.classList.add('active-timer');

            updateTimerDisplay();
            updateButtonStates();
            updateTimerState();
        }
    }

    function stopTimer() {
        if (timerState.startTime) {
            // Get the final elapsed time from the background
            chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
                if (response.timerState) {
                    const finalElapsedTime = response.timerState.elapsedTime;
                    
                    // Record the activity
                    const timeLog = {
                        startTime: new Date(timerState.startTime).toISOString(),
                        endTime: new Date().toISOString(),
                        duration: finalElapsedTime,
                        ticketId: ticketIdInput.value.trim(),
                        description: descriptionInput.value.trim()
                    };
                    
                    timeLogs.push(timeLog);
                    chrome.storage.local.set({ timeLogs });
                    renderTimeLogs();
                    
                    // Clear timer state in background
                    chrome.runtime.sendMessage({ 
                        action: 'updateTimerState', 
                        state: null 
                    });
                    
                    // Reset local timer state
                    timerState = {
                        elapsedTime: 0,
                        startTime: null
                    };
                    
                    // Clear inputs and show them again
                    ticketIdInput.value = '';
                    descriptionInput.value = '';
                    timerInputs.classList.remove('hidden');
                    
                    updateTimerDisplay();
                    updateButtonStates();
                }
            });
        }
    }

    function updateTimerDisplay() {
        const totalSeconds = Math.floor(timerState.elapsedTime / 1000);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        
        if (timerState.startTime) {
            // Show seconds when timer is active
            timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
            timeDisplay.classList.add('active-timer');
        } else {
            // Hide seconds when timer is not active
            timeDisplay.textContent = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
            timeDisplay.classList.remove('active-timer');
        }
    }

    function formatDuration(ms) {
        const hours = Math.floor(ms / 3600000);
        const minutes = Math.floor((ms % 3600000) / 60000);
        return `${hours}h ${minutes}m`;
    }

    function renderTimeLogs() {
        timeLogsList.innerHTML = '';
        
        if (timeLogs.length === 0) {
            timeLogsList.classList.add('hidden');
            emptyState.classList.remove('hidden');
        } else {
            timeLogsList.classList.remove('hidden');
            emptyState.classList.add('hidden');
            
            timeLogs.forEach((log, index) => {
                const logElement = document.createElement('div');
                logElement.className = 'time-log-item';
                
                const date = new Date(log.startTime);
                const formattedDate = date.toLocaleDateString();
                const formattedStartTime = formatTimeForInput(date);
                
                logElement.innerHTML = `
                    <div class="time-log-info">
                        <div>${log.ticketId || 'No ticket'}</div>
                        <div>${log.description || 'No description'}</div>
                        <div>${formattedDate} ${formattedStartTime}</div>
                    </div>
                    <div class="time-log-duration">${formatDuration(log.duration)}</div>
                    <div class="time-log-actions">
                        <button class="edit-btn" data-index="${index}">Edit</button>
                        <button class="delete-btn" data-index="${index}">Delete</button>
                    </div>
                `;
                
                timeLogsList.appendChild(logElement);
            });

            // Add event listeners for edit and delete buttons
            document.querySelectorAll('.edit-btn').forEach(btn => {
                btn.addEventListener('click', () => openEditModal(parseInt(btn.dataset.index)));
            });

            document.querySelectorAll('.delete-btn').forEach(btn => {
                btn.addEventListener('click', () => deleteTimeLog(parseInt(btn.dataset.index)));
            });
        }
    }

    function openEditModal(index) {
        const log = timeLogs[index];
        editTicketId.value = log.ticketId || '';
        editDescription.value = log.description || '';
        
        const startDate = new Date(log.startTime);
        editDate.value = startDate.toISOString().split('T')[0];
        editStartTime.value = formatTimeForInput(startDate);
        
        if (log.endTime) {
            const endDate = new Date(log.endTime);
            editEndTime.value = formatTimeForInput(endDate);
        }

        editModal.dataset.editIndex = index;
        editModal.classList.remove('hidden');
    }

    function saveEdit() {
        const index = parseInt(editModal.dataset.editIndex);
        const log = timeLogs[index];
        
        const startDate = parseTimeInput(editDate.value, editStartTime.value);
        const endDate = parseTimeInput(editDate.value, editEndTime.value);
        
        // Validate that end time is after start time
        if (endDate <= startDate) {
            alert('End time must be after start time');
            return;
        }

        log.ticketId = editTicketId.value.trim();
        log.description = editDescription.value.trim();
        log.startTime = startDate;
        log.endTime = endDate;
        log.duration = endDate - startDate;

        chrome.storage.local.set({ timeLogs });
        renderTimeLogs();
        updateSubmitButton();
        editModal.classList.add('hidden');
    }

    function deleteTimeLog(index) {
        timeLogs.splice(index, 1);
        chrome.storage.local.set({ timeLogs });
        renderTimeLogs();
        updateSubmitButton();
    }

    function updateSubmitButton() {
        const hasActiveTimer = timerState.startTime !== null;
        const allLogsComplete = timeLogs.every(log => 
            log.ticketId && 
            log.description && 
            log.startTime && 
            log.endTime
        );
        
        submitAllBtn.disabled = hasActiveTimer || !allLogsComplete || timeLogs.length === 0;
    }

    // Event Listeners
    startBtn.addEventListener('click', startTimer);
    stopBtn.addEventListener('click', stopTimer);

    submitAllBtn.addEventListener('click', async () => {
        try {
            const settings = await chrome.storage.sync.get(['jiraUrl', 'apiToken']);
            if (!settings.jiraUrl || !settings.apiToken) {
                alert('Please configure JIRA settings first');
                return;
            }

            for (const log of timeLogs) {
                await chrome.runtime.sendMessage({
                    action: 'submitTime',
                    data: {
                        ticketId: log.ticketId,
                        description: log.description,
                        timeSpent: Math.round(log.duration / 60000), // Convert to minutes
                        jiraUrl: settings.jiraUrl,
                        apiToken: settings.apiToken
                    }
                });
            }

            alert('All time logs submitted successfully!');
            timeLogs = [];
            chrome.storage.local.set({ timeLogs });
            renderTimeLogs();
            updateSubmitButton();
        } catch (error) {
            alert('Error submitting time logs: ' + error.message);
        }
    });

    saveEditBtn.addEventListener('click', saveEdit);
    cancelEditBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    // Utility functions for time handling
    function formatTimeForInput(date) {
        return date.toTimeString().slice(0, 5);
    }

    function parseTimeInput(dateStr, timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(dateStr);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }

    // Update button states
    function updateButtonStates() {
        startBtn.disabled = timerState.startTime !== null;
        stopBtn.disabled = timerState.startTime === null;
        submitAllBtn.disabled = timerState.elapsedTime === 0;
    }

    // Close modal
    closeModalBtn.addEventListener('click', () => {
        editModal.classList.add('hidden');
    });

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === editModal) {
            editModal.classList.add('hidden');
        }
    });

    // Update timer display every second when active
    setInterval(() => {
        if (timerState.startTime) {
            // Get fresh state from background
            chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
                if (response.timerState) {
                    timerState = response.timerState;
                    updateTimerDisplay();
                }
            });
        }
    }, 1000);

    // Initial display update
    updateTimerDisplay();
    updateButtonStates();
}); 