document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 1. ELEMEN UI SELECTIONS
    // ==========================================
    const overlay = document.getElementById('add-schedule-modal-overlay');
    const openBtn = document.getElementById('addScheduleBtn'); // ID tombol pemicu, pastikan ada di luar modal
    const closeBtn = document.getElementById('closeScheduleModalIcon');
    const cancelBtn = document.getElementById('scheduleCancelBtn');
    const confirmBtn = document.getElementById('scheduleConfirmBtn');

    const activityNameInput = document.getElementById('scheduleActivityName');
    const descDetailsInput = document.getElementById('scheduleDescriptionDetails');
    const hariInput = document.getElementById('scheduleHariInput');
    const startTimeInput = document.getElementById('scheduleStartTimeInput');
    const endTimeInput = document.getElementById('scheduleEndTimeInput');
    const priorityHidden = document.getElementById('schedulePriority');
    const addPrioContainer = document.getElementById('addSchPrioritySelector');

    // ==========================================
    // 2. UTILITY MENU DROPDOWN
    // ==========================================
    // Menutup dropdown saat klik di luar area
    document.addEventListener('click', (e) => {
        document.querySelectorAll('.schedule-custom-dropdown').forEach(dropdown => {
            if (!dropdown.contains(e.target)) dropdown.classList.remove('active');
        });
    });

    // Fungsi universal mengatur dropdown custom
    const setupDropdown = (inputId, dropdownId, listId, options) => {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        const list = document.getElementById(listId);
        if (!input || !dropdown || !list) return;

        const renderList = (filterText = "") => {
            list.innerHTML = ""; // Bersihkan list
            const filtered = options.filter(o => o.toLowerCase().includes(filterText.toLowerCase()));

            filtered.forEach(opt => {
                const item = document.createElement('div');
                item.className = 'schedule-dropdown-item';
                item.textContent = opt;
                item.onclick = (e) => {
                    e.stopPropagation();
                    input.value = opt;
                    dropdown.classList.remove('active');
                };
                list.appendChild(item);
            });
        };

        input.addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.schedule-custom-dropdown').forEach(d => {
                if (d.id !== dropdownId) d.classList.remove('active');
            });
            dropdown.classList.toggle('active');
            renderList("");
        });

        renderList();
    };

    // ==========================================
    // 3. INISIALISASI DATA DROPDOWN
    // ==========================================
    // Hari (Senin - Minggu)
    const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    setupDropdown('scheduleHariInput', 'scheduleHariDropdown', 'scheduleHariList', days);

    // Titik Waktu (per 30 menit) untuk Start & End
    const timeNodes = [];
    for (let h = 0; h < 24; h++) {
        const h_str = h.toString().padStart(2, '0');
        timeNodes.push(`${h_str}:00`);
        timeNodes.push(`${h_str}:30`);
    }
    
    setupDropdown('scheduleStartTimeInput', 'scheduleStartTimeDropdown', 'scheduleStartTimeList', timeNodes);
    setupDropdown('scheduleEndTimeInput', 'scheduleEndTimeDropdown', 'scheduleEndTimeList', timeNodes);

    // ==========================================
    // 4. PENGATURAN PRIORITY
    // ==========================================
    if (addPrioContainer) {
        addPrioContainer.querySelectorAll('.priority-option').forEach(opt => {
            opt.addEventListener('click', () => {
                addPrioContainer.querySelectorAll('.priority-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                if (priorityHidden) priorityHidden.value = opt.dataset.value;
            });
        });
    }

    // ==========================================
    // 5. SUBMIT DATA KE BACKEND
    // ==========================================
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            // Validasi Input Kosong
            if (!activityNameInput.value || !hariInput.value || !startTimeInput.value || !endTimeInput.value) {
                alert('Activity Name, Hari, Start Time, and End Time are required.');
                return;
            }

            // Validasi Waktu (Start tidak boleh sama dengan End)
            if(startTimeInput.value === endTimeInput.value) {
                alert('Start time and End time cannot be the same.');
                return;
            }
            
            // Gabungkan waktu untuk parameter backend
            const combinedTime = `${startTimeInput.value} - ${endTimeInput.value}`;

            try {
                // Fetch request ke Endpoint Rutinitas
                const response = await fetch('/rutinitas', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        nama_task: activityNameInput.value.trim(),
                        hari: hariInput.value.trim(),
                        waktu: combinedTime,
                        prioritas: priorityHidden.value
                    })
                });
                
                const result = await response.json();
                if (result.success) {
                    alert("Rutinitas berhasil ditambahkan!");
                    closeModal();
                    location.reload(); // Refresh untuk melihat rutinitas terbaru
                } else {
                    // Pesan apabila terjadi bentrok
                    alert(result.message || 'Jadwal bertabrakan atau terjadi kesalahan');
                }
            } catch (error) {
                console.error("Fetch error:", error);
                alert("Kesalahan saat menghubungi server.");
            }
        });
    }
    
    // ==========================================
    // 6. FUNGSI MEMBERSIHKAN & MENUTUP MODAL
    // ==========================================
    const clearForm = () => {
        if (activityNameInput) activityNameInput.value = '';
        if (descDetailsInput) descDetailsInput.value = '';
        if (hariInput) hariInput.value = '';
        if (startTimeInput) startTimeInput.value = '';
        if (endTimeInput) endTimeInput.value = '';
        if (priorityHidden) priorityHidden.value = 'None';
        
        if (addPrioContainer) {
            addPrioContainer.querySelectorAll('.priority-option').forEach(opt => opt.classList.remove('active'));
            addPrioContainer.querySelector('.priority-option.none')?.classList.add('active');
        }
    };

    const closeModal = () => {
        if(overlay) overlay.style.display = 'none';
        clearForm();
    };

    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    if (cancelBtn) cancelBtn.addEventListener('click', closeModal);
    
    // Trigger tombol buka modal (jika di-set HTML luarnya)
    if (openBtn) {
        openBtn.addEventListener('click', () => {
            if (overlay) overlay.style.display = 'flex';
        });
    }
});