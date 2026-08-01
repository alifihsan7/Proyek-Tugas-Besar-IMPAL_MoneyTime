document.addEventListener('DOMContentLoaded', () => {
    // --- Elements ---
    const detailOverlay = document.getElementById('schedule-detail-modal-overlay');
    const closeBtn = document.getElementById('closeSchDetailModalIcon');
    const deleteBtn = document.getElementById('schDetailDeleteBtn');

    // --- CLOSE DETAIL ---
    function closeDetail() {
        if (detailOverlay) detailOverlay.style.display = 'none';
    }
    if (closeBtn) closeBtn.addEventListener('click', closeDetail);
    if (detailOverlay) {
        detailOverlay.addEventListener('click', (e) => {
            if (e.target === detailOverlay) closeDetail();
        });
    }

    // --- DELETE LOGIC ---
    if (deleteBtn) {
        deleteBtn.addEventListener('click', async () => {
            const schId = window.currentScheduleDetail ? window.currentScheduleDetail.id : null;
            if(!schId) return;

            // Memunculkan popup konfirmasi bawaan browser
            const isConfirmed = confirm("Apakah Anda yakin ingin menghapus rutinitas ini?");
            if (!isConfirmed) return; // Batalkan jika user memilih "No/Cancel"

            try {
                // Eksekusi API Delete
                const response = await fetch(`/rutinitas/${schId}`, {
                    method: 'DELETE',
                    headers: {'Content-Type': 'application/json'}
                });

                const res = await response.json();
                if (res.success) {
                    if (typeof showToast === 'function') showToast("Rutinitas berhasil dihapus", "success");
                    closeDetail(); // Tutup modal detail
                    
                    // Refresh data di kalender secara otomatis
                    if (typeof window.fetchSchedules === 'function') window.fetchSchedules();
                } else {
                    if (typeof showToast === 'function') showToast("Gagal menghapus rutinitas", "error");
                    else alert("Gagal menghapus rutinitas");
                }
            } catch(e) { 
                console.error(e); 
                alert("Terjadi kesalahan pada server saat menghapus.");
            }
        });
    }
});

// --- GLOBAL FUNCTION UTAMA ---
function openScheduleDetail(data) {
    const detailOverlay = document.getElementById('schedule-detail-modal-overlay');
    if (!detailOverlay) return;

    window.currentScheduleDetail = data;

    // Populate Fields
    const titleEl = document.getElementById('schDetailTitle'); 
    const descEl = document.getElementById('schDetailDescription'); 
    const hariEl = document.getElementById('schDetailHari');
    const startEl = document.getElementById('schDetailStartTime');
    const endEl = document.getElementById('schDetailEndTime');
    
    if(titleEl) titleEl.value = data.title || '-'; 
    if(descEl) descEl.value = data.description || ''; 
    if(hariEl) hariEl.value = data.hari || '-';

    // Memecah "04:00 - 05:00" menjadi Start & End Time
    if (data.time && data.time.includes('-')) {
        const timeParts = data.time.split('-');
        if(startEl) startEl.value = timeParts[0].trim();
        if(endEl) endEl.value = timeParts[1].trim();
    } else {
        if(startEl) startEl.value = data.time || '-';
        if(endEl) endEl.value = '-';
    }

    // Priority Styling
    const prioContainer = document.getElementById('schDetailPriorityContainer');
    if(prioContainer) {
        const options = prioContainer.querySelectorAll('.priority-option');
        options.forEach(opt => opt.classList.remove('active'));

        const targetPrio = (data.priority || 'None').toLowerCase();
        const matchingOption = prioContainer.querySelector(`.priority-option.${targetPrio}`);
        if (matchingOption) matchingOption.classList.add('active');
    }
    
    // Tampilkan tombol Edit
    const editBtn = document.getElementById('schDetailEditBtn');
    if (editBtn) {
        editBtn.style.display = 'flex'; 
    }

    detailOverlay.style.display = 'flex';
}