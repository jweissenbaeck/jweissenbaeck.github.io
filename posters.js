window.addEventListener('DOMContentLoaded', function() {
    const loader = document.getElementById('loader');
    const grid = document.getElementById('postersGrid');
    const images = document.querySelectorAll('.poster-item img');
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
        }, 1500); // 1.5 seconds
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

// Modal functionality
document.querySelectorAll('.poster-item').forEach(item => {
    item.addEventListener('click', function() {
        document.getElementById('modalImg').src = this.dataset.img;
        document.getElementById('modalImg').alt = this.dataset.title;
        document.getElementById('modalTitle').textContent = this.dataset.title;
        document.getElementById('modalDesc').textContent = this.dataset.desc;
        const modal = document.getElementById('posterModal');
        modal.style.display = 'flex';
        setTimeout(() => modal.classList.add('show'), 10);
        document.body.style.overflow = 'hidden';
    });
});

document.getElementById('modalClose').onclick = function() {
    const modal = document.getElementById('posterModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
        document.body.style.overflow = '';
    }, 400);
};

document.getElementById('posterModal').onclick = function(e) {
    if (e.target === this) {
        this.classList.remove('show');
        setTimeout(() => {
            this.style.display = 'none';
            document.body.style.overflow = '';
        }, 400);
    }
};

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