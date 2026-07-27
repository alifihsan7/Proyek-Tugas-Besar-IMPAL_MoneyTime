// Variabel State Global
let currentViewMode = 'list'; 
// State untuk Drag & Drop
let draggedTaskId = null;
let dragOffsetY = 0;
let isDragging = false;

document.addEventListener('DOMContentLoaded', () => {
    
    // ==========================================
    // 1. NAVBAR & UI LOGIC
    // ==========================================
    const navToggle = document.getElementById('navToggle');
    const header = document.querySelector('.header-guest');

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            const expanded = navToggle.getAttribute('aria-expanded') === 'true';
            navToggle.setAttribute('aria-expanded', String(!expanded));
            header.classList.toggle('menu-open');
        });
    }

    // ==========================================
    // 2. TOGGLE VIEW (LIST VS CALENDAR)
    // ==========================================
    const toggleViewBtn = document.getElementById('toggleViewBtn');
    const viewList = document.getElementById('view-list');
    const viewBlock = document.getElementById('view-block');
    const listTabs = document.getElementById('list-tabs');

    if(toggleViewBtn) {
        toggleViewBtn.addEventListener('click', () => {
            if(currentViewMode === 'list') {
                currentViewMode = 'block';
                viewList.style.display = 'none';
                listTabs.style.display = 'none';
                viewBlock.style.display = 'block';
                toggleViewBtn.innerHTML = '<i class="fa-solid fa-list"></i>'; 
                renderTimeBlocks(allSchedules); 
            } else {
                currentViewMode = 'list';
                viewBlock.style.display = 'none';
                viewList.style.display = 'block';
                listTabs.style.display = 'flex';
                toggleViewBtn.innerHTML = '<i class="fa-solid fa-calendar-week"></i>';
                searchHandler(); 
            }
        });
    }

    // Generate Label Waktu per 30 Menit (00:00, 00:30, dst)
    function setupTimeLabels() {
        const labelsContainer = document.getElementById('tb-time-labels');
        if(!labelsContainer) return;
        labelsContainer.innerHTML = '';
        for(let i = 0; i < 24; i++) {
            const hour = i.toString().padStart(2, '0');
            labelsContainer.innerHTML += `<div class="tb-time-label">${hour}:00</div>`;
            labelsContainer.innerHTML += `<div class="tb-time-label">${hour}:30</div>`;
        }
    }
    setupTimeLabels();

    // ==========================================
    // 3. CORE VARIABLES & TABS
    // ==========================================
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    let currentFilter = days[new Date().getDay()]; 
    let allSchedules = [];     
    const searchInput = document.getElementById('searchInput'); 
    const taskContainer = document.getElementById('daily-task-list');

    document.querySelectorAll('.time-tab').forEach(tab => {
        if(tab.dataset.target === currentFilter) tab.classList.add('active');
        else tab.classList.remove('active');
    });

    const tabs = document.querySelectorAll('.time-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentFilter = tab.dataset.target;
            searchHandler(); 
        });
    });

    const distinctColorsSchedule = [
        "#4682B4", "#2E8B57", "#D2691E", "#9ACD32", "#4B0082", 
        "#DC143C", "#000080", "#DAA520", "#808000", "#708090"
    ];
    let scheduleCategoryColorMap = {};

    function getCategoryColor(dayName) {
        if(!scheduleCategoryColorMap[dayName]) {
            const hash = dayName.charCodeAt(0) + dayName.charCodeAt(1);
            scheduleCategoryColorMap[dayName] = distinctColorsSchedule[hash % distinctColorsSchedule.length];
        }
        return scheduleCategoryColorMap[dayName];
    }

    // ==========================================
    // 4. FETCH & RENDER LOGIC
    // ==========================================
    async function fetchAndRenderTasks() {
        try {
            const response = await fetch('/api/rutinitas'); 
            
            if (!response.ok) {
                // Fallback Mock Data
                allSchedules = [
                    { id: 1, title: 'Wake Up', hari: 'Monday', time: '03.00 - 04.00', priority: 'High', status: 'To Do' },
                    { id: 2, title: 'Project Moneytime', hari: 'Monday', time: '04.00 - 05.00', priority: 'Medium', status: 'To Do' }
                ];
            } else {
                const data = await response.json();
                if (data.success) allSchedules = data.data; 
            }
            
            if(currentViewMode === 'list') searchHandler(); 
            else renderTimeBlocks(allSchedules);
            updateSummaryCards(allSchedules);
        } catch (error) {
            console.error('Error fetching tasks:', error);
        }
    }
    window.fetchSchedules = fetchAndRenderTasks;

    // --- A. Render List View ---
    function renderDailyTasks(tasks) {
        if (!taskContainer) return;
        taskContainer.innerHTML = '';
        const oldMsg = document.getElementById('schedule-not-found-msg');
        if(oldMsg) oldMsg.remove();

        let filteredByDay = tasks.filter(task => task.hari === currentFilter);
        if (filteredByDay.length === 0) {
            taskContainer.innerHTML = `<div id="schedule-not-found-msg" style="text-align: center; padding: 40px; color: #888;"><p>Belum ada jadwal untuk hari ${currentFilter}.</p></div>`;
            return;
        }

        filteredByDay.forEach(task => taskContainer.insertAdjacentHTML('beforeend', createDailyTaskHTML(task)));
        attachItemListeners();
    }

    function createDailyTaskHTML(task) {
        let checkboxClass = 'sch-checkbox';
        let iconHTML = '<i class="fa-solid fa-check check-mark" style="display:none"></i>';
        let statusBadgeClass = 'status-todo';
        let statusText = 'To Do';
        
        if (task.status === 'Completed' || task.status === 'Done') {
            checkboxClass += ' checked';
            iconHTML = '<i class="fa-solid fa-check check-mark" style="display:block; color:white;"></i>';
            statusBadgeClass = 'status-done';
            statusText = 'Done';
        }

        const prioText = task.priority || "Medium";
        const prioClass = `prio-${prioText.toLowerCase()}`;
        const dayBadgeColor = getCategoryColor(task.hari || "Monday");
        const onClickAttribute = `onclick="toggleStatus(event, ${task.id}, '${task.status}')"`;
        const itemData = JSON.stringify(task).replace(/"/g, '&quot;');

        return `
            <div class="t-item daily-task-row" data-json="${itemData}">
                <div class="col-task">
                    <div class="${checkboxClass}" ${onClickAttribute}>${iconHTML}</div>
                    <span class="task-name-text">${task.title}</span>
                </div>
                <div class="col-day"><span class="t-badge" style="background-color: ${dayBadgeColor}; color: white;">${task.hari}</span></div>
                <div class="col-time"><span style="font-weight: 500; color: #555;">${task.time}</span></div>
                <div class="col-status">
                    <div class="status-badge ${statusBadgeClass}"><div class="priority-dot ${task.status === 'Done' || task.status === 'Completed' ? 'low' : 'none'}"></div>${statusText}</div>
                </div>
                <div class="col-priority"><span class="prio-badge ${prioClass}">${prioText}</span></div>
            </div>
        `;
    }

    // --- B. Logika Time Range & Drag Drop ---
    function parseTimeRange(timeStr) {
        try {
            const parts = timeStr.split('-');
            if(parts.length !== 2) return null;
            const startParts = parts[0].trim().replace(':', '.').split('.');
            const endParts = parts[1].trim().replace(':', '.').split('.');

            const startTotalMins = (parseInt(startParts[0]) * 60) + parseInt(startParts[1] || 0);
            let endTotalMins = (parseInt(endParts[0]) * 60) + parseInt(endParts[1] || 0);
            if(endTotalMins < startTotalMins) endTotalMins += (24 * 60); 

            return { startMins: startTotalMins, duration: endTotalMins - startTotalMins };
        } catch (e) { return null; }
    }

    function renderTimeBlocks(tasks) {
        document.querySelectorAll('.tb-day-col').forEach(col => col.innerHTML = '');

        tasks.forEach(task => {
            const timeData = parseTimeRange(task.time);
            if(!timeData) return; 

            const dayCol = document.querySelector(`.tb-day-col[data-day="${task.hari}"]`);
            if(!dayCol) return;

            let prioClass = `prio-${(task.priority || 'medium').toLowerCase()}`;
            let statusClass = (task.status === 'Completed' || task.status === 'Done') ? 'status-done' : '';

            const blockHTML = `
                <div class="tb-task-block ${prioClass} ${statusClass}" 
                     draggable="true" 
                     data-id="${task.id}"
                     style="top: ${timeData.startMins}px; height: ${timeData.duration}px;">
                    <div class="tb-task-title" title="${task.title}">${task.title}</div>
                    <div class="tb-task-time">${task.time}</div>
                </div>
            `;
            dayCol.insertAdjacentHTML('beforeend', blockHTML);
        });

        document.querySelectorAll('.tb-task-block').forEach(block => {
            block.addEventListener('dragstart', (e) => {
                isDragging = true;
                draggedTaskId = parseInt(block.dataset.id);
                const rect = block.getBoundingClientRect();
                dragOffsetY = e.clientY - rect.top; 
                setTimeout(() => block.classList.add('dragging'), 0);
            });

            block.addEventListener('dragend', () => {
                setTimeout(() => { isDragging = false; }, 50); 
                block.classList.remove('dragging');
                document.querySelectorAll('.tb-day-col').forEach(c => c.classList.remove('drag-over'));
            });

            block.addEventListener('click', (e) => {
                if (isDragging) return; 
                const task = allSchedules.find(t => t.id === parseInt(block.dataset.id));
                if(task) toggleStatus(e, task.id, task.status);
            });
        });
    }

    document.querySelectorAll('.tb-day-col').forEach(col => {
        col.addEventListener('dragover', (e) => {
            e.preventDefault(); 
            col.classList.add('drag-over');
        });
        col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
        col.addEventListener('drop', handleDrop);
    });

    async function handleDrop(e) {
        e.preventDefault();
        e.currentTarget.classList.remove('drag-over');
        
        if (!draggedTaskId) return;

        const targetCol = e.currentTarget;
        const newDay = targetCol.dataset.day;

        const colRect = targetCol.getBoundingClientRect();
        let rawY = e.clientY - colRect.top - dragOffsetY; 
        if (rawY < 0) rawY = 0;

        const snapMins = 30;
        let newStartMins = Math.round(rawY / snapMins) * snapMins;
        
        const task = allSchedules.find(t => t.id === draggedTaskId);
        if (!task) return;
        
        const duration = parseTimeRange(task.time).duration;
        let newEndMins = newStartMins + duration;

        // --- SISTEM DETEKSI BENTROK FRONTEND ---
        const hasCollision = allSchedules.some(t => {
            // Abaikan diri sendiri atau hari yang berbeda
            if (t.id === draggedTaskId || t.hari !== newDay) return false;
            
            const tRange = parseTimeRange(t.time);
            if (!tRange) return false;
            
            const tStart = tRange.startMins;
            const tEnd = tStart + tRange.duration;
            
            // Logika Tabrakan
            return newStartMins < tEnd && newEndMins > tStart;
        });

        if (hasCollision) {
            showToast("Gagal dipindahkan! Jadwal bertabrakan dengan rutinitas lain.", "error");
            searchHandler(); // Revert posisi
            return; // Hentikan proses, jangan panggil API
        }
        // ----------------------------------------

        const formatTime = (mins) => {
            let h = Math.floor(mins / 60) % 24;
            let m = mins % 60;
            return `${h.toString().padStart(2,'0')}.${m.toString().padStart(2,'0')}`;
        };
        const newTimeStr = `${formatTime(newStartMins)} - ${formatTime(newEndMins)}`;

        const oldDay = task.hari;
        const oldTime = task.time;
        
        task.hari = newDay;
        task.time = newTimeStr;

        searchHandler(); // Render UI Instan

        try {
            const response = await fetch(`/api/rutinitas/${task.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    nama_task: task.title, 
                    hari: task.hari, 
                    waktu: task.time, 
                    prioritas: task.priority 
                })
            });
            const res = await response.json();
            if (!res.success) throw new Error();
            showToast("Jadwal diperbarui!", "success");
        } catch (err) {
            task.hari = oldDay;
            task.time = oldTime;
            searchHandler();
            showToast("Gagal memindahkan jadwal.", "error");
        }
    }

    // ==========================================
    // 5. UTILITIES
    // ==========================================
    function updateSummaryCards(tasks) {
        const total = tasks.length;
        const completed = tasks.filter(s => s.status === 'Done' || s.status === 'Completed').length;
        const todo = total - completed;

        if(document.getElementById('sum-total')) document.getElementById('sum-total').textContent = total;
        if(document.getElementById('sum-completed')) document.getElementById('sum-completed').textContent = completed;
        if(document.getElementById('sum-todo')) document.getElementById('sum-todo').textContent = todo;
    }

    window.toggleStatus = async function(e, id, currentStatus) {
        e.stopPropagation();
        let newStatus = (currentStatus === 'Completed' || currentStatus === 'Done') ? 'To Do' : 'Done';
        const scheduleIndex = allSchedules.findIndex(s => s.id === id);
        
        if (scheduleIndex !== -1) {
            const oldStatus = allSchedules[scheduleIndex].status;
            allSchedules[scheduleIndex].status = newStatus;
            searchHandler(); 
            updateSummaryCards(allSchedules);

            try {
                const response = await fetch(`/api/rutinitas/${id}/status`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ status: newStatus })
                });
                const res = await response.json();
                if (!res.success) throw new Error();
            } catch (err) {
                allSchedules[scheduleIndex].status = oldStatus;
                searchHandler();
                updateSummaryCards(allSchedules);
                showToast("Gagal memperbarui status.", "error");
            }
        }
    };

    function attachItemListeners() {
        document.querySelectorAll('.daily-task-row').forEach(row => {
            row.addEventListener('click', () => {
                const data = JSON.parse(row.getAttribute('data-json'));
                if (typeof openScheduleDetail === 'function') openScheduleDetail(data);
            });
        });
    }

    function searchHandler() {
        const query = searchInput ? searchInput.value.trim().toLowerCase() : '';
        let filteredData = allSchedules;
        if (query.length > 0) {
            filteredData = filteredData.filter(sch => (sch.title || "").toLowerCase().includes(query) || (sch.time || "").toLowerCase().includes(query));
        }

        if(currentViewMode === 'list') renderDailyTasks(filteredData);
        else renderTimeBlocks(filteredData);
    }

    if (searchInput) {
        let timeout = null;
        searchInput.addEventListener('input', () => {
            clearTimeout(timeout);
            timeout = setTimeout(() => { searchHandler(); }, 300); 
        });
    }

    const toastContainer = document.getElementById('toast-container');
    function showToast(message, type = 'success') {
        if(!toastContainer) return;
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;
        toastContainer.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => { if (toastContainer.contains(toast)) toastContainer.removeChild(toast); }, 300);
        }, 3000);
    }
    window.showToast = showToast;

    fetchAndRenderTasks();
});