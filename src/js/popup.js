document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const timeDisplay = document.getElementById('timeDisplay');
    const startBtn = document.getElementById('startBtn');
    const pauseBtn = document.getElementById('pauseBtn');
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

    // Timer state
    let startTime = null;
    let elapsedTime = 0;
    let timerInterval = null;
    let isPaused = false;
    let currentTimeLog = null;
    let timeLogs = [];
    let lastUpdateTime = null;

    // Load saved time logs and get timer state from background
    chrome.storage.local.get(['timeLogs'], (result) => {
        timeLogs = result.timeLogs || [];
        renderTimeLogs();
        updateSubmitButton();
    });

    // Get timer state from background service worker
    chrome.runtime.sendMessage({ action: 'getTimerState' }, (response) => {
        if (response && response.timerState) {
            const state = response.timerState;
            startTime = state.startTime ? new Date(state.startTime) : null;
            elapsedTime = state.elapsedTime || 0;
            isPaused = state.isPaused || false;
            currentTimeLog = state.currentTimeLog || null;
            lastUpdateTime = state.lastUpdateTime ? new Date(state.lastUpdateTime) : null;

            if (startTime && !isPaused) {
                // Resume the timer
                startBtn.disabled = true;
                pauseBtn.disabled = false;
                stopBtn.disabled = false;
                submitAllBtn.disabled = true;
                timerInputs.classList.add('hidden');
                timeDisplay.classList.add('active-timer');
                if (currentTimeLog) {
                    ticketIdInput.value = currentTimeLog.ticketId || '';
                    descriptionInput.value = currentTimeLog.description || '';
                }
                timerInterval = setInterval(updateTimer, 60000);
                updateTimerDisplay(elapsedTime);
            } else if (startTime && isPaused) {
                // Show paused state
                startBtn.disabled = false;
                pauseBtn.disabled = true;
                stopBtn.disabled = false;
                submitAllBtn.disabled = true;
                timerInputs.classList.add('hidden');
                if (currentTimeLog) {
                    ticketIdInput.value = currentTimeLog.ticketId || '';
                    descriptionInput.value = currentTimeLog.description || '';
                }
                updateTimerDisplay(elapsedTime);
            }
        }
    });

    function updateTimerState() {
        const state = {
            startTime: startTime ? startTime.toISOString() : null,
            elapsedTime,
            isPaused,
            currentTimeLog,
            lastUpdateTime: lastUpdateTime ? lastUpdateTime.toISOString() : null
        };
        chrome.runtime.sendMessage({ action: 'updateTimerState', state });
    }

    function startTimer() {
        if (!startTime) {
            startTime = roundToNearestMinute(new Date());
            elapsedTime = 0;
            lastUpdateTime = Date.now();
            currentTimeLog = {
                startTime: new Date(startTime),
                endTime: null,
                duration: 0,
                ticketId: ticketIdInput.value.trim(),
                description: descriptionInput.value.trim()
            };
            timerInputs.classList.add('hidden');
            timeDisplay.classList.add('active-timer');
        } else if (isPaused) {
            lastUpdateTime = Date.now();
            timeDisplay.classList.add('active-timer');
        }
        
        timerInterval = setInterval(updateTimer, 60000);
        startBtn.disabled = true;
        pauseBtn.disabled = false;
        stopBtn.disabled = false;
        submitAllBtn.disabled = true;
        isPaused = false;
        updateTimerDisplay(0);
        updateTimerState();
    }

    function pauseTimer() {
        clearInterval(timerInterval);
        const now = Date.now();
        elapsedTime += now - lastUpdateTime;
        isPaused = true;
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        timeDisplay.classList.remove('active-timer');
        updateTimerState();
    }

    function stopTimer() {
        clearInterval(timerInterval);
        const endTime = roundToNearestMinute(new Date());
        const now = Date.now();
        elapsedTime += now - lastUpdateTime;
        
        if (currentTimeLog) {
            currentTimeLog.endTime = new Date(endTime);
            currentTimeLog.duration = elapsedTime;
            timeLogs.push(currentTimeLog);
            chrome.storage.local.set({ timeLogs });
            renderTimeLogs();
        }

        startTime = null;
        elapsedTime = 0;
        lastUpdateTime = null;
        currentTimeLog = null;
        isPaused = false;
        updateTimerDisplay(0);
        startBtn.disabled = false;
        pauseBtn.disabled = true;
        stopBtn.disabled = true;
        timerInputs.classList.remove('hidden');
        timeDisplay.classList.remove('active-timer');
        ticketIdInput.value = '';
        descriptionInput.value = '';
        updateSubmitButton();
        
        // Clear timer state in background
        chrome.runtime.sendMessage({ action: 'updateTimerState', state: null });
    }

    function updateTimer() {
        const now = Date.now();
        const currentElapsed = elapsedTime + (now - lastUpdateTime);
        updateTimerDisplay(currentElapsed);
    }

    function updateTimerDisplay(timeInMs) {
        const hours = Math.floor(timeInMs / 3600000);
        const minutes = Math.floor((timeInMs % 3600000) / 60000);
        
        timeDisplay.textContent = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
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
        const hasActiveTimer = startTime !== null;
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
    pauseBtn.addEventListener('click', pauseTimer);
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
    function roundToNearestMinute(date) {
        const rounded = new Date(date);
        rounded.setSeconds(0);
        rounded.setMilliseconds(0);
        return rounded;
    }

    function formatTimeForInput(date) {
        return date.toTimeString().slice(0, 5);
    }

    function parseTimeInput(dateStr, timeStr) {
        const [hours, minutes] = timeStr.split(':').map(Number);
        const date = new Date(dateStr);
        date.setHours(hours, minutes, 0, 0);
        return date;
    }
}); 