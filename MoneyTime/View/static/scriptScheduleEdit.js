document.addEventListener('DOMContentLoaded', () => {
    // ============================================
    // 1. ELEMEN UTAMA & VARIABEL
    // ============================================
    // Kita panggil overlay terluar (yang ada di time.html)
    const editOverlay = document.getElementById('edit-schedule-modal-overlay');
    const closeBtn = document.getElementById('closeEditSchModalIcon');
    const cancelBtn = document.getElementById('editSchCancelBtn');
    const confirmBtn = document.getElementById('editSchConfirmBtn');

    // Inputs Form
    const titleInput = document.getElementById('editSchTitle');
    const hariInput = document.getElementById('editSchHariInput');
    const startTimeInput = document.getElementById('editSchStartTimeInput');
    const endTimeInput = document.getElementById('editSchEndTimeInput');
    const priorityHidden = document.getElementById('editSchPriority');
    const descriptionInput = document.getElementById('editSchDescription');

    const priorityOptions = document.querySelectorAll('#editSchPrioritySelector .priority-option');

    let initialEditData = {};

    // ============================================
    // 2. GENERATE OPTIONS DROPDOWN
    // ============================================
    const hariOptions = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu'];
    const timeOptions = [];
    for(let h = 0; h < 24; h++) {
        for(let m = 0; m < 60; m += 30) {
            timeOptions.push(`${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`);
        }
    }

    function setupDropdown(inputId, dropdownId, listId, options) {
        const input = document.getElementById(inputId);
        const dropdown = document.getElementById(dropdownId);
        const list = document.getElementById(listId);
        
        if(!input || !dropdown || !list) return;

        list.innerHTML = '';
        options.forEach(opt => {
            const item = document.createElement('div');
            item.className = 'schedule-dropdown-item';
            item.textContent = opt;
            
            // Styling standar
            item.style.padding = '10px 16px';
            item.style.cursor = 'pointer';
            item.style.color = '#333';
            item.style.transition = 'background 0.2s';
            
            // Event Click Item
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                input.value = opt;
                dropdown.classList.remove('active');
            });

            // Hover effects
            item.addEventListener('mouseenter', () => item.style.backgroundColor = '#f2f2f2');
            item.addEventListener('mouseleave', () => item.style.backgroundColor = 'transparent');
            
            list.appendChild(item);
        });

        // Event Toggle Dropdown
        input.parentElement.addEventListener('click', (e) => {
            e.stopPropagation();
            // Tutup dropdown lain yang sedang terbuka
            document.querySelectorAll('#edit-schedule-modal-overlay .schedule-custom-dropdown').forEach(d => {
                if(d !== dropdown) d.classList.remove('active');
            });
            dropdown.classList.toggle('active');
        });
    }

    // Inisialisasi Dropdowns
    setupDropdown('editSchHariInput', 'editSchHariDropdown', 'editSchHariList', hariOptions);
    setupDropdown('editSchStartTimeInput', 'editSchStartTimeDropdown', 'editSchStartTimeList', timeOptions);
    setupDropdown('editSchEndTimeInput', 'editSchEndTimeDropdown', 'editSchEndTimeList', timeOptions);

    // Menutup dropdown jika user klik di luar area
    document.addEventListener('click', () => {
        document.querySelectorAll('#edit-schedule-modal-overlay .schedule-custom-dropdown').forEach(d => {
            d.classList.remove('active');
        });
    });

    // ============================================
    // 3. PRIORITY SELECTOR LISTENER
    // ============================================
    priorityOptions.forEach(opt => {
        opt.addEventListener('click', () => {
            priorityOptions.forEach(o => o.classList.remove('active'));
            opt.classList.add('active');
            priorityHidden.value = opt.dataset.value;
        });
    });

    // ============================================
    // 4. FUNGSI BUKA MODAL (GLOBAL)
    // ============================================
    window.openEditScheduleModal = function(data) {
        if(!editOverlay) {
            console.error("Overlay Edit Modal (#edit-schedule-modal-overlay) tidak ditemukan di HTML!");
            return;
        }

        if(!data) {
            if (typeof showToast === 'function') showToast("Data jadwal gagal dimuat.", "error");
            return;
        }

        // 1. Set Teks Input
        titleInput.value = data.title || data.nama_task || "";
        hariInput.value = data.hari || "";
        descriptionInput.value = data.description || "";
        
        // 2. Parsing Format Waktu ("10:00 - 11:30")
        let timeStr = data.time || data.waktu || "";
        if (timeStr && timeStr.includes('-')) {
            const parts = timeStr.split('-');
            startTimeInput.value = parts[0].trim();
            endTimeInput.value = parts[1].trim();
        } else {
            startTimeInput.value = "00:00";
            endTimeInput.value = "00:30";
        }

        // 3. Set Priority Button
        priorityOptions.forEach(o => o.classList.remove('active'));
        const targetPrio = (data.priority || data.prioritas || 'None').toLowerCase();
        const match = document.querySelector(`#editSchPrioritySelector .priority-option.${targetPrio}`);
        
        if (match) {
            match.classList.add('active');
            priorityHidden.value = match.dataset.value;
        } else {
            priorityHidden.value = 'None';
            document.querySelector('#editSchPrioritySelector .priority-option.none')?.classList.add('active');
        }

        // 4. Capture Data Awal (Untuk Sistem Discard)
        initialEditData = {
            title: titleInput.value,
            hari: hariInput.value,
            startTime: startTimeInput.value,
            endTime: endTimeInput.value,
            prio: priorityHidden.value,
            desc: descriptionInput.value
        };

        // Tutup Modal Detail jika sedang terbuka
        const detailOverlay = document.getElementById('schedule-detail-modal-overlay');
        if (detailOverlay) detailOverlay.style.display = 'none';
        
        // Tampilkan Modal Edit
        editOverlay.style.display = 'flex';
    };

    // ============================================
    // 5. EVENT DELEGATION
    // ============================================
    document.body.addEventListener('click', function(e) {
        const editBtn = e.target.closest('#schDetailEditBtn');
        if (editBtn) {
            if (window.currentScheduleDetail) {
                window.openEditScheduleModal(window.currentScheduleDetail);
            } else {
                console.warn("Variabel window.currentScheduleDetail belum berisi data!");
            }
        }
    });

    // ============================================
    // 6. SUBMIT DATA KE BACKEND
    // ============================================
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async () => {
            const title = titleInput.value.trim();
            const hari = hariInput.value.trim();
            const start = startTimeInput.value.trim();
            const end = endTimeInput.value.trim();
            const priority = priorityHidden.value;
            
            if (!title || !hari || !start || !end) {
                if (typeof showToast === 'function') showToast("Mohon lengkapi seluruh form.", "error");
                else alert("Mohon lengkapi seluruh form.");
                return;
            }

            if (!window.currentScheduleDetail || !window.currentScheduleDetail.id) return;
            
            const waktu = `${start} - ${end}`;
            
            try {
                const payload = {
                    nama_task: title,
                    hari: hari,
                    waktu: waktu,
                    prioritas: priority
                };

                const response = await fetch(`/rutinitas/${window.currentScheduleDetail.id}`, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });

                const result = await response.json();
                
                if (result.success) {
                    if (typeof showToast === 'function') showToast(result.message || "Berhasil diedit", "success");
                    closeModal();
                    
                    // Refresh data UI
                    if (typeof window.fetchRutinitas === 'function') window.fetchRutinitas();
                    else location.reload();
                } else {
                    if (typeof showToast === 'function') showToast("Gagal: " + result.message, "error");
                    else alert("Gagal: " + result.message);
                }
            } catch (error) { 
                console.error(error); 
                if (typeof showToast === 'function') showToast("Terjadi kesalahan koneksi.", "error");
            }
        });
    }

    // ============================================
    // 7. SISTEM DISCARD ALERT & CLOSE
    // ============================================
    function isEditDirty() {
        return (
            titleInput.value !== initialEditData.title ||
            hariInput.value !== initialEditData.hari ||
            startTimeInput.value !== initialEditData.startTime ||
            endTimeInput.value !== initialEditData.endTime ||
            priorityHidden.value !== initialEditData.prio ||
            descriptionInput.value !== initialEditData.desc
        );
    }

    function closeModal() { 
        if (editOverlay) editOverlay.style.display = 'none'; 
    }
    
    function handleCloseAttempt() { 
        if (isEditDirty()) {
            const discardModal = document.getElementById('discard-modal-overlay');
            if (discardModal) {
                discardModal.style.display = 'flex';
                const modalContent = discardModal.querySelector('.modal');
                if (modalContent) setTimeout(() => modalContent.classList.add('show'), 10);
                
                const noBtn = document.getElementById('discardNoBtn');
                const yesBtn = document.getElementById('discardYesBtn');
                
                const newNo = noBtn.cloneNode(true);
                const newYes = yesBtn.cloneNode(true);
                noBtn.parentNode.replaceChild(newNo, noBtn);
                yesBtn.parentNode.replaceChild(newYes, yesBtn);

                newNo.onclick = () => { 
                    if (modalContent) modalContent.classList.remove('show'); 
                    setTimeout(() => discardModal.style.display = 'none', 300); 
                };
                
                newYes.onclick = () => { 
                    if (modalContent) modalContent.classList.remove('show'); 
                    setTimeout(() => { discardModal.style.display = 'none'; closeModal(); }, 300); 
                };
            } else {
                closeModal();
            }
        } else {
            closeModal(); 
        }
    }

    if (closeBtn) closeBtn.addEventListener('click', handleCloseAttempt);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCloseAttempt);
});