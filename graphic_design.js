window.addEventListener('DOMContentLoaded', function() {
    const loader = document.getElementById('loader');
    const grid = document.getElementById('graphic_designGrid');
    const images = document.querySelectorAll('.graphic_design-item img');
    let loaded = 0;
    if (images.length === 0) {
        if (loader) loader.style.display = 'none';
        if (grid) grid.style.display = '';
        return;
    }
    function hideLoader() {
        setTimeout(() => {
            if (loader) loader.style.display = 'none';
            if (grid) grid.style.display = '';
        }, 1500); // 1.5 Sekunden
    }
    images.forEach(img => {
        if (img.complete) {
            loaded++;
            if (loaded === images.length) hideLoader();
        } else {
            img.addEventListener('load', () => {
                loaded++;
                if (loaded === images.length) hideLoader();
            });
            img.addEventListener('error', () => {
                loaded++;
                if (loaded === images.length) hideLoader();
            });
        }
    });
});

// Modal-Funktionalität
document.querySelectorAll('.graphic_design-item').forEach(item => {
    item.addEventListener('click', function() {
        const modal = document.getElementById('graphic_designModal');
        const img = document.getElementById('modalImg');

        img.src = this.dataset.img;
        img.alt = this.dataset.title;

        document.getElementById('modalTitle').textContent = this.dataset.title;
        document.getElementById('modalDesc').textContent = this.dataset.desc;

        // Modal sofort anzeigen
        modal.style.display = 'flex';
        modal.style.opacity = '1'; // sofort sichtbar
        document.body.style.overflow = 'hidden';
    });
});

// Modal schließen
function closeModal(modal) {
    modal.style.display = 'none';
    modal.style.opacity = '0';
    document.body.style.overflow = '';
}

document.getElementById('modalClose').onclick = function() {
    closeModal(document.getElementById('graphic_designModal'));
};

document.getElementById('graphic_designModal').onclick = function(e) {
    if (e.target === this) {
        closeModal(this);
    }
};

// Vollbild-Button
document.getElementById('fullscreenBtn').onclick = function(e) {
    e.stopPropagation();
    const img = document.getElementById('modalImg');
    if (img.requestFullscreen) {
        img.requestFullscreen();
    } else if (img.webkitRequestFullscreen) {
        img.webkitRequestFullscreen();
    } else if (img.msRequestFullscreen) {
        img.msRequestFullscreen();
    }
};